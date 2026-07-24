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
};

export function TickerSearch({
  isLoading,
  ticker,
  onChange,
  onSubmit,
  isDevelopment,
  secDataMode,
  onSecDataModeChange,
}: TickerSearchProps) {
  return (
    <form className="ticker-form" onSubmit={onSubmit}>
      <div className="field-label-row">
        <label htmlFor="ticker">Research a company</label>
        <span>U.S. equities · SEC EDGAR</span>
      </div>
      <div className="ticker-input-row">
        <div className="ticker-input-wrap">
          <span className="ticker-prefix">$</span>
          <input
            id="ticker"
            value={ticker}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="primary-button" type="submit" disabled={isLoading || !ticker.trim()}>
          {isLoading ? 'Researching…' : 'Run research'}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      {isDevelopment ? (
        <fieldset className="data-mode-toggle">
          <legend>SEC source</legend>
          <label>
            <input
              type="radio"
              name="sec-data-mode"
              checked={secDataMode === 'fixture'}
              onChange={() => onSecDataModeChange('fixture')}
            />
            Fixture (AAPL)
          </label>
          <label>
            <input
              type="radio"
              name="sec-data-mode"
              checked={secDataMode === 'live'}
              onChange={() => onSecDataModeChange('live')}
            />
            Live SEC
          </label>
        </fieldset>
      ) : null}
      <p className="form-hint">Try AAPL, MSFT, NVDA, or another listed U.S. ticker.</p>
    </form>
  );
}
