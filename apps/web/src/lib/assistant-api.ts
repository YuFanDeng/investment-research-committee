import type { AssistantEvent, AssistantRequest } from '../types/assistant';
import type { Source } from '../types/research';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function streamAssistantQuestion(
  request: AssistantRequest,
  onEvent: (event: AssistantEvent) => void,
) {
  const response = await fetch(`${API_URL}/assistant/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(request),
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'The research assistant could not be started.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedAnswer = false;

  function consumeEvent(block: string) {
    const lines = block.split('\n');
    const eventName = lines
      .find((line) => line.startsWith('event:'))
      ?.slice(6)
      .trim();
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!eventName || !data) return;

    const payload = JSON.parse(data) as Record<string, unknown>;
    if (eventName === 'assistant.started' && typeof payload.runId === 'string') {
      onEvent({ type: 'assistant.started', runId: payload.runId });
    } else if (eventName === 'ticker.resolved' && typeof payload.ticker === 'string') {
      onEvent({ type: 'ticker.resolved', ticker: payload.ticker });
    } else if (
      eventName === 'tool.requested' &&
      typeof payload.id === 'string' &&
      typeof payload.name === 'string'
    ) {
      onEvent({
        type: 'tool.requested',
        id: payload.id,
        name: payload.name,
        args:
          typeof payload.args === 'object' && payload.args !== null
            ? (payload.args as Record<string, unknown>)
            : {},
      });
    } else if (
      eventName === 'tool.completed' &&
      typeof payload.id === 'string' &&
      typeof payload.name === 'string'
    ) {
      onEvent({ type: 'tool.completed', id: payload.id, name: payload.name });
    } else if (eventName === 'answer.completed' && typeof payload.answer === 'string') {
      receivedAnswer = true;
      onEvent({
        type: 'answer.completed',
        answer: payload.answer,
        sources: asArray<Source>(payload.sources),
      });
    } else if (eventName === 'assistant.failed') {
      const message =
        typeof payload.message === 'string' ? payload.message : 'The research assistant failed.';
      onEvent({ type: 'assistant.failed', message });
      throw new Error(message);
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    blocks.forEach(consumeEvent);
    if (done) break;
  }

  if (!receivedAnswer) throw new Error('The assistant stream ended before an answer was received.');
}
