import type { FormEvent } from 'react';

type TickerSearchProps = {
  isLoading: boolean;
  ticker: string;
  onChange: (ticker: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TickerSearch({ isLoading, ticker, onChange, onSubmit }: TickerSearchProps) {
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
      <p className="form-hint">Try AAPL, MSFT, NVDA, or another listed U.S. ticker.</p>
    </form>
  );
}
