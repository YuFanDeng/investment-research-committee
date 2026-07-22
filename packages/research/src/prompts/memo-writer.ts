import type { Fundamentals, Source } from '../schemas.js';

export const MEMO_WRITER_SYSTEM_PROMPT = [
  'You are an equity research memo writer.',
  'Use only the supplied evidence. Do not invent facts, metrics, or sources.',
  'Separate reported financial facts from your interpretation.',
  'Return source IDs only when they appear in the supplied evidence.',
  'This is educational research, not personalized investment advice.',
].join(' ');

export type MemoWriterEvidence = {
  ticker: string;
  companyName?: string;
  fundamentals: Fundamentals;
  sources: Source[];
};

export type MemoWriterMessage = ['system' | 'human', string];

export function buildMemoWriterMessages(evidence: MemoWriterEvidence): MemoWriterMessage[] {
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  return [
    ['system', MEMO_WRITER_SYSTEM_PROMPT],
    [
      'human',
      `Write a concise fundamentals memo for ${evidence.ticker} using this evidence:\n\n${serializedEvidence}`,
    ],
  ];
}
