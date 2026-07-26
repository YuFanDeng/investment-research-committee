import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MarketSnapshot } from '../../types/research';

type PriceChartProps = {
  snapshot: MarketSnapshot;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  );
}

function formatPrice(value: number, currency: string) {
  return `${currency.toUpperCase()} ${value.toFixed(2)}`;
}

export function PriceChart({ snapshot }: PriceChartProps) {
  const data = snapshot.historicalCloses.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));
  const first = data[0]?.close ?? 0;
  const last = data.at(-1)?.close ?? 0;
  const isPositive = last >= first;

  return (
    <div className="price-chart" aria-label={`${snapshot.currency} historical closing prices`}>
      <div className="price-chart-heading">
        <div>
          <span className="metric-label">12-month price path</span>
          <strong>{formatPrice(last, snapshot.currency)}</strong>
        </div>
        <span className={`chart-trend ${isPositive ? 'is-positive' : 'is-negative'}`}>
          {isPositive ? '↗' : '↘'} {isPositive ? 'Up' : 'Down'} over period
        </span>
      </div>
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 10, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              minTickGap={34}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #dce3ea',
                borderRadius: '8px',
                color: '#172033',
                fontSize: '12px',
              }}
              formatter={(value) => [formatPrice(Number(value), snapshot.currency), 'Close']}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={isPositive ? '#16a36a' : '#dc5a65'}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#16a36a', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
