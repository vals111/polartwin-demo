import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import { Compass, ShieldCheck, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('operator@polartwin.gov.in');
  const [password, setPassword] = useState('Operator@1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(email, password);
      login(data.access_token, {
        user_id: data.user_id,
        email: data.email,
        role: data.role
      });
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-[#02070f] flex flex-col justify-center items-center p-6 relative overflow-hidden font-ui text-slate-100">
      {/* Polar auroral backdrop glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-polar-border relative z-10 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-2 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-white mb-4 shadow-xl shadow-cyan-500/20">
            <img src="/logo.png" alt="POLARTWIN Logo" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">POLARTWIN</h1>
          <p className="text-xs text-slate-400 mt-1">
            Antarctic Research Station Digital Twin Platform
          </p>
          <div className="mt-2 inline-block text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            NCPOR • Ministry of Earth Sciences
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Station Access Identity (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-polar-darker/80 border border-polar-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              placeholder="operator@polartwin.gov.in"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Security Clearance Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-polar-darker/80 border border-polar-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating Session...</span>
            ) : (
              <>
                <span>Access Digital Twin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Preset quick login credentials for judges/evaluators */}
        <div className="mt-8 pt-6 border-t border-polar-border/60">
          <div className="text-[11px] text-slate-400 font-mono mb-2 text-center uppercase tracking-wider">
            Quick Persona Selector (Click to Fill)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickRole('admin@polartwin.gov.in', 'Admin@1234')}
              className="p-2 bg-polar-dark/80 hover:bg-polar-navy border border-polar-border rounded-lg text-center transition-colors"
            >
              <div className="text-xs font-bold text-white">Admin</div>
              <div className="text-[9px] font-mono text-purple-400">Full Access</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('operator@polartwin.gov.in', 'Operator@1234')}
              className="p-2 bg-polar-dark/80 hover:bg-polar-navy border border-polar-border rounded-lg text-center transition-colors"
            >
              <div className="text-xs font-bold text-cyan-300">Operator</div>
              <div className="text-[9px] font-mono text-cyan-400">What-If / Recs</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('viewer@polartwin.gov.in', 'Viewer@1234')}
              className="p-2 bg-polar-dark/80 hover:bg-polar-navy border border-polar-border rounded-lg text-center transition-colors"
            >
              <div className="text-xs font-bold text-slate-300">Viewer</div>
              <div className="text-[9px] font-mono text-emerald-400">Read-only</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
