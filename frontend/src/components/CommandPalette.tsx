import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Search, Activity, Plus, Bell, AlertTriangle, Settings, Globe, Moon, Sun, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch monitors for quick jumping
  const { data: monitors = [] } = useQuery<any[]>({
    queryKey: ['monitorsListQuick'],
    queryFn: async () => (await api.get('/monitors')).data,
    enabled: isOpen,
  });

  // Navigation actions
  const staticActions = [
    { id: 'new-monitor', title: 'Create New Monitor', subtitle: 'Set up a new HTTP health check', icon: Plus, action: () => navigate('/monitors/new') },
    { id: 'dashboard', title: 'Dashboard', subtitle: 'View all monitors & global metrics', icon: Activity, action: () => navigate('/dashboard') },
    { id: 'alerts', title: 'Alert Channels', subtitle: 'Configure Email, Telegram, Slack, Discord', icon: Bell, action: () => navigate('/alerts') },
    { id: 'incidents', title: 'Incidents History', subtitle: 'View past outages and resolution logs', icon: AlertTriangle, action: () => navigate('/incidents') },
    { id: 'status-page', title: 'Public Status Page', subtitle: 'View public status breakdown', icon: Globe, action: () => navigate('/status/default') },
    { id: 'settings', title: 'Settings', subtitle: 'Manage profile and preferences', icon: Settings, action: () => navigate('/settings') },
    { id: 'toggle-theme', title: `Toggle Theme (${theme === 'dark' ? 'Light Mode' : 'Dark Mode'})`, subtitle: 'Switch color appearance', icon: theme === 'dark' ? Sun : Moon, action: () => toggleTheme() },
  ];

  // Filter monitors matching query
  const monitorActions = monitors
    .filter((m: any) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.url.toLowerCase().includes(query.toLowerCase())
    )
    .map((m: any) => ({
      id: `monitor-${m.id}`,
      title: m.name,
      subtitle: `${m.method} • ${m.url}`,
      icon: Activity,
      action: () => navigate(`/monitors/${m.id}`),
    }));

  const filteredActions = query
    ? [...monitorActions, ...staticActions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase()))]
    : [...staticActions, ...monitorActions.slice(0, 5)];

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % (filteredActions.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 99999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          overflow: 'hidden',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.15rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <Search size={20} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search monitors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.05rem',
              outline: 'none',
            }}
          />
          <div
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC to close
          </div>
        </div>

        {/* Action List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredActions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No commands or monitors found for "{query}"
            </div>
          ) : (
            filteredActions.map((action, i) => {
              const Icon = action.icon;
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    action.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        padding: '0.4rem',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        display: 'flex',
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                        {action.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.subtitle}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                      <span>Jump</span>
                      <CornerDownLeft size={13} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div
          style={{
            padding: '0.6rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Uptime & API Monitor Pro</span>
        </div>
      </div>
    </div>
  );
};
