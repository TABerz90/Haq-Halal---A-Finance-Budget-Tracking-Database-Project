// src/pages/Auth.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Shared Auth Card ─────────────────────────────────────────────────────────
function AuthCard({ children, title, subtitle }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-700) 60%, var(--green-500) 100%)',
    }}>
      {/* Left panel – branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        color: '#fff', maxWidth: 480,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.14em', opacity: 0.5, marginBottom: 24 }}>
          ISLAMIC FINANCE TRACKER
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, marginBottom: 20 }}>
          Haq<br />Halal
        </h1>
        <p style={{ fontSize: 15, opacity: 0.65, lineHeight: 1.7, maxWidth: 320 }}>
          Track your finances the halal way. Stay within your budgets, understand your spending, and build better financial habits.
        </p>
        <div style={{ marginTop: 48, display: 'flex', gap: 20 }}>
          {['Multi-Account', 'Budget Alerts', 'Analytics'].map(f => (
            <div key={f} style={{ fontSize: 12, opacity: 0.5, letterSpacing: '0.05em' }}>✓ {f}</div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
        borderRadius: '32px 0 0 32px',
        padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, marginBottom: 6 }}>{title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login Page ───────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className="input-field" type="email" name="email" value={form.email} onChange={handle} required placeholder="you@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input-field" type="password" name="password" value={form.password} onChange={handle} required placeholder="••••••••" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6, justifyContent: 'center', padding: '11px' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Create one</Link>
      </p>
    </AuthCard>
  );
}

// ── Register Page ────────────────────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]     = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.full_name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard title="Create account" subtitle="Start managing your finances the halal way">
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Full name</label>
          <input className="input-field" name="full_name" value={form.full_name} onChange={handle} required placeholder="Muhammad Ali" />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="input-field" name="username" value={form.username} onChange={handle} required placeholder="mali" />
        </div>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className="input-field" type="email" name="email" value={form.email} onChange={handle} required placeholder="you@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input-field" type="password" name="password" value={form.password} onChange={handle} required placeholder="At least 6 characters" minLength={6} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6, justifyContent: 'center', padding: '11px' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
      </p>
    </AuthCard>
  );
}
