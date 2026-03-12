import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useMarket } from '../hooks/useMarket';

function IndicatorCard({ indicator }) {
  const { label, unit, color, series } = indicator;
  if (!series?.length) return null;

  const latest = series[series.length - 1];
  const first = series[0];
  const change = latest.value - first.value;
  const changePct = first.value ? ((change / first.value) * 100).toFixed(1) : null;
  const isUp = change > 0;

  const formatValue = (v) => {
    if (unit === '$/day') return `$${(v / 1000).toFixed(0)}k`;
    if (unit === '% cargo value') return `${v.toFixed(2)}%`;
    return v.toLocaleString();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-800">
            {unit.startsWith('$') && '$'}
            {formatValue(latest.value)}
            {unit.startsWith('€') && ' €'}
          </p>
          <p className="text-xs text-slate-400">{unit}</p>
        </div>
        {changePct !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-sm font-semibold ${
              isUp ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isUp ? '+' : ''}{changePct}%
          </span>
        )}
      </div>
      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9 }}
              tickFormatter={(d) => d?.slice(5)}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              formatter={(v) => [formatValue(v), label]}
              labelFormatter={(d) => d}
              contentStyle={{ fontSize: '11px' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color || '#6366f1'}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Since {first.date}: baseline {formatValue(first.value)} →{' '}
        <span className={isUp ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {isUp ? '+' : ''}{change > 1000 ? `+$${(change / 1000).toFixed(0)}k` : change.toFixed(2)}
        </span>
      </p>
    </div>
  );
}

export default function MarketView() {
  const { indicators, loading, error } = useMarket();

  if (loading) return <p className="text-slate-600">Loading market data…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Market Panel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Key market indicators reflecting conflict escalation since baseline. Data sourced
          from Bloomberg/Reuters snapshots.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map((ind) => (
          <IndicatorCard key={ind.id} indicator={ind} />
        ))}
      </div>
      {indicators.length === 0 && (
        <p className="text-slate-500">No market indicators configured.</p>
      )}
    </div>
  );
}
