import { z } from 'zod';

export const AssistantConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2_000),
});

export const ResearchAssistantRequestSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z.]{1,10}$/, 'Enter a valid U.S. ticker.'),
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
