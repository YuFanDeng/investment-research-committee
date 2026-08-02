import { Braces, Database, ShieldCheck } from 'lucide-react';

import type { SecDataMode } from '../../types/research';
import { ResearchAssistantPanel } from './ResearchAssistantPanel';

type AgentWorkspaceProps = {
  isDevelopment: boolean;
  secDataMode: SecDataMode;
  onSecDataModeChange: (mode: SecDataMode) => void;
};

const CAPABILITIES = [
  { icon: Database, label: 'Live evidence', detail: 'Filings, markets + ownership' },
  { icon: Braces, label: 'Visible decisions', detail: 'Watch every selected tool' },
  { icon: ShieldCheck, label: 'Bounded agent', detail: 'Read-only · four-call limit' },
];

export function AgentWorkspace({
  isDevelopment,
  secDataMode,
  onSecDataModeChange,
}: AgentWorkspaceProps) {
  return (
    <div className="agent-workspace">
      <section className="agent-intro">
        <div>
          <span className="section-kicker">Conversational research mode</span>
          <h1>
            Ask the market.
            <br />
            <em>Follow the evidence.</em>
          </h1>
          <p>
            Ask about a company by name or ticker. The agent resolves the company, decides which
            research tools it needs, and exposes those decisions as they happen.
          </p>
        </div>
        <div className="agent-capabilities" aria-label="Agent capabilities">
          {CAPABILITIES.map(({ icon: Icon, label, detail }) => (
            <div key={label}>
              <span>
                <Icon size={17} />
              </span>
              <p>
                <strong>{label}</strong>
                <small>{detail}</small>
              </p>
            </div>
          ))}
        </div>
      </section>

      {isDevelopment ? (
        <div className="agent-settings">
          <span>Development evidence</span>
          <fieldset className="data-mode-toggle">
            <legend className="sr-only">SEC source</legend>
            <label>
              <input
                type="radio"
                name="agent-sec-data-mode"
                checked={secDataMode === 'fixture'}
                onChange={() => onSecDataModeChange('fixture')}
              />
              AAPL fixture
            </label>
            <label>
              <input
                type="radio"
                name="agent-sec-data-mode"
                checked={secDataMode === 'live'}
                onChange={() => onSecDataModeChange('live')}
              />
              Live SEC
            </label>
          </fieldset>
          <small>The local fixture supports Apple only; use Live SEC for other companies.</small>
        </div>
      ) : null}

      <ResearchAssistantPanel key={secDataMode} secDataMode={secDataMode} />
    </div>
  );
}
