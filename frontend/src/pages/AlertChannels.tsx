import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Send, Bell, Mail, MessageCircle, Hash, Webhook } from 'lucide-react';
import { api } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';

const channelSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.literal('EMAIL'),
    email: z.string().email('Valid email required'),
    botToken: z.string().optional(),
    chatId: z.string().optional(),
    webhookUrl: z.string().optional(),
  }),
  z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.literal('TELEGRAM'),
    email: z.string().optional(),
    botToken: z.string().min(1, 'Bot token required'),
    chatId: z.string().min(1, 'Chat ID required'),
    webhookUrl: z.string().optional(),
  }),
  z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.literal('DISCORD'),
    email: z.string().optional(),
    botToken: z.string().optional(),
    chatId: z.string().optional(),
    webhookUrl: z.string().url('Valid Discord webhook URL required'),
  }),
  z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.literal('SLACK'),
    email: z.string().optional(),
    botToken: z.string().optional(),
    chatId: z.string().optional(),
    webhookUrl: z.string().url('Valid Slack webhook URL required'),
  }),
  z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.literal('WEBHOOK'),
    email: z.string().optional(),
    botToken: z.string().optional(),
    chatId: z.string().optional(),
    webhookUrl: z.string().url('Valid HTTP/HTTPS webhook URL required'),
  }),
]);

type ChannelFormData = z.infer<typeof channelSchema>;

export const AlertChannels: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {} });

  const { data: channels = [], isLoading } = useQuery<any[]>({
    queryKey: ['alertChannels'],
    queryFn: async () => (await api.get('/alert-channels')).data,
  });

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema) as any,
    defaultValues: { type: 'EMAIL', name: '' },
  });

  const selectedType = watch('type');

  const createMutation = useMutation({
    mutationFn: (data: ChannelFormData) =>
      api.post('/alert-channels', {
        name: data.name,
        type: data.type,
        config: {
          email: (data as any).email,
          botToken: (data as any).botToken,
          chatId: (data as any).chatId,
          webhookUrl: (data as any).webhookUrl,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertChannels'] });
      reset();
      setShowForm(false);
      success('Alert channel created successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to create channel');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/alert-channels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertChannels'] });
      success('Alert channel deleted');
    },
    onError: () => error('Failed to delete channel'),
  });

  const handleTestAlert = async (id: string) => {
    setTestingId(id);
    setTestMessage(null);
    try {
      const res = await api.post(`/alert-channels/${id}/test`);
      setTestMessage({ id, msg: res.data.message || 'Test alert dispatched!', ok: true });
      success('Test alert dispatched!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to dispatch test notification.';
      setTestMessage({ id, msg, ok: false });
      error(msg);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = (ch: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Alert Channel?',
      message: `Remove the channel "${ch.name}"? Monitors using this channel will stop receiving alerts from it.`,
      action: () => { deleteMutation.mutate(ch.id); setConfirmModal(p => ({ ...p, isOpen: false })); },
    });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <Mail size={22} />;
      case 'TELEGRAM':
        return <MessageCircle size={22} />;
      case 'DISCORD':
        return <MessageCircle size={22} />;
      case 'SLACK':
        return <Hash size={22} />;
      case 'WEBHOOK':
      default:
        return <Webhook size={22} />;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return { bg: 'rgba(99,102,241,0.15)', text: '#6366f1' };
      case 'TELEGRAM':
        return { bg: 'rgba(14,165,233,0.15)', text: '#0ea5e9' };
      case 'DISCORD':
        return { bg: 'rgba(88,101,242,0.15)', text: '#5865F2' };
      case 'SLACK':
        return { bg: 'rgba(234,179,8,0.15)', text: '#eab308' };
      case 'WEBHOOK':
      default:
        return { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Alert Channels</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Multi-channel notifications via Email, Telegram, Discord, Slack, and HTTP Webhooks
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={18} /> Add Channel
        </button>
      </div>

      {/* Add Channel Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>New Alert Channel</h3>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d as any))}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Channel Name *</label>
                <input type="text" className="form-input" placeholder="e.g. Production DevOps Team" {...register('name')} />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Channel Type *</label>
                <select className="form-select" {...register('type')}>
                  <option value="EMAIL">📧 Email (SMTP)</option>
                  <option value="TELEGRAM">✈️ Telegram Bot</option>
                  <option value="DISCORD">💬 Discord Webhook</option>
                  <option value="SLACK">#️⃣ Slack Incoming Webhook</option>
                  <option value="WEBHOOK">🔗 Custom HTTP Webhook</option>
                </select>
              </div>
            </div>

            {selectedType === 'EMAIL' && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" placeholder="alerts@mycompany.com" {...register('email' as any)} />
                {(errors as any).email && <span className="form-error">{(errors as any).email?.message}</span>}
              </div>
            )}

            {selectedType === 'TELEGRAM' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Bot Token *</label>
                  <input type="text" className="form-input" placeholder="123456789:ABCDEF..." {...register('botToken' as any)} />
                  {(errors as any).botToken && <span className="form-error">{(errors as any).botToken?.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Chat ID *</label>
                  <input type="text" className="form-input" placeholder="-100123456789" {...register('chatId' as any)} />
                  {(errors as any).chatId && <span className="form-error">{(errors as any).chatId?.message}</span>}
                </div>
              </div>
            )}

            {['DISCORD', 'SLACK', 'WEBHOOK'].includes(selectedType) && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  {selectedType === 'DISCORD' ? 'Discord Webhook URL *' : selectedType === 'SLACK' ? 'Slack Webhook URL *' : 'Payload URL *'}
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder={
                    selectedType === 'DISCORD'
                      ? 'https://discord.com/api/webhooks/...'
                      : selectedType === 'SLACK'
                      ? 'https://hooks.slack.com/services/...'
                      : 'https://api.mycompany.com/webhooks/uptime'
                  }
                  {...register('webhookUrl' as any)}
                />
                {(errors as any).webhookUrl && <span className="form-error">{(errors as any).webhookUrl?.message}</span>}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Channel'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); reset(); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Channels List */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading channels...</div>
      ) : channels.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>No Alert Channels Configured</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Add an Email, Telegram, Discord, Slack, or Webhook channel to receive instant outage alerts.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {channels.map((ch: any) => {
            const colors = getChannelColor(ch.type);
            return (
              <div key={ch.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: colors.bg,
                    color: colors.text,
                    flexShrink: 0,
                    display: 'flex',
                  }}
                >
                  {getChannelIcon(ch.type)}
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{ch.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Type: <strong style={{ color: colors.text }}>{ch.type}</strong>
                    {ch.type === 'EMAIL' && ch.config?.email && ` · ${ch.config.email}`}
                    {ch.type === 'TELEGRAM' && ch.config?.chatId && ` · Chat ID: ${ch.config.chatId}`}
                    {['DISCORD', 'SLACK', 'WEBHOOK'].includes(ch.type) && ch.config?.webhookUrl && (
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {' · '}{ch.config.webhookUrl.slice(0, 40)}...
                      </span>
                    )}
                  </div>
                  {testMessage && testMessage.id === ch.id && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: testMessage.ok ? '#10b981' : '#ef4444' }}>
                      {testMessage.msg}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleTestAlert(ch.id)}
                    disabled={testingId === ch.id}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send size={14} /> {testingId === ch.id ? 'Sending...' : 'Test Alert'}
                  </button>
                  <button onClick={() => handleDelete(ch)} className="btn btn-danger" style={{ padding: '0.5rem 0.65rem' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};
