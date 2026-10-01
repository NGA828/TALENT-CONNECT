import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiChatMessage } from './ai.provider';

export interface ChatCompletionRequest {
  /** Human-readable vendor name used in logs, e.g. "Grok". */
  label: string;
  logger: Logger;
  baseUrl: string;
  apiKey: string;
  model: string;
  /**
   * Model tried once when the configured one is unknown to the vendor (404 / "model not found"),
   * which is what a retired model looks like. Normally the vendor's current default.
   */
  fallbackModel?: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /**
   * Send `reasoning_format: "hidden"` — Groq's own parameter, which keeps a reasoning model's
   * chain of thought out of the reply. Off by default: xAI and OpenAI do not know it.
   */
  hideReasoning?: boolean;
  /** Extra vendor headers (e.g. OpenRouter attribution). */
  headers?: Record<string, string>;
  /**
   * Called when a different model than the configured one actually answered, so the provider can
   * report the truth in `/ai/status` instead of advertising a model the vendor no longer serves.
   */
  onModelUsed?: (model: string) => void;
}

const DEFAULT_TIMEOUT_MS = 60_000;
/** Ceiling for a single completion, so a retry can never run away with the token bill. */
const ABSOLUTE_MAX_TOKENS = 8_192;

/**
 * Reasoning models spend part of the completion budget thinking before they answer, and Groq
 * returns that thinking inside the text unless `reasoning_format` says otherwise. Both facts
 * change the request, so they are detected from the model id.
 */
export function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return /gpt-oss|(^|[^a-z])o[1-9](mini|-|$)|gpt-[5-9]|grok-4|qwen3|r1|deepseek/.test(m);
}

/**
 * Visible-answer budget plus room to think. `AI_MAX_TOKENS` keeps meaning "how long an answer
 * may be"; on a reasoning model the same number is also consumed by hidden reasoning tokens, so
 * asking for 1024 answer tokens with a 1024 cap can come back empty.
 */
export function completionBudget(maxTokens: number, reasoning: boolean): number {
  return Math.min(reasoning ? maxTokens * 4 : maxTokens, ABSOLUTE_MAX_TOKENS);
}

/**
 * The JSON body sent to `/chat/completions`. `max_tokens` (not `max_completion_tokens`) stays the
 * parameter name because it is the one every OpenAI-compatible endpoint in use still accepts.
 */
export function buildChatCompletionBody(
  model: string,
  messages: AiChatMessage[],
  temperature: number,
  maxTokens: number,
  hideReasoning = false,
): Record<string, unknown> {
  const reasoning = isReasoningModel(model);
  const body: Record<string, unknown> = { model, messages, temperature, max_tokens: completionBudget(maxTokens, reasoning) };
  if (reasoning) {
    // Cheapest effort level: drafting a bio or a message does not need deep reasoning, and on
    // Groq the reasoning tokens are drawn from the same budget as the answer itself.
    body.reasoning_effort = 'low';
    // Groq inlines a reasoning model's chain of thought unless told otherwise; xAI and OpenAI
    // do not know this parameter, so it is opt-in per provider.
    if (hideReasoning) body.reasoning_format = 'hidden';
  }
  return body;
}

/**
 * Defensive cleanup: an endpoint that ignores `reasoning_format` (or a proxy that strips it) would
 * otherwise show a talent its model's private chain of thought. Never let `<think>` reach the UI.
 */
export function stripReasoning(text: string): string {
  return text
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?>/gi, ' ')
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pulls a short reason out of an error body so operators can see *why* a provider refused. */
async function errorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      const message = typeof json.error === 'string' ? json.error : json.error?.message ?? json.message;
      return String(message ?? text).slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return '';
  }
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown }; text?: unknown; finish_reason?: string }[];
}

/** One POST to the vendor. Returns either the parsed body or the failure, never throws on HTTP errors. */
async function postChatCompletion(
  req: ChatCompletionRequest,
  model: string,
  maxTokens: number,
  controller: AbortController,
): Promise<{ ok: true; json: ChatCompletionResponse } | { ok: false; status: number; detail: string }> {
  const res = await fetch(`${req.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${req.apiKey}`, ...(req.headers ?? {}) },
    body: JSON.stringify(buildChatCompletionBody(model, req.messages, req.temperature ?? 0.7, maxTokens, req.hideReasoning)),
  });
  if (!res.ok) return { ok: false, status: res.status, detail: await errorDetail(res) };
  return { ok: true, json: (await res.json()) as ChatCompletionResponse };
}

