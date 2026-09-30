import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Play, Pause, Trash2, ExternalLink, RefreshCw, Activity, ArrowUpRight, Edit, Zap } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge, MonitorStatus } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UptimeBarStrip } from '../components/UptimeBarStrip';
import { QuickProbeModal } from '../components/QuickProbeModal';
import { LivePollingTimer } from '../components/LivePollingTimer';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';

interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  intervalSec: number;
  status: MonitorStatus;
  isActive: boolean;
  isPublic: boolean;
  lastCheckTime: string | null;
  lastResponseMs: number | null;
  lastStatusCode: number | null;
}

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [probeTarget, setProbeTarget] = useState<Monitor | null>(null);

  // Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  // Fetch Monitors with 30s polling
  const { data: monitors = [], isLoading, isFetching, refetch } = useQuery<Monitor[]>({
    queryKey: ['monitors', searchTerm, statusFilter],
    queryFn: async () => {
      const res = await api.get('/monitors', {
        params: {
          search: searchTerm || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Pause Mutation
  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/monitors/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      success('Monitor paused');
    },
    onError: () => error('Failed to pause monitor'),
  });

  // Resume Mutation
  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/monitors/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      success('Monitor resumed');
    },
    onError: () => error('Failed to resume monitor'),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/monitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      success('Monitor deleted successfully');
    },
    onError: () => error('Failed to delete monitor'),
  });

  const handlePause = (m: Monitor) => {
    setConfirmModal({
      isOpen: true,
      title: 'Pause Monitor?',
      message: `Are you sure you want to pause check execution for "${m.name}"?`,
      action: () => {
        pauseMutation.mutate(m.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDelete = (m: Monitor) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Monitor?',
      message: `Are you sure you want to delete "${m.name}"? All historical check logs will be permanently deleted.`,
      action: () => {
        deleteMutation.mutate(m.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const totalCount = monitors.length;
  const upCount = monitors.filter((m) => m.status === 'UP').length;
  const downCount = monitors.filter((m) => m.status === 'DOWN').length;
  const pausedCount = monitors.filter((m) => m.status === 'PAUSED').length;

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Monitors Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Real-time status, latency metrics, and 30-day health across your API infrastructure
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <LivePollingTimer onRefresh={() => refetch()} isFetching={isFetching} intervalSec={30} />
          
          <Link to="/monitors/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            <span>Create Monitor</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL MONITORS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{totalCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>ONLINE (UP)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{upCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>DOWN / INCIDENTS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>{downCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #9ca3af' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAUSED</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#9ca3af', marginTop: '0.25rem' }}>{pausedCount}</div>
        </div>
      </div>

      {/* Filters & Search Header */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search monitors by name or URL (or press Ctrl+K)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'UP', 'DOWN', 'PAUSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: statusFilter === st ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                  color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Monitors Data Table / List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading monitors...
          </div>
        ) : monitors.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>No Monitors Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              You haven't added any endpoints yet or no monitors match your search query.
            </p>
            <Link to="/monitors/new" className="btn btn-primary">
              <Plus size={18} /> Add Your First Monitor
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name & URL</th>
                  <th style={{ minWidth: '180px' }}>30-Day History</th>
                  <th>Interval</th>
                  <th>Last Check</th>
                  <th>Latency</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monitors.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <Link
                          to={`/monitors/${m.id}`}
                          style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {m.name}
                          <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
                        </Link>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginRight: '6px' }}>
                          {m.method}
                        </span>
                        {m.url}
                      </div>
                    </td>
                    <td>
                      <UptimeBarStrip monitorId={m.id} compact />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Every {m.intervalSec / 60}m
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {m.lastCheckTime ? formatDistanceToNow(new Date(m.lastCheckTime), { addSuffix: true }) : 'Never'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: !m.lastResponseMs
                            ? 'var(--text-muted)'
                            : m.lastResponseMs < 300
                            ? '#10b981'
                            : m.lastResponseMs < 800
                            ? '#f59e0b'
                            : '#ef4444',
                        }}
                      >
                        {m.lastResponseMs !== null ? `${m.lastResponseMs} ms` : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Instant Quick Probe Button */}
                        <button
                          onClick={() => setProbeTarget(m)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem', color: '#eab308' }}
                          title="Instant Live Probe"
                        >
                          <Zap size={15} />
                        </button>

                        {m.isActive ? (
                          <button
                            onClick={() => handlePause(m)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.6rem' }}
                            title="Pause Monitoring"
                          >
                            <Pause size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => resumeMutation.mutate(m.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.6rem', color: '#10b981' }}
                            title="Resume Monitoring"
                          >
                            <Play size={15} />
                          </button>
                        )}

                        <Link
                          to={`/monitors/${m.id}/edit`}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem' }}
                          title="Edit Monitor"
                        >
                          <Edit size={15} />
                        </Link>

                        <button
                          onClick={() => handleDelete(m)}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.6rem' }}
                          title="Delete Monitor"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Quick Probe Modal */}
      {probeTarget && (
        <QuickProbeModal
          monitorId={probeTarget.id}
          monitorName={probeTarget.name}
          monitorUrl={probeTarget.url}
          isOpen={!!probeTarget}
          onClose={() => setProbeTarget(null)}
        />
      )}
    </div>
  );
};
