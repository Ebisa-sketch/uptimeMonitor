import React from 'react';
import { CheckCircle2, AlertTriangle, PauseCircle, HelpCircle } from 'lucide-react';

export type MonitorStatus = 'UP' | 'DOWN' | 'PAUSED' | 'UNKNOWN';

interface StatusBadgeProps {
  status: MonitorStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toUpperCase() as MonitorStatus;

  const renderIcon = () => {
    switch (normalized) {
      case 'UP':
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'DOWN':
        return <AlertTriangle size={14} className="text-red-500" />;
      case 'PAUSED':
        return <PauseCircle size={14} className="text-gray-400" />;
      default:
        return <HelpCircle size={14} className="text-gray-400" />;
    }
  };

  return (
    <span className={`status-badge ${normalized.toLowerCase()}`}>
      <span className="pulse-dot" />
      {renderIcon()}
      <span>{normalized}</span>
    </span>
  );
};
