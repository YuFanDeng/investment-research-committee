import { useState } from 'react';

import { streamAssistantQuestion } from '../lib/assistant-api';
import type { AssistantEvent, AssistantMessage, AssistantToolActivity } from '../types/assistant';
import type { SecDataMode } from '../types/research';

function updateCompletedTool(
  activities: AssistantToolActivity[],
  event: Extract<AssistantEvent, { type: 'tool.completed' }>,
) {
  return activities.map((activity) =>
    activity.id === event.id || (activity.name === event.name && activity.status === 'running')
      ? { ...activity, status: 'complete' as const }
      : activity,
  );
}

export function useResearchAssistant(secDataMode: SecDataMode) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [toolActivity, setToolActivity] = useState<AssistantToolActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [resolvedTicker, setResolvedTicker] = useState<string>();

  function handleEvent(event: AssistantEvent) {
    if (event.type === 'ticker.resolved') {
      setResolvedTicker(event.ticker);
    } else if (event.type === 'tool.requested') {
      setToolActivity((current) => [
        ...current,
        { id: event.id, name: event.name, args: event.args, status: 'running' },
      ]);
    } else if (event.type === 'tool.completed') {
      setToolActivity((current) => updateCompletedTool(current, event));
    } else if (event.type === 'answer.completed') {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: event.answer,
          presentation: event.presentation,
          sources: event.sources,
        },
      ]);
    } else if (event.type === 'assistant.failed') {
      setError(event.message);
    }
  }

  async function askQuestion(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: trimmedQuestion }]);
    setToolActivity([]);
    setResolvedTicker(undefined);
    setError(undefined);
    setIsLoading(true);

    try {
      await streamAssistantQuestion(
        { question: trimmedQuestion, secDataMode, history },
        handleEvent,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The assistant failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return { askQuestion, error, isLoading, messages, resolvedTicker, toolActivity };
}
