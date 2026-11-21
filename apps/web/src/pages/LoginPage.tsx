import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest, setAuthSession } from '../services/api';
import { NeotiaBrandLogo } from '../components/NeotiaBrandLogo';

const DEMO_ACCOUNTS = [
  { label: 'Super Administrator (All Hospitals)', email: 'superadmin@anhvl-demo.in', role: 'SUPER_ADMIN' },
  { label: 'Hospital Admin — New Town, Kolkata', email: 'admin.newtown@anhvl-demo.in', role: 'HOSPITAL_ADMIN' },
  { label: 'Hospital Admin — Raipur', email: 'admin.raipur@anhvl-demo.in', role: 'HOSPITAL_ADMIN' },
  { label: 'Operations Manager (Group)', email: 'ops.manager@anhvl-demo.in', role: 'OPS_MANAGER' },
  { label: 'Operations Executive — New Town', email: 'ops.exec@anhvl-demo.in', role: 'OPS_EXECUTIVE' },
  { label: 'Call-Centre Agent — Kolkata (BN/EN)', email: 'agent.kolkata@altruist-demo.in', role: 'CALL_CENTRE_AGENT' },
  { label: 'Call-Centre Agent — Raipur (HI/EN)', email: 'agent.raipur@altruist-demo.in', role: 'CALL_CENTRE_AGENT' },
  { label: 'Management Viewer (Read-Only)', email: 'management@anhvl-demo.in', role: 'MANAGEMENT_VIEWER' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('superadmin@anhvl-demo.in');
  const [password, setPassword] = useState('AnhvlDemo@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const { accessToken, refreshToken, user } = res.data;
      sessionStorage.removeItem('anhvl_explicit_logout');
      localStorage.removeItem('anhvl_explicit_logout');
      setAuthSession(accessToken, refreshToken, user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden border border-slate-200/90">
        {/* Left Editorial Brand Column — Clean Pure White Canvas so Logo Shines */}
        <div className="lg:col-span-5 bg-white p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 relative">
          <div className="absolute top-0 left-0 right-0 h-1 flex">
            <div className="w-[38%] bg-[#F39200]" />
            <div className="flex-1 bg-[#0B4F8A]" />
          </div>

          <div>
            {/* Extra-Large, Unclipped, Ultra-Prominent Official Logo */}
            <div className="mb-8 pt-2">
              <NeotiaBrandLogo size="xl" showTaglineBadge />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug mb-3">
              WhatsApp Patient Engagement Console
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Centralized OPD appointment confirmation, multilingual reminders, Altruist call-centre handoff, and HIS attendance reconciliation for New Town (Kolkata) &amp; Raipur.
            </p>
          </div>

          <div className="space-y-2.5 pt-8 mt-8 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#0B4F8A] shrink-0" />
              <span>Bengali &amp; English (New Town) · Hindi &amp; English (Raipur)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#0B4F8A] shrink-0" />
              <span>Non-Clinical Safeguard &amp; Instant STOP Opt-Out</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#F39200] shrink-0" />
              <span>Solution Partner: Plan D Media</span>
            </div>
          </div>
        </div>

        {/* Right Sign-In Column */}
        <div className="lg:col-span-7 p-9 bg-slate-50/40">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Sign in to Operations Console
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Role-based access control and hospital-unit scoping enforced by backend JWT guard.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]/20 focus:border-[#0B4F8A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]/20 focus:border-[#0B4F8A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#0B4F8A] hover:bg-[#073966] text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* UAT Role Switcher */}
          <div className="mt-7 pt-5 border-t border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Quick UAT Role Select (Password: AnhvlDemo@2026)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('AnhvlDemo@2026');
                  }}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                    email === acc.email
                      ? 'border-[#0B4F8A] bg-[#EFF6FC] text-[#0B4F8A] font-semibold'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="truncate">{acc.label}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
