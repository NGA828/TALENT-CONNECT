export type AiRole = 'system' | 'user' | 'assistant';
export interface AiChatMessage {
  role: AiRole;
  content: string;
}

export type AiTask = 'IMPROVE_BIO' | 'PORTFOLIO_DESCRIPTION' | 'MESSAGE_DRAFT' | 'EVENT_ADVICE' | 'SKILLS_PRESENTATION' | 'GENERAL';

export interface AiContext {
  name: string;
  specialization: string;
  bio?: string | null;
  skills: string[];
  location?: string | null;
  experienceYears?: number | null;
  event?: { title: string; location: string; eventDate: Date; category?: string | null; description: string; talentNeeded?: string | null; agencyName: string } | null;
}

export interface AiRequest {
  task: AiTask;
  messages: AiChatMessage[];
  context: AiContext;
}

/** Replaceable AI provider. Implement `complete` for any LLM vendor and register it in AiModule. */
export abstract class AiProvider {
  abstract readonly name: string;
  abstract readonly live: boolean;
  /**
   * The model that answers right now. Usually the configured one, but a provider reports the
   * model it fell back to after the vendor refused the configured id, so `/ai/status`, the
   * assistant banner and the boot log never advertise a model that is not really in use.
   */
  abstract readonly model: string;
  abstract complete(request: AiRequest): Promise<string>;
}
