import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Zap, CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw, X, ChevronDown, ChevronRight } from 'lucide-react';

interface QuickProbeModalProps {
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickProbeModal: React.FC<QuickProbeModalProps> = ({
  monitorId,
  monitorName,
  monitorUrl,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [showHeaders, setShowHeaders] = useState(false);

  const {
    mutate: runProbe,
    data: probeResult,
    isPending,
    error,
  } = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/monitors/${monitorId}/check-now`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', monitorId] });
      queryClient.invalidateQueries({ queryKey: ['checks', monitorId] });
      queryClient.invalidateQueries({ queryKey: ['uptimeBars', monitorId] });
    },
  });

  // Automatically trigger probe when modal opens
  React.useEffect(() => {
    if (isOpen) {
      runProbe();
    }
  }, [isOpen, monitorId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Instant Live Probe</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{monitorName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              wordBreak: 'break-all',
            }}
          >
            Target: {monitorUrl}
          </div>

          {isPending ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <RefreshCw
                size={36}
                style={{
                  color: 'var(--accent-primary)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <div style={{ fontWeight: 600 }}>Executing live HTTP check...</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Measuring latency & response payload
              </div>
            </div>
          ) : error ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                color: '#fca5a5',
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={18} /> Probe Execution Failed
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{(error as any)?.message}</div>
            </div>
          ) : probeResult ? (
            <div>
              {/* Status Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: probeResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${probeResult.success ? '#10b981' : '#ef4444'}40`,
                  marginBottom: '1.25rem',
                }}
              >
                {probeResult.success ? (
                  <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                ) : (
                  <XCircle size={24} style={{ color: '#ef4444' }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, color: probeResult.success ? '#10b981' : '#ef4444', fontSize: '1rem' }}>
                    {probeResult.success ? 'ENDPOINT HEALTHY (UP)' : 'CHECK FAILED (DOWN)'}
                  </div>
                  {probeResult.error && (
                    <div style={{ fontSize: '0.8125rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                      {probeResult.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS CODE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>
                    {probeResult.statusCode || 'N/A'}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LATENCY</div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      marginTop: '0.2rem',
                      color: probeResult.responseMs < 300 ? '#10b981' : probeResult.responseMs < 800 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {probeResult.responseMs}ms
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SSL STATUS</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {probeResult.sslInfo?.valid ? `${probeResult.sslInfo.daysRemaining}d Left` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Response Headers Collapsible */}
              {probeResult.responseHeaders && Object.keys(probeResult.responseHeaders).length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => setShowHeaders(!showHeaders)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {showHeaders ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {showHeaders ? 'Hide Response Headers' : `Inspect Response Headers (${Object.keys(probeResult.responseHeaders).length})`}
                  </button>

                  {showHeaders && (
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {Object.entries(probeResult.responseHeaders).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: '#93c5fd', fontWeight: 600 }}>{k}:</span>
                          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={() => runProbe()}
            disabled={isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} style={{ animation: isPending ? 'spin 1s linear infinite' : 'none' }} />
            Probe Again
          </button>
        </div>
      </div>
    </div>
  );
};
