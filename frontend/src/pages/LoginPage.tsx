import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('operator@polartwin.gov.in');
  const [password, setPassword] = useState('Operator@1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.removeItem('polartwin-theme');
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);
      login(data.access_token, { user_id: data.user_id, email: data.email, role: data.role });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'rgba(13, 35, 64, 0.6)',
    border: '1px solid rgba(30, 58, 95, 0.8)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#f0f6ff',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-6 font-ui"
      style={{ backgroundColor: '#030a12' }}
    >
      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8 relative"
        style={{
          backgroundColor: '#071322',
          border: '1px solid rgba(30, 58, 95, 0.8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex p-2.5 rounded-2xl mb-4"
            style={{ backgroundColor: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)' }}
          >
            <img src="/logo.png" alt="POLARTWIN Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide" style={{ color: '#f0f6ff' }}>
            POLARTWIN
          </h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            Antarctic Research Station Digital Twin Platform
          </p>
          <div
            className="mt-2.5 inline-block text-[11px] font-mono px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              color: '#22d3ee',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            NCPOR • Ministry of Earth Sciences
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            className="mb-4 p-3 rounded-xl text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
              style={{ color: '#94a3b8' }}
            >
              Station Access Identity (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="operator@polartwin.gov.in"
              onFocus={e => (e.target.style.borderColor = '#06b6d4')}
              onBlur={e => (e.target.style.borderColor = 'rgba(30, 58, 95, 0.8)')}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
              style={{ color: '#94a3b8' }}
            >
              Security Clearance Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="••••••••"
              onFocus={e => (e.target.style.borderColor = '#06b6d4')}
              onBlur={e => (e.target.style.borderColor = 'rgba(30, 58, 95, 0.8)')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            style={{
              background: 'linear-gradient(to right, #2563eb, #06b6d4)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
            }}
          >
            {loading ? (
              <span>Authenticating…</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Access Digital Twin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Role Selector */}
        <div className="mt-7 pt-6" style={{ borderTop: '1px solid rgba(30, 58, 95, 0.8)' }}>
          <div
            className="text-[11px] font-mono text-center uppercase tracking-widest mb-3"
            style={{ color: '#64748b' }}
          >
            Quick Persona Selector (Click to Fill)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Admin', badge: 'Full Access', badgeColor: '#c084fc', email: 'admin@polartwin.gov.in', pass: 'Admin@1234' },
              { label: 'Operator', badge: 'What-If / Recs', badgeColor: '#67e8f9', email: 'operator@polartwin.gov.in', pass: 'Operator@1234' },
              { label: 'Viewer', badge: 'Read-only', badgeColor: '#86efac', email: 'viewer@polartwin.gov.in', pass: 'Viewer@1234' },
            ].map(({ label, badge, badgeColor, email: e, pass }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleQuickRole(e, pass)}
                className="p-2.5 rounded-xl text-center cursor-pointer transition-all hover:border-cyan-500/50"
                style={{
                  backgroundColor: 'rgba(13, 35, 64, 0.6)',
                  border: '1px solid rgba(30, 58, 95, 0.8)',
                }}
              >
                <div className="text-xs font-bold" style={{ color: '#f0f6ff' }}>{label}</div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color: badgeColor }}>{badge}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
