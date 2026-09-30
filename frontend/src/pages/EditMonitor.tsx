import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Globe } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

const monitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL (e.g. https://example.com)'),
  method: z.enum(['GET', 'POST', 'HEAD']),
  intervalSec: z.coerce.number().refine((v) => [60, 300, 900].includes(v), {
    message: 'Must be 1m, 5m, or 15m',
  }),
  timeoutSec: z.coerce.number().min(5).max(30),
  expectedStatus: z.coerce.number().min(100).max(599),
  keyword: z.string().optional().default(''),
  body: z.string().optional().default(''),
  failureThreshold: z.coerce.number().min(1).max(10),
  isPublic: z.boolean().default(false),
  alertChannelIds: z.array(z.string()).default([]),
});

type MonitorFormData = z.infer<typeof monitorSchema>;

export const EditMonitor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: monitor, isLoading: isMonitorLoading } = useQuery({
    queryKey: ['monitor', id],
    queryFn: async () => (await api.get(`/monitors/${id}`)).data,
    enabled: !!id,
  });

  const { data: alertChannels = [] } = useQuery<any[]>({
    queryKey: ['alertChannels'],
    queryFn: async () => (await api.get('/alert-channels')).data,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MonitorFormData>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      name: '',
      url: '',
      method: 'GET',
      intervalSec: 300,
      timeoutSec: 10,
      expectedStatus: 200,
      keyword: '',
      body: '',
      failureThreshold: 2,
      isPublic: false,
      alertChannelIds: [],
    },
  });

  useEffect(() => {
    if (monitor) {
      reset({
        name: monitor.name || '',
        url: monitor.url || '',
        method: monitor.method || 'GET',
        intervalSec: monitor.intervalSec || 300,
        timeoutSec: monitor.timeoutSec || 10,
        expectedStatus: monitor.expectedStatus || 200,
        keyword: monitor.keyword || '',
        body: monitor.body || '',
        failureThreshold: monitor.failureThreshold || 2,
        isPublic: monitor.isPublic || false,
        alertChannelIds: monitor.alertChannels ? monitor.alertChannels.map((c: any) => c.id) : [],
      });
    }
  }, [monitor, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: MonitorFormData) => api.patch(`/monitors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
      success('Monitor updated successfully');
      navigate(`/monitors/${id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update monitor.';
      setServerError(msg);
      error(msg);
    },
  });

  const onSubmit = (data: MonitorFormData) => {
    setServerError(null);
    updateMutation.mutate(data);
  };

  if (isMonitorLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Loading monitor configuration...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Edit Monitor</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Update configuration for {monitor?.name || 'this endpoint'}
          </p>
        </div>
      </div>

      {serverError && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Settings */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            BASIC SETTINGS
          </h2>

          <div className="form-group">
            <label className="form-label">Monitor Name *</label>
            <input type="text" className="form-input" placeholder="My Production API" {...register('name')} />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">URL to Monitor *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://api.example.com/health"
                  {...register('url')}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Globe
                  size={18}
                  style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
              </div>
              {errors.url && <span className="form-error">{errors.url.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">HTTP Method</label>
              <select className="form-select" {...register('method')}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timing Settings */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            CHECK TIMING
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Check Interval</label>
              <select className="form-select" {...register('intervalSec')}>
                <option value={60}>Every 1 minute</option>
                <option value={300}>Every 5 minutes</option>
                <option value={900}>Every 15 minutes</option>
              </select>
              {errors.intervalSec && <span className="form-error">{errors.intervalSec.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Timeout (sec)</label>
              <input type="number" className="form-input" min={5} max={30} {...register('timeoutSec')} />
              {errors.timeoutSec && <span className="form-error">{errors.timeoutSec.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Expected Status Code</label>
              <input type="number" className="form-input" min={100} max={599} {...register('expectedStatus')} />
              {errors.expectedStatus && <span className="form-error">{errors.expectedStatus.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Failure Threshold (consecutive failures before incident)</label>
            <input type="number" className="form-input" min={1} max={10} {...register('failureThreshold')} />
            {errors.failureThreshold && <span className="form-error">{errors.failureThreshold.message}</span>}
          </div>
        </div>

        {/* Optional Advanced Settings */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            ADVANCED (OPTIONAL)
          </h2>

          <div className="form-group">
            <label className="form-label">Keyword Assertion</label>
            <input
              type="text"
              className="form-input"
              placeholder="Text that must appear in the response body"
              {...register('keyword')}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              If set, the check only passes if this keyword is found in the response body.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Request Body (for POST)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder='{"key": "value"}'
              {...register('body')}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" {...register('isPublic')} style={{ width: '16px', height: '16px' }} />
              <span className="form-label" style={{ marginBottom: 0 }}>Show on public status page</span>
            </label>
          </div>
        </div>

        {/* Alert Channels */}
        {alertChannels.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
              ALERT CHANNELS
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alertChannels.map((ch: any) => (
                <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <Controller
                    name="alertChannelIds"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        value={ch.id}
                        checked={field.value.includes(ch.id)}
                        onChange={(e) => {
                          const newVal = e.target.checked
                            ? [...field.value, ch.id]
                            : field.value.filter((v: string) => v !== ch.id);
                          field.onChange(newVal);
                        }}
                        style={{ width: '16px', height: '16px' }}
                      />
                    )}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>
                    {ch.name}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      [{ch.type}]
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <Save size={18} />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
