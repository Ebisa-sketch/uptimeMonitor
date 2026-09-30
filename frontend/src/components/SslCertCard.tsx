import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ShieldCheck, ShieldAlert, Shield, Lock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SslCertCardProps {
  monitorId: string;
  isHttps: boolean;
}

export const SslCertCard: React.FC<SslCertCardProps> = ({ monitorId, isHttps }) => {
  const { data, isLoading } = useQuery<{
    isHttps: boolean;
    sslInfo: {
      valid: boolean;
      issuer?: string;
      subject?: string;
      validFrom?: string;
      validTo?: string;
      daysRemaining?: number;
      error?: string;
    } | null;
  }>({
    queryKey: ['sslCert', monitorId],
    queryFn: async () => {
      const res = await api.get(`/monitors/${monitorId}/ssl`);
      return res.data;
    },
    enabled: isHttps,
    staleTime: 300000, // 5 mins
  });

  if (!isHttps) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Shield size={24} style={{ color: 'var(--text-muted)' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>HTTP Only (No TLS)</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            This endpoint uses unencrypted HTTP. Consider upgrading to HTTPS.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Inspecting SSL/TLS certificate...
      </div>
    );
  }

  const ssl = data?.sslInfo;
  if (!ssl || !ssl.valid) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderLeft: '4px solid #ef4444',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <ShieldAlert size={28} style={{ color: '#ef4444', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>SSL Certificate Error</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {ssl?.error || 'Unable to establish secure TLS handshake with target host.'}
          </div>
        </div>
      </div>
    );
  }

  const days = ssl.daysRemaining ?? 0;
  const isExpiringSoon = days <= 14;
  const isWarning = days <= 30;

  const badgeColor = isExpiringSoon ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
  const badgeBg = isExpiringSoon
    ? 'rgba(239, 68, 68, 0.12)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(16, 185, 129, 0.12)';

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
            }}
          >
            <Lock size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>SSL / TLS Certificate</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Automated certificate validity check</p>
          </div>
        </div>

        <div
          style={{
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            background: badgeBg,
            border: `1px solid ${badgeColor}40`,
            color: badgeColor,
            fontSize: '0.8125rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <ShieldCheck size={14} />
          {days} days remaining
        </div>
      </div>

      {isExpiringSoon && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            marginBottom: '1rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span>
            <strong>Warning:</strong> Certificate expires in {days} days! Renew immediately to prevent downtime.
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          fontSize: '0.875rem',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ISSUER</div>
          <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{ssl.issuer || 'Unknown'}</div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>COMMON NAME (SUBJECT)</div>
          <div style={{ fontWeight: 600, marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
            {ssl.subject || 'Host'}
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>VALID TO (EXPIRY)</div>
          <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
            {ssl.validTo ? format(parseISO(ssl.validTo), 'MMM dd, yyyy HH:mm') : 'N/A'} UTC
          </div>
        </div>
      </div>
    </div>
  );
};
