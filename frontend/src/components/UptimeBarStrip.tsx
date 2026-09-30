import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { format, parseISO } from 'date-fns';

interface UptimeBar {
  date: string;
  uptimePercentage: number;
  totalChecks: number;
  avgResponseMs: number;
  status: 'UP' | 'DOWN' | 'DEGRADED' | 'NO_DATA';
}

interface UptimeBarStripProps {
  monitorId?: string;
  initialBars?: UptimeBar[];
  compact?: boolean;
}

export const UptimeBarStrip: React.FC<UptimeBarStripProps> = ({ monitorId, initialBars, compact = false }) => {
  const [hoveredBar, setHoveredBar] = useState<UptimeBar | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { data: fetchedBars = [], isLoading } = useQuery<UptimeBar[]>({
    queryKey: ['uptimeBars', monitorId],
    queryFn: async () => {
      const res = await api.get(`/monitors/${monitorId}/uptime-bars`);
      return res.data;
    },
    enabled: !initialBars && !!monitorId,
    staleTime: 60000,
  });

  const bars = initialBars || fetchedBars;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: compact ? '20px' : '32px' }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.06)',
              animation: 'pulse 1.5s infinite',
            }}
          />
        ))}
      </div>
    );
  }

  // Calculate overall 30d uptime
  const validBars = bars.filter((b) => b.status !== 'NO_DATA');
  const avgUptime = validBars.length > 0
    ? (validBars.reduce((acc, b) => acc + b.uptimePercentage, 0) / validBars.length).toFixed(2)
    : '100.00';

  const getColor = (status: UptimeBar['status'], percentage: number) => {
    if (status === 'NO_DATA') return 'rgba(255, 255, 255, 0.12)';
    if (status === 'DOWN' || percentage < 80) return '#ef4444';
    if (status === 'DEGRADED' || percentage < 99) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Bars row */}
      <div
        style={{
          display: 'flex',
          gap: compact ? '2px' : '4px',
          alignItems: 'stretch',
          height: compact ? '22px' : '36px',
        }}
      >
        {bars.map((bar) => {
          const color = getColor(bar.status, bar.uptimePercentage);
          return (
            <div
              key={bar.date}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                setHoveredBar(bar);
              }}
              onMouseLeave={() => setHoveredBar(null)}
              style={{
                flex: 1,
                borderRadius: '3px',
                backgroundColor: color,
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoveredBar?.date === bar.date ? 'scaleY(1.2)' : 'scaleY(1)',
                boxShadow: hoveredBar?.date === bar.date ? `0 0 8px ${color}` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Footer labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.4rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>30 days ago</span>
        <span style={{ fontWeight: 600, color: Number(avgUptime) >= 99 ? '#10b981' : '#f59e0b' }}>
          {avgUptime}% Uptime
        </span>
        <span>Today</span>
      </div>

      {/* Floating Tooltip */}
      {hoveredBar && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            color: '#f9fafb',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '2px', color: '#93c5fd' }}>
            {format(parseISO(hoveredBar.date), 'EEEE, MMMM dd, yyyy')}
          </div>
          {hoveredBar.status === 'NO_DATA' ? (
            <div style={{ color: 'var(--text-muted)' }}>No checks recorded</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>
                Uptime:{' '}
                <strong
                  style={{
                    color: hoveredBar.uptimePercentage >= 99 ? '#10b981' : hoveredBar.uptimePercentage > 0 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {hoveredBar.uptimePercentage}%
                </strong>
              </div>
              <div>Checks logged: <strong>{hoveredBar.totalChecks}</strong></div>
              {hoveredBar.avgResponseMs > 0 && (
                <div>Avg Latency: <strong>{hoveredBar.avgResponseMs}ms</strong></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
