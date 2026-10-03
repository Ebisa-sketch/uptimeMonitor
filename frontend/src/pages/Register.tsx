import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Globe,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  timezone: z.string().default('UTC'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-detect browser timezone
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      timezone: detectedTimezone,
    },
  });

  const passwordValue = watch('password', '');

  // Calculate password strength
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score: 0, label: '', color: 'transparent' };
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd) || /[A-Z]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#ef4444' };
      case 2:
        return { score: 2, label: 'Fair', color: '#f97316' };
      case 3:
        return { score: 3, label: 'Good', color: '#eab308' };
      case 4:
        return { score: 4, label: 'Strong', color: '#10b981' };
      default:
        return { score: 1, label: 'Weak', color: '#ef4444' };
    }
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerAuth(data.email, data.password, data.name, data.timezone);
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* LEFT HERO / SHOWCASE PANEL (Visible on desktop >= 900px) */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRight: '1px solid var(--border-color)',
          position: 'relative',
        }}
        className="login-showcase-panel"
      >
        {/* Subtle Ambient Glowing Orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-5%',
            left: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Branding */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
              }}
            >
              <Activity size={24} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                UptimePulse
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Enterprise Observability
              </span>
            </div>
          </div>
        </div>

        {/* Center Benefits List */}
        <div style={{ position: 'relative', zIndex: 2, margin: '2.5rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '99px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              fontSize: '0.8125rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
            }}
          >
            <Zap size={14} /> NO CREDIT CARD REQUIRED
          </div>

          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}
          >
            Start monitoring your endpoints in under 60 seconds.
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', maxWidth: '480px' }}>
            Get alerted before your customers notice outages. Set up multi-channel notifications and share public status pages.
          </p>

          {/* Feature Checklist Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '460px' }}>
            <div
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1.15rem',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Continuous HTTP & API Probes</div>
                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                  Sample status codes, response headers, and latency every 30s.
                </div>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1.15rem',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Multi-Channel Incident Alerts</div>
                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                  Instant webhooks, Slack, Discord, Telegram, and email dispatches.
                </div>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1.15rem',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(234, 179, 8, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#eab308',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>SSL Certificate Monitoring</div>
                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                  Automated TLS expiration tracking and certificate health audits.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Always free for small developers and open-source projects.
        </div>
      </div>

      {/* RIGHT REGISTRATION FORM PANEL */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5rem',
          maxWidth: '620px',
          margin: '0 auto',
          width: '100%',
          zIndex: 3,
        }}
      >
        {/* Top Header Utilities */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <Link
            to="/status"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Activity size={14} color="#10b981" /> Public Status <ExternalLink size={12} />
          </Link>

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
        </div>

        {/* Form Container */}
        <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2
              style={{
                fontSize: '1.875rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                marginBottom: '0.35rem',
              }}
            >
              Create Free Account
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Set up your uptime monitoring workspace in a few clicks.
            </p>
          </div>

          {serverError && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
              }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Full Name */}
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Alex Mercer"
                  {...register('name')}
                  style={{
                    paddingLeft: '2.6rem',
                    borderRadius: '10px',
                    height: '46px',
                    fontSize: '0.9375rem',
                  }}
                />
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
              {errors.name && (
                <span className="form-error" style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Email Address */}
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Work or Personal Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="alex@company.com"
                  {...register('email')}
                  style={{
                    paddingLeft: '2.6rem',
                    borderRadius: '10px',
                    height: '46px',
                    fontSize: '0.9375rem',
                  }}
                />
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
              {errors.email && (
                <span className="form-error" style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Create Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="At least 6 characters"
                  {...register('password')}
                  style={{
                    paddingLeft: '2.6rem',
                    paddingRight: '2.6rem',
                    borderRadius: '10px',
                    height: '46px',
                    fontSize: '0.9375rem',
                  }}
                />
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="form-error" style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Interactive Password Strength Indicator */}
            {passwordValue && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '0.4rem' }}>
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: '100%',
                        borderRadius: '2px',
                        background:
                          step <= strength.score ? strength.color : 'rgba(255, 255, 255, 0.1)',
                        transition: 'background-color 0.2s ease',
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Password strength:</span>
                  <span style={{ fontWeight: 700, color: strength.color }}>{strength.label}</span>
                </div>
              </div>
            )}

            {/* Timezone Note (Auto-detected) */}
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Globe size={13} />
              <span>
                Telemetry timezone auto-set to <strong>{detectedTimezone}</strong>
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <span>Creating workspace...</span>
              ) : (
                <>
                  <span>Get Started Free</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
            }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: '#6366f1',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Security Terms Note */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: '2rem',
          }}
        >
          By creating an account, you agree to our Terms of Service & Privacy Policy.
        </div>
      </div>
    </div>
  );
};
