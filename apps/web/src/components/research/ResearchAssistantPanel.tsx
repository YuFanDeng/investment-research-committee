import type { FormEvent, KeyboardEvent } from 'react';
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
  calculate_moving_averages: 'Moving averages',
  get_insider_transactions: 'Insider transactions',
};

const LIVE_SUGGESTED_QUESTIONS = [
  'Is Apple above its 200-day moving average?',
  "What do Microsoft's latest fundamentals say?",
  'Were recent GNRC insider sales reported under 10b5-1 plans?',
  'What valuation limitations should I consider for Nvidia?',
];

const FIXTURE_SUGGESTED_QUESTIONS = [
  'Is Apple above its 200-day moving average?',
  "What do Apple's latest fundamentals say?",
  'Were recent Apple insider sales reported under 10b5-1 plans?',
  'What valuation limitations should I consider for Apple?',
];

function ToolActivity({ activity }: { activity: AssistantToolActivity }) {
  const Icon = activity.status === 'complete' ? Check : LoaderCircle;
  const label =
    activity.name === 'get_sec_fundamentals' && activity.args.period === 'quarterly'
      ? 'Quarterly SEC fundamentals'
      : (TOOL_LABELS[activity.name] ?? activity.name);
  const args = Object.entries(activity.args)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' · ');

  return (
    <li className={`assistant-tool is-${activity.status}`}>
      <span className="assistant-tool-icon">
        <Icon className={activity.status === 'running' ? 'spin' : undefined} size={14} />
      </span>
      <span>
        <strong>{label}</strong>
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

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const shouldSubmit =
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      !isLoading &&
      Boolean(question.trim());

    if (!shouldSubmit) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
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
          onKeyDown={handleQuestionKeyDown}
          placeholder="Ask about filings, insider activity, prices, fundamentals, or valuation…"
          maxLength={1_000}
          disabled={isLoading}
          aria-describedby="assistant-composer-help"
        />
        <button type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
          Ask agent
        </button>
      </form>
      <div className="assistant-composer-footer">
        <span id="assistant-composer-help">Enter to send · Shift + Enter for a new line</span>
        <span>Educational research only · Not investment advice</span>
      </div>
    </section>
  );
}
