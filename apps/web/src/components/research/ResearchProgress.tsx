import { Fragment } from 'react';
import { Check, Circle, LoaderCircle } from 'lucide-react';

import { RESEARCH_STAGES, type ResearchStageStatus } from '../../hooks/use-research';

type ResearchProgressProps = {
  isLoading: boolean;
  hasResult: boolean;
  isAwaitingApproval: boolean;
  isRejected: boolean;
  statusMessage: string;
  stageStatuses: Record<string, ResearchStageStatus>;
};

export function ResearchProgress({
  isLoading,
  hasResult,
  isAwaitingApproval,
  isRejected,
  stageStatuses,
  statusMessage,
}: ResearchProgressProps) {
  const completedStages = Object.values(stageStatuses).filter(
    (status) => status === 'complete',
  ).length;
  const progressPercent = hasResult ? 100 : (completedStages / RESEARCH_STAGES.length) * 100;

  return (
    <aside className="progress-panel" aria-label="Research workflow progress">
      <div className="progress-heading">
        <div>
          <span className="section-kicker">Research run</span>
          <strong>
            {completedStages} of {RESEARCH_STAGES.length} stages
          </strong>
        </div>
        <span className={isLoading ? 'live-label' : 'muted-label'}>
          {isLoading
            ? 'Live'
            : isAwaitingApproval
              ? 'Approval'
              : hasResult
                ? 'Complete'
                : isRejected
                  ? 'Rejected'
                  : 'Ready'}
        </span>
      </div>
      <p className="progress-status" role="status">
        {statusMessage}
      </p>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${isLoading || hasResult ? progressPercent : 0}%` }} />
      </div>
      <div className="stage-timeline" aria-label="Detailed research stages">
        {RESEARCH_STAGES.map((stage, index) => {
          const status = hasResult ? 'complete' : (stageStatuses[stage.id] ?? 'waiting');
          const Icon = status === 'complete' ? Check : status === 'active' ? LoaderCircle : Circle;
          return (
            <Fragment key={stage.id}>
              {index === 0 || RESEARCH_STAGES[index - 1].phase !== stage.phase ? (
                <span className="stage-phase-label">{stage.phase}</span>
              ) : null}
              <div className={`stage-item is-${status}`}>
                {index < RESEARCH_STAGES.length - 1 ? (
                  <span className="stage-connector" aria-hidden="true" />
                ) : null}
                <span className="stage-icon" aria-hidden="true">
                  <Icon className={status === 'active' ? 'spin' : undefined} size={15} />
                </span>
                <span className="stage-copy">
                  <strong>{stage.label}</strong>
                  <small>{status === 'active' ? 'Working now' : status}</small>
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </aside>
  );
}
