import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, Pause, Play, ExternalLink, Clock, Shield, Activity, Zap, Download, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge, MonitorStatus } from '../components/StatusBadge';
import { UptimeChart } from '../components/UptimeChart';
import { UptimeBarStrip } from '../components/UptimeBarStrip';
import { SslCertCard } from '../components/SslCertCard';
import { QuickProbeModal } from '../components/QuickProbeModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow, format } from 'date-fns';

export const MonitorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isProbeOpen, setIsProbeOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {} });

  // Fetch monitor details
  const { data: monitor, isLoading: monitorLoading } = useQuery<any>({
    queryKey: ['monitor', id],
    queryFn: async () => (await api.get(`/monitors/${id}`)).data,
  });

  // Fetch checks history
  const { data: checks = [], isFetching: checksFetching, refetch: refetchChecks } = useQuery<any[]>({
    queryKey: ['checks', id, range],
    queryFn: async () => (await api.get(`/monitors/${id}/checks`, { params: { range } })).data,
    enabled: !!id,
    refetchInterval: 30000,
  });

  // Fetch uptime stats
  const { data: stats } = useQuery<any>({
    queryKey: ['stats', id],
    queryFn: async () => (await api.get(`/monitors/${id}/stats`)).data,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/monitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      success('Monitor deleted successfully');
      navigate('/dashboard');
    },
    onError: () => error('Failed to delete monitor'),
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.post(`/monitors/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      success('Monitor paused');
    },
    onError: () => error('Failed to pause monitor'),
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.post(`/monitors/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      success('Monitor resumed');
    },
    onError: () => error('Failed to resume monitor'),
  });

  const handleExport = async (formatType: 'csv' | 'json') => {
    try {
      const token = localStorage.getItem('uptime_token');
      const response = await fetch(`http://localhost:5000/api/monitors/${id}/export?format=${formatType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${monitor.name.replace(/\s+/g, '_')}_checks.${formatType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      success(`Exported checks as ${formatType.toUpperCase()}`);
    } catch (err: any) {
      error('Failed to export check data');
    }
  };

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Monitor',
      message: `Permanently delete "${monitor?.name}"? All check history and incidents will be lost.`,
      action: () => { deleteMutation.mutate(); setConfirmModal(p => ({ ...p, isOpen: false })); },
    });
  };

  if (monitorLoading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (!monitor) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Monitor not found</h2>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const lastCheck = checks[checks.length - 1] || null;
  let status: MonitorStatus = 'UP';
  if (!monitor.isActive) status = 'PAUSED';
  else if (lastCheck && !lastCheck.success) status = 'DOWN';

  const isHttps = monitor.url.startsWith('https://');

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{monitor.name}</h1>
              <StatusBadge status={status} />
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono)',
                textDecoration: 'none',
                marginTop: '0.2rem',
              }}
            >
              {monitor.url} <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Quick Probe Button */}
          <button
            onClick={() => setIsProbeOpen(true)}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
              color: '#000',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Zap size={16} /> Check Now
          </button>

          {/* Export Dropdown / Buttons */}
          <button
            onClick={() => handleExport('csv')}
            className="btn btn-secondary"
            title="Export check logs to CSV"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="btn btn-secondary"
            title="Export check logs to JSON"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}
          >
            <Download size={14} /> JSON
          </button>

          {monitor.isActive ? (
            <button onClick={() => pauseMutation.mutate()} className="btn btn-secondary"><Pause size={16} /> Pause</button>
          ) : (
            <button onClick={() => resumeMutation.mutate()} className="btn btn-secondary" style={{ color: '#10b981' }}><Play size={16} /> Resume</button>
          )}

          <Link to={`/monitors/${id}/edit`} className="btn btn-secondary"><Edit size={16} /> Edit</Link>
          <button onClick={handleDelete} className="btn btn-danger"><Trash2 size={16} /> Delete</button>
        </div>
      </div>

      {/* 30-Day Uptime Stripe Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>30-Day Availability & Stability</h3>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Daily health stripes</span>
        </div>
        <UptimeBarStrip monitorId={id!} />
      </div>

      {/* SSL Certificate Status Card */}
      <div style={{ marginBottom: '2rem' }}>
        <SslCertCard monitorId={id!} isHttps={isHttps} />
      </div>

      {/* Uptime Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {(['24h', '7d', '30d'] as const).map((r) => (
          <div key={r} className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>UPTIME {r.toUpperCase()}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
              {stats?.[r]?.uptimePercentage ?? '—'}%
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Avg: {stats?.[r]?.avgResponseMs ?? '—'} ms &bull; {stats?.[r]?.totalChecks ?? 0} checks
            </div>
          </div>
        ))}

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONFIGURATION</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span><strong>Method:</strong> {monitor.method}</span>
            <span><strong>Interval:</strong> Every {monitor.intervalSec / 60}m</span>
            <span><strong>Expected:</strong> HTTP {monitor.expectedStatus}</span>
            <span><strong>Threshold:</strong> {monitor.failureThreshold} failures</span>
          </div>
        </div>
      </div>

      {/* Latency Percentiles Breakdown */}
      {stats?.['24h']?.p50 > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Latency Percentile Distribution (Last 24h)</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Telemetry tail analysis</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: '#10b981' }}>{stats['24h'].minMs} ms</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p50 (Median)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{stats['24h'].p50} ms</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p90</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: '#6366f1' }}>{stats['24h'].p90} ms</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p95 (SLA)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: '#f59e0b' }}>{stats['24h'].p95} ms</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p99 (Tail)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: '#ef4444' }}>{stats['24h'].p99} ms</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-muted)' }}>{stats['24h'].maxMs} ms</div>
            </div>
          </div>
        </div>
      )}

      {/* Response Time Chart */}
      <UptimeChart checks={checks} range={range} onRangeChange={setRange} />

      {/* Recent Checks Table */}
      <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Checks</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing latest {Math.min(checks.length, 25)} checks
          </span>
        </div>
        {checks.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No checks logged in this time range yet.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Result</th>
                  <th>Time</th>
                  <th>Status Code</th>
                  <th>Response Time</th>
                  <th>Error / Detail</th>
                </tr>
              </thead>
              <tbody>
                {[...checks].reverse().slice(0, 25).map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{
                        padding: '2px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                        background: c.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: c.success ? '#10b981' : '#ef4444',
                      }}>
                        {c.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(c.checkedAt), 'MMM dd HH:mm:ss')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.statusCode ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{c.responseMs !== null ? `${c.responseMs} ms` : '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#ef4444', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidents */}
      {monitor.incidents?.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Incident History</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Resolved</th>
                  <th>Duration</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {monitor.incidents.map((inc: any) => {
                  const durationMs = inc.resolvedAt
                    ? new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime()
                    : Date.now() - new Date(inc.startedAt).getTime();
                  const durationMin = Math.round(durationMs / 60000);
                  return (
                    <tr key={inc.id}>
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: inc.resolvedAt ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: inc.resolvedAt ? '#10b981' : '#ef4444' }}>
                          {inc.resolvedAt ? 'RESOLVED' : 'OPEN'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                        {format(new Date(inc.startedAt), 'MMM dd HH:mm')}
                      </td>
                      <td style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {inc.resolvedAt ? format(new Date(inc.resolvedAt), 'MMM dd HH:mm') : '—'}
                      </td>
                      <td style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>{durationMin} min</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{inc.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
      />

      {/* Quick Probe Modal */}
      {isProbeOpen && (
        <QuickProbeModal
          monitorId={id!}
          monitorName={monitor.name}
          monitorUrl={monitor.url}
          isOpen={isProbeOpen}
          onClose={() => setIsProbeOpen(false)}
        />
      )}
    </div>
  );
};
