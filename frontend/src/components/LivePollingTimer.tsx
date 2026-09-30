import React, { useState, useEffect } from 'react';
import { RefreshCw, Radio } from 'lucide-react';

interface LivePollingTimerProps {
  onRefresh: () => void;
  isFetching?: boolean;
  intervalSec?: number;
}

export const LivePollingTimer: React.FC<LivePollingTimerProps> = ({
  onRefresh,
  isFetching = false,
  intervalSec = 30,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(intervalSec);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRefresh();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSec, onRefresh]);

  const handleManualSync = () => {
    setSecondsLeft(intervalSec);
    onRefresh();
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.4rem 0.85rem',
        borderRadius: '999px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border-color)',
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isFetching ? '#f59e0b' : '#10b981',
            boxShadow: `0 0 6px ${isFetching ? '#f59e0b' : '#10b981'}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '14px',
            height: '14px',
            left: '-3px',
            borderRadius: '50%',
            border: `1px solid ${isFetching ? '#f59e0b' : '#10b981'}`,
            animation: 'pulse 1.8s infinite',
            opacity: 0.6,
          }}
        />
      </div>

      <span>
        {isFetching ? 'Updating...' : `Syncing in ${secondsLeft}s`}
      </span>

      <button
        onClick={handleManualSync}
        disabled={isFetching}
        title="Sync immediately"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <RefreshCw size={13} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
      </button>
    </div>
  );
};
