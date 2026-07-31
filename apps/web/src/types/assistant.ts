import type { SecDataMode, Source } from './research';

export type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

export type AssistantToolActivity = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'complete';
};

export type AssistantEvent =
  | { type: 'assistant.started'; runId: string; ticker: string }
  | {
      type: 'tool.requested';
      id: string;
      name: string;
      args: Record<string, unknown>;
    }
  | { type: 'tool.completed'; id: string; name: string }
  | { type: 'answer.completed'; answer: string; sources: Source[] }
  | { type: 'assistant.failed'; message: string };

export type AssistantRequest = {
  ticker: string;
  question: string;
  secDataMode: SecDataMode;
  history: Array<Pick<AssistantMessage, 'role' | 'content'>>;
};
