import type { ResearchPhaseId } from '../../types/research';

const PHASES: { id: ResearchPhaseId; label: string; detail: string }[] = [
  { id: 'validate', label: 'Validate ticker', detail: 'Resolving company identity' },
  { id: 'evidence', label: 'Retrieve evidence', detail: 'Reading SEC EDGAR facts' },
  { id: 'memo', label: 'Write memo', detail: 'Preparing structured analysis' },
  { id: 'verify', label: 'Verify sources', detail: 'Checking evidence trail' },
];

type ResearchProgressProps = {
  activePhase: ResearchPhaseId;
  isLoading: boolean;
  hasResult: boolean;
};

export function ResearchProgress({ activePhase, isLoading, hasResult }: ResearchProgressProps) {
  const activeIndex = PHASES.findIndex((phase) => phase.id === activePhase);

  return (
    <section className="progress-panel" aria-label="Research workflow progress">
      <div className="section-kicker">
        <span>Workflow activity</span>
        <span className={isLoading ? 'live-label' : 'muted-label'}>
          {isLoading ? 'LIVE' : hasResult ? 'COMPLETE' : 'READY'}
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span
          style={{
            width: `${hasResult ? 100 : isLoading ? ((activeIndex + 1) / PHASES.length) * 100 : 0}%`,
          }}
        />
      </div>
      <ol className="phase-list">
        {PHASES.map((phase, index) => {
          const isComplete = hasResult || (isLoading && index < activeIndex);
          const isActive = isLoading && phase.id === activePhase;
          return (
            <li
              className={`${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
              key={phase.id}
            >
              <span className="phase-icon">
                {isComplete ? '✓' : isActive ? '·' : String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <strong>{phase.label}</strong>
                <small>{phase.detail}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
