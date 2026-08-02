import type { BarChartContentBlock } from '@investment-research/research/assistant-content';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCurrency, formatNumber } from './formatters';

function formatValue(value: number, format: BarChartContentBlock['valueFormat']) {
  if (format === 'currency') return formatCurrency(value, true);
  if (format === 'percentage') return `${formatNumber(value)}%`;
  return formatNumber(value);
}

export function AgentBarChart({ block }: { block: BarChartContentBlock }) {
  return (
    <section className="assistant-rich-block" aria-labelledby={`${block.id}-heading`}>
      <div className="assistant-rich-heading">
        <div>
          <h3 id={`${block.id}-heading`}>{block.title}</h3>
          {block.description ? <p>{block.description}</p> : null}
        </div>
      </div>
      <div className="assistant-chart" role="img" aria-label={block.title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={block.data} margin={{ top: 8, right: 10, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="#e7e9f5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={block.xKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#718096', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={62}
              tick={{ fill: '#718096', fontSize: 10 }}
              tickFormatter={(value: number) => formatValue(value, block.valueFormat)}
            />
            <Tooltip
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
            {block.series.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                fill={series.color}
                radius={[6, 6, 0, 0]}
                maxBarSize={54}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
