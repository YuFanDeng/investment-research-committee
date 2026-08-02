import type { AssistantConversationMessage } from './schemas.js';

export const MAX_HISTORY_MESSAGE_CHARACTERS = 2_000;
export const MAX_HISTORY_TOTAL_CHARACTERS = 4_000;

function compactMessageContent(content: string, maximumCharacters: number) {
  if (content.length <= maximumCharacters) return content;
  if (maximumCharacters < 5) return content.slice(0, maximumCharacters);

  const divider = '\n…\n';
  const availableCharacters = maximumCharacters - divider.length;
  const beginningLength = Math.ceil(availableCharacters * 0.7);
  const endingLength = availableCharacters - beginningLength;
  return `${content.slice(0, beginningLength)}${divider}${content.slice(-endingLength)}`;
}

export function compactConversationHistory(history: AssistantConversationMessage[]) {
  const compactedHistory: AssistantConversationMessage[] = [];
  let remainingCharacters = MAX_HISTORY_TOTAL_CHARACTERS;

  // Work backward so the most recent conversational context survives when the total budget fills.
  for (const message of [...history].reverse()) {
    if (remainingCharacters === 0) break;
    const messageBudget = Math.min(MAX_HISTORY_MESSAGE_CHARACTERS, remainingCharacters);
    const content = compactMessageContent(message.content, messageBudget);
    compactedHistory.unshift({ ...message, content });
    remainingCharacters -= content.length;
  }

  return compactedHistory;
}
