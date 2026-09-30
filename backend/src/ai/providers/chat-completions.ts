import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { AiChatMessage } from './ai.provider';

export interface ChatCompletionRequest {
  /** Human-readable vendor name used in logs, e.g. "Grok". */
  label: string;
  logger: Logger;
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Extra vendor headers (e.g. OpenRouter attribution). */
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 60_000;

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

/**
 * Shared call to an OpenAI-compatible `/chat/completions` endpoint (xAI Grok, OpenAI,
 * OpenRouter, …). The API key stays on the server; failures become clear 503s and are
 * logged with the vendor status so an administrator can tell a bad key from an outage.
 */
export async function requestChatCompletion(req: ChatCompletionRequest): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${req.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${req.apiKey}`, ...(req.headers ?? {}) },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 900,
      }),
    });
    if (!res.ok) {
      const detail = await errorDetail(res);
      req.logger.warn(`${req.label} responded ${res.status}${detail ? `: ${detail}` : ''}`);
      if (res.status === 401 || res.status === 403) {
        throw new ServiceUnavailableException(`The ${req.label} API key configured on the server was rejected. Ask an administrator to check it.`);
      }
      if (res.status === 429) {
        throw new ServiceUnavailableException(`${req.label} is rate limiting requests right now. Please try again in a moment.`);
      }
      if (res.status === 404 || (res.status === 400 && /model/i.test(detail))) {
        throw new ServiceUnavailableException(`The model "${req.model}" is not available to ${req.label}. Ask an administrator to check AI_MODEL on the server.`);
      }
      throw new ServiceUnavailableException(`The ${req.label} service is temporarily unavailable. Please try again in a moment.`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: unknown }; text?: unknown; finish_reason?: string }[] };
    const choice = json.choices?.[0];
    const text = choice?.message?.content ?? choice?.text;
    if (!text) {
      req.logger.warn(`${req.label} returned an empty answer (finish_reason: ${choice?.finish_reason ?? 'unknown'})`);
      throw new ServiceUnavailableException('The AI service returned an empty answer. Please try again.');
    }
    return String(text).trim();
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
