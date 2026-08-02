import type { MetricGridContentBlock } from '@investment-research/research/assistant-content';

import { formatCurrency, formatNumber } from './formatters';

function formatMetric(metric: MetricGridContentBlock['metrics'][number]) {
  if (typeof metric.value !== 'number') return metric.value;
  if (metric.format === 'currency') return formatCurrency(metric.value, true);
  if (metric.format === 'percentage') return `${formatNumber(metric.value)}%`;
  return formatNumber(metric.value);
}

export function AgentMetricGrid({ block }: { block: MetricGridContentBlock }) {
  return (
    <section className="assistant-rich-block" aria-labelledby={`${block.id}-heading`}>
      <div className="assistant-rich-heading">
        <div>
          <h3 id={`${block.id}-heading`}>{block.title}</h3>
          {block.description ? <p>{block.description}</p> : null}
        </div>
      </div>
      <div className="assistant-metric-grid">
        {block.metrics.map((metric) => (
          <div className="assistant-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{formatMetric(metric)}</strong>
            {metric.detail ? <small>{metric.detail}</small> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
