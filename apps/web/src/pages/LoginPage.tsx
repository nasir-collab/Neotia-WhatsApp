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
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-[0_20px_60px_rgba(7,42,77,0.08)] overflow-hidden border border-[#EAE6DF]">
        {/* Left Luxury Editorial Brand Column */}
        <div className="lg:col-span-5 bg-white p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EAE6DF] relative">
          <div className="absolute top-0 left-0 right-0 h-[3px] flex">
            <div className="w-[38%] bg-[#F39200]" />
            <div className="flex-1 bg-[#0B4F8A]" />
          </div>

          <div>
            {/* Extra-Large, Unclipped, Ultra-Prominent Official Logo */}
            <div className="mb-8 pt-2">
              <NeotiaBrandLogo size="xl" showTaglineBadge />
            </div>

            <h1 className="font-editorial text-3xl font-semibold text-[#072A4D] leading-snug mb-3">
              Patient Engagement &amp; OPD Suite
            </h1>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Centralized WhatsApp appointment confirmation, multilingual reminders, Altruist care-desk handoff, and HIS attendance reconciliation for New Town (Kolkata) &amp; Raipur.
            </p>
          </div>

          <div className="space-y-3 pt-8 mt-8 border-t border-[#F2EFEA] text-xs text-[#526277]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#0B4F8A] shrink-0" />
              <span>Bengali &amp; English (New Town) · Hindi &amp; English (Raipur)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#0B4F8A] shrink-0" />
              <span>Strict Non-Clinical Boundary &amp; Instant STOP Opt-Out</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E68A00] shrink-0" />
              <span>Crafted by Plan D Media for Ambuja Neotia Healthcare</span>
            </div>
          </div>
        </div>

        {/* Right Sign-In Column */}
        <div className="lg:col-span-7 p-10 bg-[#FAF9F6]/60">
          <h2 className="font-editorial text-2xl font-semibold text-[#072A4D] mb-1">
            Sign in to Operations Console
          </h2>
          <p className="text-xs text-[#64748B] mb-7">
            Role-based access control and hospital-unit scoping enforced via JWT authentication.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#64748B] mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A0B2] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E2DDD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]/15 focus:border-[#0B4F8A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#64748B] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A0B2] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E2DDD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]/15 focus:border-[#0B4F8A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-[#072A4D] hover:bg-[#0B4F8A] text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>{loading ? 'Signing in...' : 'Enter Neotia Bhagirathi Console'}</span>
              <ArrowRight className="w-4 h-4 text-[#F39200]" />
            </button>
          </form>

          {/* UAT Role Switcher */}
          <div className="mt-8 pt-6 border-t border-[#EAE6DF]">
            <div className="text-[10px] font-semibold text-[#8A94A6] uppercase tracking-[0.14em] mb-3">
              UAT &amp; Executive Role Switcher (Password: AnhvlDemo@2026)
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
                  className={`text-left px-3.5 py-2.5 rounded-xl border text-xs transition ${
                    email === acc.email
                      ? 'border-[#0B4F8A] bg-[#F0F6FC] text-[#072A4D] font-semibold shadow-sm'
                      : 'border-[#EAE6DF] bg-white hover:border-[#CBD5E1] text-[#526277]'
                  }`}
                >
                  <div className="truncate">{acc.label}</div>
                  <div className="text-[10px] text-[#8A94A6] truncate mt-0.5">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
