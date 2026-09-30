import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
// Compatible with Recharts v3+
import { format } from 'date-fns';

interface CheckItem {
  id: string;
  checkedAt: string;
  success: boolean;
  responseMs: number | null;
  statusCode: number | null;
}

interface UptimeChartProps {
  checks: CheckItem[];
  range: '24h' | '7d' | '30d';
  onRangeChange: (range: '24h' | '7d' | '30d') => void;
}

export const UptimeChart: React.FC<UptimeChartProps> = ({ checks, range, onRangeChange }) => {
  const chartData = checks.map((c) => ({
    timestamp: c.checkedAt,
    formattedTime: format(new Date(c.checkedAt), range === '24h' ? 'HH:mm' : 'MMM dd HH:mm'),
    responseMs: c.success ? c.responseMs || 0 : 0,
    status: c.success ? 'Success' : 'Failed',
    statusCode: c.statusCode || 'N/A',
  }));

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Response Time & History</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Latency performance across checks (ms)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: range === r ? 'var(--accent-primary)' : 'transparent',
                color: range === r ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No check historical data logged for this time range yet.
        </div>
      ) : (
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="formattedTime"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
                formatter={(value: any) => [`${value} ms`, 'Response Time']}
              />
              <Area
                type="monotone"
                dataKey="responseMs"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLatency)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
