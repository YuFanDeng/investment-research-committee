import type { LineChartContentBlock } from '@investment-research/research/assistant-content';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCurrency, formatDate, formatNumber } from './formatters';

function formatValue(value: number, format: LineChartContentBlock['valueFormat']) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percentage') return `${formatNumber(value)}%`;
  return formatNumber(value);
}

function axisDate(value: unknown) {
  if (typeof value !== 'string') return String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function AgentLineChart({ block }: { block: LineChartContentBlock }) {
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [activeGroupKey, setActiveGroupKey] = useState(
    block.defaultSeriesGroup ?? block.seriesGroups?.[0]?.key,
  );
  const activeGroup = block.seriesGroups?.find((group) => group.key === activeGroupKey);
  const availableSeries = activeGroup
    ? block.series.filter((series) => activeGroup.seriesKeys.includes(series.key))
    : block.series;

  function selectGroup(groupKey: string) {
    setActiveGroupKey(groupKey);
    setHiddenSeries([]);
  }

  function toggleSeries(seriesKey: string) {
    setHiddenSeries((current) =>
      current.includes(seriesKey)
        ? current.filter((key) => key !== seriesKey)
        : [...current, seriesKey],
    );
  }

  return (
    <section className="assistant-rich-block" aria-labelledby={`${block.id}-heading`}>
      <div className="assistant-rich-heading">
        <div>
          <h3 id={`${block.id}-heading`}>{block.title}</h3>
          {block.description ? <p>{block.description}</p> : null}
        </div>
      </div>
      {block.seriesGroups ? (
        <div className="assistant-series-groups" aria-label={`${block.title} indicator family`}>
          {block.seriesGroups.map((group) => (
            <button
              type="button"
              key={group.key}
              className={group.key === activeGroupKey ? 'is-active' : undefined}
              aria-pressed={group.key === activeGroupKey}
              onClick={() => selectGroup(group.key)}
            >
              {group.label}
            </button>
          ))}
        </div>
      ) : null}
      {availableSeries.length > 1 ? (
        <div className="assistant-series-controls" aria-label={`${block.title} visible series`}>
          {availableSeries.map((series) => {
            const isVisible = !hiddenSeries.includes(series.key);
            return (
              <button
                type="button"
                key={series.key}
                className={isVisible ? 'is-visible' : undefined}
                aria-pressed={isVisible}
                onClick={() => toggleSeries(series.key)}
              >
                <span style={{ backgroundColor: series.color }} aria-hidden="true" />
                {series.label}
                {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="assistant-chart" role="img" aria-label={block.title}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={block.data} margin={{ top: 8, right: 10, bottom: 4, left: 2 }}>
            <CartesianGrid stroke="#e7e9f5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={block.xKey}
              axisLine={false}
              tickLine={false}
              minTickGap={42}
              tick={{ fill: '#718096', fontSize: 10 }}
              tickFormatter={axisDate}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={64}
              tick={{ fill: '#718096', fontSize: 10 }}
              tickFormatter={(value: number) => formatValue(value, block.valueFormat)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              labelFormatter={(value) =>
                typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
                  ? formatDate(value)
                  : String(value)
              }
              formatter={(value, name) => [
                formatValue(Number(value), block.valueFormat),
                String(name),
              ]}
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #dfe3ef',
                borderRadius: '12px',
                boxShadow: '0 10px 28px rgb(46 52 87 / 12%)',
                fontSize: '12px',
              }}
            />
            {block.referenceLines?.map((referenceLine) => (
              <ReferenceLine
                key={`${referenceLine.value}-${referenceLine.label ?? ''}`}
                y={referenceLine.value}
                label={referenceLine.label}
                stroke={referenceLine.color ?? '#94a3b8'}
                strokeDasharray="4 4"
              />
            ))}
            {availableSeries.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                strokeWidth={series.key === 'close' ? 2.5 : 1.7}
                strokeDasharray={series.key === 'close' ? undefined : '5 4'}
                hide={hiddenSeries.includes(series.key)}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
