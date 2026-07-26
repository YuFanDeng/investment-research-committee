import { CheckCircle2, MessageSquareText, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';

import type { HumanReviewDecision, HumanReviewRequest } from '../../types/research';

type ApprovalPanelProps = {
  request: HumanReviewRequest;
  isSubmitting: boolean;
  onDecision: (decision: HumanReviewDecision) => void;
};

export function ApprovalPanel({ request, isSubmitting, onDecision }: ApprovalPanelProps) {
  const [feedback, setFeedback] = useState('');
  const revisionCount = request.challengeReport.requiredRevisions.length;
  const riskCount = request.challengeReport.keyRisks.length;

  return (
    <section className="approval-panel artifact-enter" aria-labelledby="approval-heading">
      <div className="approval-heading">
        <span className="approval-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <div>
          <span className="section-kicker">Human-in-the-loop checkpoint</span>
          <h2 id="approval-heading">Committee sign-off required</h2>
          <p>
            The graph is paused after skeptic review. Your decision resumes this exact research run.
          </p>
        </div>
        <span className="approval-paused-badge">Graph paused</span>
      </div>

      <div className="approval-summary" aria-label="Review summary">
        <span>
          <strong>{revisionCount}</strong> requested revisions
        </span>
        <span>
          <strong>{riskCount}</strong> key risks
        </span>
        <span>
          <strong>{request.warnings.length}</strong> workflow warnings
        </span>
      </div>

      <label className="approval-feedback">
        <span>
          <MessageSquareText size={16} />
          Revision feedback
        </span>
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Tell the chair what should change before final synthesis…"
          maxLength={2_000}
          disabled={isSubmitting}
        />
        <small>Required only when requesting a revision.</small>
      </label>

      <div className="approval-actions">
        <button
          className="approval-button is-approve"
          type="button"
          disabled={isSubmitting}
          onClick={() => onDecision({ decision: 'approve' })}
        >
          <CheckCircle2 size={17} />
          Approve synthesis
        </button>
        <button
          className="approval-button is-revise"
          type="button"
          disabled={isSubmitting || !feedback.trim()}
          onClick={() => onDecision({ decision: 'revise', feedback: feedback.trim() })}
        >
          <MessageSquareText size={17} />
          Request revision
        </button>
        <button
          className="approval-button is-reject"
          type="button"
          disabled={isSubmitting}
          onClick={() => onDecision({ decision: 'reject', feedback: feedback.trim() || undefined })}
        >
          <XCircle size={17} />
          Reject memo
        </button>
      </div>
    </section>
  );
}
