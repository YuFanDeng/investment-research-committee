import type { ResearchAssistantRun, ResearchToolCall } from '@investment-research/research';
import { randomUUID } from 'node:crypto';

import type { ResearchStreamWriter } from '../research/stream.js';

type AssistantStreamOptions = {
  stream: ResearchStreamWriter;
  run: ResearchAssistantRun;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function messageText(message: Record<string, unknown>) {
  if (typeof message.content === 'string') return message.content;
  return asArray(message.content)
    .map((part) => asRecord(part))
    .filter((part): part is Record<string, unknown> => Boolean(part))
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
}

function toolCallsFromMessage(message: Record<string, unknown>): ResearchToolCall[] {
  return asArray(message.tool_calls).flatMap((value) => {
    const call = asRecord(value);
    if (!call || typeof call.name !== 'string') return [];
    return [
      {
        id: typeof call.id === 'string' ? call.id : `${call.name}-${randomUUID()}`,
        name: call.name,
        args: asRecord(call.args) ?? {},
      },
    ];
  });
}

export async function streamAssistantRun(options: AssistantStreamOptions) {
  let finalAnswer = '';
  const graphStream = await options.run.graph.stream(options.run.input, {
    streamMode: 'updates',
    recursionLimit: 12,
  });

  for await (const rawUpdate of graphStream as AsyncIterable<unknown>) {
    const update = asRecord(rawUpdate);
    if (!update) continue;

    const agentUpdate = asRecord(update.agent) ?? asRecord(update.answerAtToolLimit);
    if (agentUpdate) {
      for (const rawMessage of asArray(agentUpdate.messages)) {
        const message = asRecord(rawMessage);
        if (!message) continue;
        const toolCalls = toolCallsFromMessage(message);

        for (const call of toolCalls) {
          await options.stream.writeSSE({
            event: 'tool.requested',
            data: JSON.stringify(call),
          });
        }

        if (!toolCalls.length) finalAnswer = messageText(message);
      }
    }

    const toolsUpdate = asRecord(update.tools);
    if (!toolsUpdate) continue;
    for (const rawMessage of asArray(toolsUpdate.messages)) {
      const message = asRecord(rawMessage);
      if (!message || typeof message.name !== 'string') continue;
      await options.stream.writeSSE({
        event: 'tool.completed',
        data: JSON.stringify({
          id: typeof message.tool_call_id === 'string' ? message.tool_call_id : message.name,
          name: message.name,
        }),
      });
    }
  }

  if (!finalAnswer) throw new Error('The assistant finished without an answer.');
  await options.stream.writeSSE({
    event: 'answer.completed',
    data: JSON.stringify({ answer: finalAnswer, sources: options.run.getSources() }),
  });
}
