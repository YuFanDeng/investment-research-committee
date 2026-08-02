import { describe, expect, it } from 'vitest';

import {
  compactConversationHistory,
  MAX_HISTORY_MESSAGE_CHARACTERS,
  MAX_HISTORY_TOTAL_CHARACTERS,
} from './history.js';

describe('assistant conversation history', () => {
  it('keeps short history unchanged', () => {
    const history = [
      { role: 'user' as const, content: 'How is Apple doing?' },
      { role: 'assistant' as const, content: 'Apple resolved to AAPL.' },
    ];

    expect(compactConversationHistory(history)).toEqual(history);
  });

  it('compacts long model answers while preserving their beginning and conclusion', () => {
    const longAnswer = `Apple resolved to AAPL. ${'evidence '.repeat(400)}Final limitation.`;
    const [message] = compactConversationHistory([{ role: 'assistant', content: longAnswer }]);

    expect(message.content).toHaveLength(MAX_HISTORY_MESSAGE_CHARACTERS);
    expect(message.content).toContain('Apple resolved to AAPL.');
    expect(message.content).toContain('Final limitation.');
    expect(message.content).toContain('…');
  });

  it('prioritizes recent messages within the total history budget', () => {
    const history = Array.from({ length: 6 }, (_, index) => ({
      role: index % 2 ? ('assistant' as const) : ('user' as const),
      content: `${index}: ${'context '.repeat(500)}`,
    }));
    const compacted = compactConversationHistory(history);

    expect(
      compacted.reduce((total, message) => total + message.content.length, 0),
    ).toBeLessThanOrEqual(MAX_HISTORY_TOTAL_CHARACTERS);
    expect(compacted.at(-1)?.content).toContain('5:');
    expect(compacted.some((message) => message.content.startsWith('0:'))).toBe(false);
  });
});
