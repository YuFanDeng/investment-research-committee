import type { SecDataMode } from '@investment-research/research';

export type PausedResearchRun = {
  secDataMode: SecDataMode;
};

export class PausedResearchRunStore {
  private readonly runs = new Map<string, PausedResearchRun>();

  get(runId: string) {
    return this.runs.get(runId);
  }

  save(runId: string, run: PausedResearchRun) {
    this.runs.set(runId, run);
  }

  delete(runId: string) {
    this.runs.delete(runId);
  }
}
