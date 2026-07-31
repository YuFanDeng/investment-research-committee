import type { FormEvent } from 'react';
import { useState } from 'react';
import { Bot, Check, Database, ExternalLink, LoaderCircle, Send, Sparkles } from 'lucide-react';

import { useResearchAssistant } from '../../hooks/use-research-assistant';
import type { AssistantToolActivity } from '../../types/assistant';
import type { SecDataMode } from '../../types/research';

type ResearchAssistantPanelProps = {
  secDataMode: SecDataMode;
};

const TOOL_LABELS: Record<string, string> = {
  get_sec_fundamentals: 'SEC fundamentals',
  get_recent_filings: 'Recent filings',
  get_market_snapshot: 'Market snapshot',
  get_price_history: 'Price history',
  calculate_valuation_metrics: 'Valuation metrics',
};

const LIVE_SUGGESTED_QUESTIONS = [
  'How has Apple performed over the last year?',
  "What do Microsoft's latest fundamentals say?",
  'What valuation limitations should I consider for Nvidia?',
];

const FIXTURE_SUGGESTED_QUESTIONS = [
  'How has Apple performed over the last year?',
  "What do Apple's latest fundamentals say?",
  'What valuation limitations should I consider for Apple?',
];

function ToolActivity({ activity }: { activity: AssistantToolActivity }) {
  const Icon = activity.status === 'complete' ? Check : LoaderCircle;
  const args = Object.entries(activity.args)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' · ');

  return (
    <li className={`assistant-tool is-${activity.status}`}>
      <span className="assistant-tool-icon">
        <Icon className={activity.status === 'running' ? 'spin' : undefined} size={14} />
      </span>
      <span>
        <strong>{TOOL_LABELS[activity.name] ?? activity.name}</strong>
        <small>
          {args || (activity.status === 'running' ? 'Retrieving evidence' : 'Complete')}
        </small>
      </span>
    </li>
  );
}

export function ResearchAssistantPanel({ secDataMode }: ResearchAssistantPanelProps) {
  const [question, setQuestion] = useState('');
  const suggestions =
    secDataMode === 'fixture' ? FIXTURE_SUGGESTED_QUESTIONS : LIVE_SUGGESTED_QUESTIONS;
  const { askQuestion, error, isLoading, messages, resolvedTicker, toolActivity } =
    useResearchAssistant(secDataMode);

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question;
    setQuestion('');
    void askQuestion(nextQuestion);
  }

  return (
    <section
      className="assistant-panel is-standalone"
      id="ask-research"
      aria-labelledby="assistant-heading"
    >
      <div className="assistant-panel-heading">
        <span className="assistant-heading-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <span className="section-kicker">
            {resolvedTicker ? `Resolved company · $${resolvedTicker}` : 'Company-aware research'}
          </span>
          <h2 id="assistant-heading">Agent conversation</h2>
          <p>
            Mention a company by name or ticker. The agent resolves it, chooses up to four read-only
            tools, and shows its work.
          </p>
        </div>
        <span className="assistant-agent-badge">
          <Bot size={13} /> Tool-calling agent
        </span>
      </div>

      {!messages.length ? (
        <div className="assistant-suggestions" aria-label="Suggested research questions">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              disabled={isLoading}
              onClick={() => void askQuestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <div className="assistant-conversation" aria-live="polite">
          {messages.map((message, index) => (
            <article
              className={`assistant-message is-${message.role}`}
              key={`${message.role}-${index}`}
            >
              <span>{message.role === 'user' ? 'You' : 'Research agent'}</span>
              <p>{message.content}</p>
              {message.sources?.length ? (
                <div className="assistant-sources">
                  {message.sources.map((source) => (
                    <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                      <Database size={12} /> {source.id} <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {isLoading ? (
            <article className="assistant-message is-assistant is-thinking">
              <span>Research agent</span>
              <p>
                <LoaderCircle className="spin" size={15} /> Reviewing the question and choosing
                evidence…
              </p>
            </article>
          ) : null}
        </div>
      )}

      {toolActivity.length ? (
        <div className="assistant-tool-trace">
          <span className="assistant-trace-label">Live tool activity</span>
          <ul>
            {toolActivity.map((activity) => (
              <ToolActivity activity={activity} key={activity.id} />
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <div className="assistant-error">{error}</div> : null}
      <form className="assistant-composer" onSubmit={submitQuestion}>
        <label htmlFor="assistant-question" className="sr-only">
          Ask a research question
        </label>
        <textarea
          id="assistant-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about a company, its filings, price history, fundamentals, or valuation…"
          maxLength={1_000}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
          Ask agent
        </button>
      </form>
      <p className="assistant-disclaimer">Educational research only · Not investment advice</p>
    </section>
  );
}
