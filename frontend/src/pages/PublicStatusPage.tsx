import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  Globe,
  Clock,
  ShieldCheck,
  Sun,
  Moon,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { UptimeBarStrip } from '../components/UptimeBarStrip';
import { useTheme } from '../context/ThemeContext';

export const PublicStatusPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { theme, toggleTheme } = useTheme();
  const [countdown, setCountdown] = useState(60);

  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ['publicStatus', slug],
    queryFn: async () => (await api.get(`/status/${slug || 'default'}`)).data,
    refetchInterval: 60000,
  });

  // Countdown timer for next refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    refetch();
    setCountdown(60);
  };

  const metrics = data?.metrics || {
    totalMonitors: data?.monitors?.length || 0,
    upMonitors: data?.monitors?.filter((m: any) => m.status === 'UP').length || 0,
    downMonitors: data?.monitors?.filter((m: any) => m.status === 'DOWN').length || 0,
    systemUptime: 100,
    systemAvgMs: 0,
  };

  const activeIncidents = data?.activeIncidents || [];
  const pastIncidents = data?.pastIncidents || [];
  const hasActiveIncident = activeIncidents.length > 0 || metrics.downMonitors > 0;

  const statusTitle = hasActiveIncident
    ? metrics.downMonitors === metrics.totalMonitors && metrics.totalMonitors > 0
      ? 'Major Service Outage'
      : 'Partial System Degradation'
    : 'All Systems Operational';

  const statusColor = hasActiveIncident
    ? metrics.downMonitors === metrics.totalMonitors && metrics.totalMonitors > 0
      ? '#ef4444'
      : '#f59e0b'
    : '#10b981';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2.5rem 1.5rem 5rem',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Top Navbar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '3rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              <Activity size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
                UptimePulse
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Live Service Status
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Auto refresh badge */}
            <button
              onClick={handleManualRefresh}
              title="Click to refresh now"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: isFetching ? 'spin 1s linear infinite' : 'none',
                  color: isFetching ? '#6366f1' : 'inherit',
                }}
              />
              <span>{countdown}s</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              to="/login"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#6366f1',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(99,102,241,0.1)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              Log in <ChevronRight size={14} />
            </Link>
          </div>
        </header>

        {/* Hero Operational Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '2rem 2.5rem',
            borderRadius: '16px',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${statusColor}33`,
            boxShadow: `0 8px 32px ${statusColor}15`,
            background: `linear-gradient(135deg, ${statusColor}08, var(--card-bg))`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `${statusColor}20`,
                  border: `2px solid ${statusColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 20px ${statusColor}40`,
                }}
              >
                {hasActiveIncident ? (
                  <AlertTriangle size={24} color={statusColor} />
                ) : (
                  <ShieldCheck size={26} color={statusColor} />
                )}
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  {statusTitle}
                </h1>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Verified via global telemetry · {data?.updatedAt ? format(new Date(data.updatedAt), 'MMM dd, HH:mm:ss') : 'Live'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.9rem',
                borderRadius: '99px',
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}40`,
                color: statusColor,
                fontWeight: 700,
                fontSize: '0.8125rem',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 8px ${statusColor}`,
                  animation: 'pulse 2s infinite',
                }}
              />
              <span>{hasActiveIncident ? 'INCIDENT IN PROGRESS' : 'OPERATIONAL'}</span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1.5rem',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Overall Uptime
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: metrics.systemUptime >= 99 ? '#10b981' : '#f59e0b' }}>
                {metrics.systemUptime}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Avg Latency
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                {metrics.systemAvgMs > 0 ? `${metrics.systemAvgMs} ms` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Services
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#6366f1' }}>
                {metrics.upMonitors} / {metrics.totalMonitors}
              </div>
            </div>
          </div>
        </div>

        {/* Active Incidents Alert (if any) */}
        {activeIncidents.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
              <AlertTriangle size={18} /> Active Incidents
            </h3>
            {activeIncidents.map((inc: any) => (
              <div
                key={inc.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>
                    {inc.monitorName} is experiencing issues
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Started {formatDistanceToNow(new Date(inc.startedAt), { addSuffix: true })}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Reason: <strong>{inc.cause || 'Target returned non-success response or timed out'}</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Services List Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Monitored Services</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            30-day reliability history
          </span>
        </div>

        {/* Monitors List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block' }} />
            Loading status telemetry...
          </div>
        ) : !data?.monitors?.length ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <Globe size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <h3>No Public Monitors</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              No monitors have been marked as public yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.monitors.map((m: any) => {
              const isUp = m.status === 'UP';
              const dotColor = isUp ? '#10b981' : '#ef4444';

              return (
                <div
                  key={m.id}
                  className="glass-panel"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '14px',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  {/* Monitor Header Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: dotColor,
                          boxShadow: `0 0 8px ${dotColor}`,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{m.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{m.url}</span>
                          {m.lastResponseMs !== null && (
                            <>
                              <span>•</span>
                              <span style={{ color: m.lastResponseMs < 300 ? '#10b981' : '#f59e0b' }}>
                                {m.lastResponseMs}ms latency
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 800,
                            color: m.uptime30d >= 99 ? '#10b981' : m.uptime30d >= 95 ? '#f59e0b' : '#ef4444',
                          }}
                        >
                          {m.uptime30d}%
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>30d uptime</div>
                      </div>

                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '99px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: dotColor,
                          border: `1px solid ${dotColor}40`,
                        }}
                      >
                        {m.status}
                      </span>
                    </div>
                  </div>

                  {/* 30-Day Bucketed Stripes */}
                  <UptimeBarStrip initialBars={m.bars} compact={true} />
                </div>
              );
            })}
          </div>
        )}

        {/* Past Incidents History */}
        {pastIncidents.length > 0 && (
          <div style={{ marginTop: '3.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Past Incidents
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pastIncidents.map((inc: any) => (
                <div
                  key={inc.id}
                  className="glass-panel"
                  style={{ padding: '1.25rem 1.5rem', borderRadius: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                      {inc.monitorName} Incident Resolved
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(16,185,129,0.12)',
                        color: '#10b981',
                      }}
                    >
                      Resolved
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Root Cause: {inc.cause || 'Service unavailable'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                    <span>Occurred: {format(new Date(inc.startedAt), 'MMM dd, yyyy HH:mm')}</span>
                    {inc.durationMinutes !== null && <span>Duration: {inc.durationMinutes} min</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer
          style={{
            textAlign: 'center',
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} color="#6366f1" />
            <span>
              Powered by <strong style={{ color: 'var(--text-primary)' }}>UptimePulse</strong> Enterprise Monitoring
            </span>
          </div>
          <div>All telemetry sampled with sub-second precision.</div>
        </footer>
      </div>
    </div>
  );
};
