import type { FormEvent } from 'react';
import { useState } from 'react';
import { Bot, Check, Database, ExternalLink, LoaderCircle, Send, Sparkles } from 'lucide-react';

import { useResearchAssistant } from '../../hooks/use-research-assistant';
import type { AssistantToolActivity } from '../../types/assistant';
import type { SecDataMode } from '../../types/research';

type ResearchAssistantPanelProps = {
  ticker: string;
  secDataMode: SecDataMode;
  landing?: boolean;
};

const TOOL_LABELS: Record<string, string> = {
  get_sec_fundamentals: 'SEC fundamentals',
  get_recent_filings: 'Recent filings',
  get_market_snapshot: 'Market snapshot',
  get_price_history: 'Price history',
  calculate_valuation_metrics: 'Valuation metrics',
};

const SUGGESTED_QUESTIONS = [
  'How has the stock performed over the last year?',
  'What do the latest fundamentals say?',
  'What valuation limitations should I consider?',
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

export function ResearchAssistantPanel({
  ticker,
  secDataMode,
  landing = false,
}: ResearchAssistantPanelProps) {
  const [question, setQuestion] = useState('');
  const hasValidTicker = /^[A-Z.]{1,10}$/.test(ticker);
  const tickerLabel = hasValidTicker ? ticker : 'a valid ticker';
  const { askQuestion, error, isLoading, messages, toolActivity } = useResearchAssistant(
    ticker,
    secDataMode,
  );

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question;
    setQuestion('');
    void askQuestion(nextQuestion);
  }

  return (
    <section
      className={`assistant-panel ${landing ? 'is-landing' : ''}`}
      id="ask-research"
      aria-labelledby="assistant-heading"
    >
      <div className="assistant-panel-heading">
        <span className="assistant-heading-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <span className="section-kicker">Agentic follow-up</span>
          <h2 id="assistant-heading">Ask the research desk</h2>
          <p>
            Ask a focused question about {tickerLabel}. The agent chooses up to four read-only tools
            and shows its work.
          </p>
        </div>
        <span className="assistant-agent-badge">
          <Bot size={13} /> Tool-calling agent
        </span>
      </div>

      {!messages.length ? (
        <div className="assistant-suggestions" aria-label="Suggested research questions">
          {SUGGESTED_QUESTIONS.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              disabled={isLoading || !hasValidTicker}
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
      {!hasValidTicker ? (
        <div className="assistant-ticker-hint">
          Enter a valid U.S. ticker above to ask the agent.
        </div>
      ) : null}

      <form className="assistant-composer" onSubmit={submitQuestion}>
        <label htmlFor="assistant-question" className="sr-only">
          Ask a research question
        </label>
        <textarea
          id="assistant-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={
            hasValidTicker
              ? `Ask about ${ticker} fundamentals, filings, price history, or valuation…`
              : 'Enter a valid ticker in the research controls first…'
          }
          maxLength={1_000}
          disabled={isLoading || !hasValidTicker}
        />
        <button type="submit" disabled={isLoading || !hasValidTicker || !question.trim()}>
          {isLoading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
          Ask agent
        </button>
      </form>
      <p className="assistant-disclaimer">Educational research only · Not investment advice</p>
    </section>
  );
}
