import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Save, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  timezone: z.string(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
}).refine((d) => !d.newPassword || (d.newPassword && d.currentPassword), {
  message: 'Current password is required to set a new password',
  path: ['currentPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const { success, error } = useToast();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      timezone: user?.timezone || 'UTC',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.patch('/me', data),
    onSuccess: (res) => {
      setUser(res.data);
      setSaveMsg({ ok: true, msg: 'Profile updated successfully!' });
      success('Profile updated successfully!');
      reset({ ...res.data, currentPassword: '', newPassword: '' });
      setTimeout(() => setSaveMsg(null), 3000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Update failed.';
      setSaveMsg({ ok: false, msg });
      error(msg);
    },
  });

  const timezones = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
  ];

  return (
    <div style={{ maxWidth: '580px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Manage your profile and account preferences</p>
      </div>

      {saveMsg && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: saveMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${saveMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: saveMsg.ok ? '#10b981' : '#ef4444',
          marginBottom: '1.5rem',
        }}>
          {saveMsg.ok && <CheckCircle2 size={18} />}
          {saveMsg.msg}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))}>
        {/* Profile Section */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
              <User size={22} />
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Profile Information</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" {...register('name')} />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" {...register('email')} />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Timezone (used for dashboard time display)</label>
            <select className="form-select" {...register('timezone')}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Password Section */}
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Change Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Leave blank if you don't want to change your password.
          </p>

          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input" placeholder="Enter current password" {...register('currentPassword')} />
            {errors.currentPassword && <span className="form-error">{errors.currentPassword.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" placeholder="Minimum 6 characters" {...register('newPassword')} />
            {errors.newPassword && <span className="form-error">{errors.newPassword.message}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
