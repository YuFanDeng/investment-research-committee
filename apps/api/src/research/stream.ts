import type {
  HumanReviewRequest,
  ResearchGraph,
  ResearchGraphResult,
  SecDataMode,
} from '@investment-research/research';

import { responseForResult } from './response.js';
import type { PausedResearchRunStore } from './run-store.js';

export type ResearchStreamWriter = {
  writeSSE(event: { event: string; data: string }): Promise<void>;
};

type StreamGraphRunOptions = {
  stream: ResearchStreamWriter;
  graph: ResearchGraph;
  graphInput: unknown;
  runId: string;
  secDataMode: SecDataMode;
  runStore: PausedResearchRunStore;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function streamArtifactUpdates(
  stream: ResearchStreamWriter,
  updates: Record<string, unknown>,
) {
  for (const [stage, rawUpdate] of Object.entries(updates)) {
    const update = asRecord(rawUpdate);
    if (!update) continue;

    const shared = {
      errors: asArray(update.errors),
      sources: asArray(update.sources),
    };

    if (stage === 'fetchSecFundamentals') {
      await stream.writeSSE({
        event: 'sec.completed',
        data: JSON.stringify({
          ...shared,
          companyName: update.companyName,
          fundamentals: update.fundamentals,
        }),
      });
    } else if (stage === 'fetchMarketData') {
      await stream.writeSSE({
        event: 'market.completed',
        data: JSON.stringify({
          ...shared,
          snapshot: update.marketSnapshot,
        }),
      });
    } else if (
      stage === 'fundamentalsAnalyst' ||
      stage === 'businessQualityAnalyst' ||
      stage === 'valuationAnalyst'
    ) {
      await stream.writeSSE({
        event: 'analyst.completed',
        data: JSON.stringify({
          ...shared,
          report: asArray(update.analystReports)[0],
        }),
      });
    } else if (stage === 'committeeDraft') {
      await stream.writeSSE({
        event: 'draft.completed',
        data: JSON.stringify({ errors: shared.errors }),
      });
    } else if (stage === 'skepticChallenge') {
      await stream.writeSSE({
        event: 'challenge.completed',
        data: JSON.stringify({
          ...shared,
          report: update.challengeReport,
        }),
      });
    }
  }
}

async function streamInterrupt(
  stream: ResearchStreamWriter,
  payload: Record<string, unknown>,
  runId: string,
  secDataMode: SecDataMode,
  runStore: PausedResearchRunStore,
) {
  const interruptRecord = asRecord(asArray(payload.__interrupt__)[0]);
  if (!interruptRecord) return false;

  const request = interruptRecord.value as HumanReviewRequest | undefined;
  if (!request) throw new Error('Human review interrupt did not include a request.');

  runStore.save(runId, { secDataMode });
  await stream.writeSSE({
    event: 'run.interrupted',
    data: JSON.stringify({ runId, request }),
  });
  return true;
}

export async function streamGraphRun(options: StreamGraphRunOptions) {
  let finalState: ResearchGraphResult | undefined;
  let interrupted = false;

  const graphStream = await options.graph.stream(
    options.graphInput as never,
    {
      configurable: { thread_id: options.runId },
      streamMode: ['values', 'updates', 'tasks'],
    } as never,
  );

  for await (const rawChunk of graphStream as AsyncIterable<unknown>) {
    if (!Array.isArray(rawChunk) || rawChunk.length !== 2) continue;
    const [mode, payload] = rawChunk as [string, Record<string, unknown>];

    if (mode === 'values') {
      finalState = payload as ResearchGraphResult;
      continue;
    }

    if (mode === 'updates') {
      if (
        await streamInterrupt(
          options.stream,
          payload,
          options.runId,
          options.secDataMode,
          options.runStore,
        )
      ) {
        interrupted = true;
      } else {
        await streamArtifactUpdates(options.stream, payload);
      }
      continue;
    }

    if (mode !== 'tasks' || typeof payload.name !== 'string') continue;
    await options.stream.writeSSE({
      event: 'result' in payload ? 'stage.completed' : 'stage.started',
      data: JSON.stringify({ stage: payload.name }),
    });
  }

  if (interrupted) return;
  if (!finalState) throw new Error('Research stream ended without a final state.');

  options.runStore.delete(options.runId);
  await options.stream.writeSSE({
    event: 'run.completed',
    data: JSON.stringify(responseForResult(finalState, options.secDataMode)),
  });
}
