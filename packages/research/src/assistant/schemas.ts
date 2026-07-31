import { z } from 'zod';

export const AssistantConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2_000),
});

export const AssistantTickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z.]{1,10}$/, 'Use a valid U.S. ticker.');

export const ResearchAssistantRequestSchema = z.object({
  question: z.string().trim().min(1).max(1_000),
  secDataMode: z.enum(['live', 'fixture']).default('live'),
  history: z.array(AssistantConversationMessageSchema).max(6).default([]),
});

export type AssistantConversationMessage = z.infer<typeof AssistantConversationMessageSchema>;
export type ResearchAssistantRequest = z.infer<typeof ResearchAssistantRequestSchema>;

export type ResearchToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};
