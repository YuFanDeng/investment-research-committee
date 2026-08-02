import { AssistantContentBlockSchema } from '@investment-research/research/assistant-content';
import { lazy, Suspense } from 'react';

import type { AssistantPresentation } from '../../types/assistant';
import type { Source } from '../../types/research';
import { AgentDataTable } from './blocks/AgentDataTable';
import { AgentMetricGrid } from './blocks/AgentMetricGrid';
import { AgentMarkdown } from './blocks/AgentMarkdown';
import { UnknownContentBlock } from './blocks/UnknownContentBlock';

const AgentBarChart = lazy(() =>
  import('./blocks/AgentBarChart').then((module) => ({ default: module.AgentBarChart })),
);
const AgentLineChart = lazy(() =>
  import('./blocks/AgentLineChart').then((module) => ({ default: module.AgentLineChart })),
);

function ChartLoadingState() {
  return <div className="assistant-chart-loading">Preparing visualization…</div>;
}

type KnownBlock = ReturnType<typeof AssistantContentBlockSchema.parse>;

const CONTENT_BLOCK_RENDERERS = {
  markdown: (block: Extract<KnownBlock, { type: 'markdown' }>, sources: Source[]) => (
    <AgentMarkdown block={block} sources={sources} />
  ),
  'metric-grid': (block: Extract<KnownBlock, { type: 'metric-grid' }>) => (
    <AgentMetricGrid block={block} />
  ),
  'line-chart': (block: Extract<KnownBlock, { type: 'line-chart' }>) => (
    <Suspense fallback={<ChartLoadingState />}>
      <AgentLineChart block={block} />
    </Suspense>
  ),
  'bar-chart': (block: Extract<KnownBlock, { type: 'bar-chart' }>) => (
    <Suspense fallback={<ChartLoadingState />}>
      <AgentBarChart block={block} />
    </Suspense>
  ),
  'data-table': (block: Extract<KnownBlock, { type: 'data-table' }>, sources: Source[]) => (
    <AgentDataTable block={block} sources={sources} />
  ),
};

function renderContentBlock(block: KnownBlock, sources: Source[]) {
  switch (block.type) {
    case 'markdown':
      return CONTENT_BLOCK_RENDERERS.markdown(block, sources);
    case 'metric-grid':
      return CONTENT_BLOCK_RENDERERS['metric-grid'](block);
    case 'line-chart':
      return CONTENT_BLOCK_RENDERERS['line-chart'](block);
    case 'bar-chart':
      return CONTENT_BLOCK_RENDERERS['bar-chart'](block);
    case 'data-table':
      return CONTENT_BLOCK_RENDERERS['data-table'](block, sources);
  }
}

type AssistantContentProps = {
  fallbackMarkdown: string;
  presentation?: AssistantPresentation;
  sources: Source[];
};

export function AssistantContent({
  fallbackMarkdown,
  presentation,
  sources,
}: AssistantContentProps) {
  const blocks = presentation?.blocks.length
    ? presentation.blocks
    : [{ type: 'markdown', id: 'legacy-answer', content: fallbackMarkdown }];

  return (
    <div className="assistant-content" data-content-version={presentation?.version ?? 1}>
      {blocks.map((candidate, index) => {
        const parsed = AssistantContentBlockSchema.safeParse(candidate);
        if (!parsed.success) {
          return <UnknownContentBlock block={candidate} key={`unknown-${index}`} />;
        }

        return <div key={parsed.data.id}>{renderContentBlock(parsed.data, sources)}</div>;
      })}
    </div>
  );
}