/** A 404 (or a 400 naming the model) means the vendor does not serve that model id — usually retired. */
function isUnknownModelError(status: number, detail: string): boolean {
  return status === 404 || (status === 400 && /model/i.test(detail));
}

/**
 * Shared call to an OpenAI-compatible `/chat/completions` endpoint (Groq, xAI Grok, OpenAI,
 * OpenRouter, …). The API key stays on the server; failures become clear 503s and are
 * logged with the vendor status so an administrator can tell a bad key from an outage.
 *
 * Two automatic recoveries keep a vendor's model churn from breaking the assistant:
 * an unknown/retired model is retried once on `fallbackModel`, and a reasoning model that spent
 * its whole budget thinking is retried once with a larger one.
 */
export async function requestChatCompletion(req: ChatCompletionRequest): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const attempts: { model: string; maxTokens: number }[] = [{ model: req.model, maxTokens: req.maxTokens ?? 900 }];
    const fallback = req.fallbackModel?.trim();
    if (fallback && fallback !== req.model) attempts.push({ model: fallback, maxTokens: req.maxTokens ?? 900 });
    // Last resort for reasoning models only: the same model with the biggest budget we allow.
    if (isReasoningModel(req.model)) {
      attempts.push({ model: req.model, maxTokens: Math.max(completionBudget(req.maxTokens ?? 900, true) * 2, 4_096) });
    }

    for (let i = 0; i < attempts.length; i += 1) {
      const attempt = attempts[i];
      const isLast = i === attempts.length - 1;
      const res = await postChatCompletion(req, attempt.model, Math.min(attempt.maxTokens, ABSOLUTE_MAX_TOKENS), controller);

      if (!res.ok) {
        req.logger.warn(`${req.label} responded ${res.status} for model ${attempt.model}${res.detail ? `: ${res.detail}` : ''}`);
        if (isUnknownModelError(res.status, res.detail) && !isLast && attempts[i + 1].model !== attempt.model) {
          req.logger.warn(
            `${req.label} does not serve "${attempt.model}" — retrying with "${attempts[i + 1].model}". Set the model variable for ${req.label} on the server (GROQ_MODEL / XAI_MODEL / AI_MODEL) to a current id to skip this retry.`,
          );
          continue;
        }
        if (res.status === 401 || res.status === 403) {
          throw new ServiceUnavailableException(`The ${req.label} API key configured on the server was rejected. Ask an administrator to check it.`);
        }
        if (res.status === 429) {
          throw new ServiceUnavailableException(`${req.label} is rate limiting requests right now. Please try again in a moment.`);
        }
        if (isUnknownModelError(res.status, res.detail)) {
          throw new ServiceUnavailableException(
            `The model "${attempt.model}" is not available to ${req.label} (vendors retire models). Ask an administrator to set GROQ_MODEL / XAI_MODEL / AI_MODEL on the server to a current model.`,
          );
        }
        throw new ServiceUnavailableException(`The ${req.label} service is temporarily unavailable. Please try again in a moment.`);
      }

      const choice = res.json.choices?.[0];
      const text = stripReasoning(String(choice?.message?.content ?? choice?.text ?? ''));
      if (text) {
        if (attempt.model !== req.model) {
          req.logger.log(`${req.label} answered with the fallback model ${attempt.model}.`);
          req.onModelUsed?.(attempt.model);
        }
        return text;
      }

      // Empty answer: on a reasoning model this almost always means the budget ran out mid-thought.
      req.logger.warn(
        `${req.label} (${attempt.model}) returned an empty answer (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
      );
      if (!isLast && choice?.finish_reason === 'length') {
        req.logger.warn(`${req.label} hit the token limit before answering — retrying with a larger budget.`);
        continue;
      }
      throw new ServiceUnavailableException('The AI service returned an empty answer. Please try again.');
    }

    throw new ServiceUnavailableException('The AI service returned an empty answer. Please try again.');
  } catch (e) {
    if (e instanceof ServiceUnavailableException) throw e;
    const error = e as Error;
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      req.logger.warn(`${req.label} request timed out after ${req.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
      throw new ServiceUnavailableException('The AI service took too long to answer. Please try again.');
    }
    req.logger.warn(`${req.label} request failed: ${error.message}`);
    throw new ServiceUnavailableException('The AI service could not be reached. Please try again in a moment.');
  } finally {
    clearTimeout(timer);
  }
}
