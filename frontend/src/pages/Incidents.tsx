import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { format, formatDistanceToNow } from 'date-fns';

export const Incidents: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const { data: incidents = [], isLoading } = useQuery<any[]>({
    queryKey: ['incidents', statusFilter],
    queryFn: async () =>
      (await api.get('/incidents', { params: { status: statusFilter !== 'all' ? statusFilter : undefined } })).data,
    refetchInterval: 30000,
  });

  const openCount = incidents.filter((i) => i.isOpen).length;
  const resolvedCount = incidents.filter((i) => !i.isOpen).length;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Incidents</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Track and review downtime events across all your monitors
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>OPEN INCIDENTS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{openCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLVED</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['all', 'open', 'resolved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: statusFilter === s ? 'var(--accent-primary)' : 'var(--border-color)',
              background: statusFilter === s ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: statusFilter === s ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Incidents Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '1rem', opacity: 0.7 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>No Incidents Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>All your monitors are healthy!</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Monitor</th>
                  <th>Started</th>
                  <th>Resolved</th>
                  <th>Duration</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc: any) => (
                  <tr key={inc.id}>
                    <td>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '99px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: inc.isOpen ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                          color: inc.isOpen ? '#ef4444' : '#10b981',
                        }}
                      >
                        {inc.isOpen ? '● OPEN' : '✓ RESOLVED'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inc.monitorName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {inc.monitorUrl}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {format(new Date(inc.startedAt), 'MMM dd, HH:mm')}
                    </td>
                    <td style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {inc.resolvedAt ? format(new Date(inc.resolvedAt), 'MMM dd, HH:mm') : '—'}
                    </td>
                    <td style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(inc.durationMs / 60000)} min
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
