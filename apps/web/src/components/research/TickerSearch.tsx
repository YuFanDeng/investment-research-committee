import type { FormEvent } from 'react';

import type { SecDataMode } from '../../types/research';

type TickerSearchProps = {
  isLoading: boolean;
  ticker: string;
  onChange: (ticker: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isDevelopment: boolean;
  secDataMode: SecDataMode;
  onSecDataModeChange: (mode: SecDataMode) => void;
  compact?: boolean;
  label?: string;
  contextLabel?: string;
  submitLabel?: string;
  hint?: string;
  idPrefix?: string;
};

export function TickerSearch({
  isLoading,
  ticker,
  onChange,
  onSubmit,
  isDevelopment,
  secDataMode,
  onSecDataModeChange,
  compact = false,
  label = 'Research a company',
  contextLabel = 'U.S. equities · SEC EDGAR',
  submitLabel = 'Run research',
  hint = 'Try AAPL, MSFT, NVDA, or another listed U.S. ticker.',
  idPrefix = 'research',
}: TickerSearchProps) {
  const tickerInputId = `${idPrefix}-ticker`;

  return (
    <form className={`ticker-form ${compact ? 'ticker-form-compact' : ''}`} onSubmit={onSubmit}>
      {compact ? (
        <label className="sr-only" htmlFor={tickerInputId}>
          Research another company
        </label>
      ) : (
        <div className="field-label-row">
          <label htmlFor={tickerInputId}>{label}</label>
          <span>{contextLabel}</span>
        </div>
      )}
      <div className="ticker-input-row">
        <div className="ticker-input-wrap">
          <span className="ticker-prefix">$</span>
          <input
            id={tickerInputId}
            value={ticker}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="primary-button" type="submit" disabled={isLoading || !ticker.trim()}>
          {isLoading ? 'Researching…' : submitLabel}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      {isDevelopment ? (
        <fieldset className="data-mode-toggle">
          <legend>SEC source</legend>
          <label>
            <input
              type="radio"
              name={`${idPrefix}-sec-data-mode`}
              checked={secDataMode === 'fixture'}
              onChange={() => onSecDataModeChange('fixture')}
            />
            Fixture (AAPL)
          </label>
          <label>
            <input
              type="radio"
              name={`${idPrefix}-sec-data-mode`}
              checked={secDataMode === 'live'}
              onChange={() => onSecDataModeChange('live')}
            />
            Live SEC
          </label>
        </fieldset>
      ) : null}
      {compact ? null : <p className="form-hint">{hint}</p>}
    </form>
  );
}
