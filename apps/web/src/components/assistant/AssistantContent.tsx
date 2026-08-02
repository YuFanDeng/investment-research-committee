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
type TechnicalDomain = NonNullable<Extract<KnownBlock, { type: 'line-chart' }>['technicalDomain']>;

const TECHNICAL_SECTIONS: Array<{
  domain: TechnicalDomain;
  title: string;
  description: string;
}> = [
  {
    domain: 'trend',
    title: 'Trend',
    description: 'Price direction viewed through smoothed closing-price averages.',
  },
  {
    domain: 'momentum',
    title: 'Momentum',
    description: 'The strength and direction of recent closing-price movement.',
  },
  {
    domain: 'volatility',
    title: 'Volatility',
    description: 'How widely the closing price is moving around its recent trend.',
  },
];

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

function blockKey(block: KnownBlock, index: number) {
  return `${block.id}-${index}`;
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

  const parsedBlocks = blocks.map((candidate) => AssistantContentBlockSchema.safeParse(candidate));
  const technicalBlocks = parsedBlocks.flatMap((parsed) =>
    parsed.success && parsed.data.type !== 'markdown' && parsed.data.technicalDomain
      ? [parsed.data]
      : [],
  );

  return (
    <div className="assistant-content" data-content-version={presentation?.version ?? 1}>
      {parsedBlocks.map((parsed, index) => {
        if (!parsed.success) {
          return <UnknownContentBlock block={blocks[index]} key={`unknown-${index}`} />;
        }
        if (parsed.data.type !== 'markdown' && parsed.data.technicalDomain) return null;

        return (
          <div key={blockKey(parsed.data, index)}>{renderContentBlock(parsed.data, sources)}</div>
        );
      })}
      {technicalBlocks.length ? (
        <div className="assistant-technical-analysis" aria-label="Technical analysis details">
          {TECHNICAL_SECTIONS.map((section) => {
            const sectionBlocks = technicalBlocks.filter(
              (block) => block.technicalDomain === section.domain,
            );
            if (!sectionBlocks.length) return null;

            return (
              <section className="assistant-technical-section" key={section.domain}>
                <header>
                  <span>{section.domain}</span>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </header>
                <div className="assistant-technical-blocks">
                  {sectionBlocks.map((block, index) => (
                    <div key={blockKey(block, index)}>{renderContentBlock(block, sources)}</div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
