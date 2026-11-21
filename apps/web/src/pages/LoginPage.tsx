import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest, setAuthSession } from '../services/api';
import { NeotiaBrandLogo, NeotiaCrossEmblem } from '../components/NeotiaBrandLogo';

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
    <div className="min-h-screen bg-gradient-to-br from-[#041A30] via-[#0B4F8A] to-[#062646] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/15">
        {/* Left Brand Panel in Bhagirathi Royal Blue & Neotia Orange */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#062646] via-[#0B4F8A] to-[#051E38] text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #F39200 0%, #F39200 45%, #0D68AF 45%, #38bdf8 100%)' }}
          />
          <div>
            {/* Official Uploaded Neotia Bhagirathi Logo */}
            <div className="mb-6">
              <NeotiaBrandLogo size="lg" showTaglineBadge />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F39200]/20 border border-[#F39200]/40 text-[#FFB74D] text-xs font-semibold mb-4">
              <ShieldCheck className="w-4 h-4 text-[#F39200]" />
              Woman & Child Care Operations
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3 text-white">
              WhatsApp Patient Engagement Platform
            </h1>
            <p className="text-sm text-sky-100/90 leading-relaxed">
              Centralized appointment confirmation, multilingual reminders, patient response capture, Altruist call-centre handoff, and HIS attendance reconciliation for New Town (Kolkata) & Raipur.
            </p>
          </div>

          <div className="space-y-3 pt-8 border-t border-white/15 text-xs text-sky-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F39200] shrink-0" />
              <span>New Town (Bengali / English) & Raipur (Hindi / English)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F39200] shrink-0" />
              <span>Non-Clinical Safeguard & Instant STOP Opt-Out</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F39200] shrink-0" />
              <span>Developed by Plan D Media for Neotia Bhagirathi / ANHVL</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-[#062646]">
              Sign in to Operations Console
            </h2>
            <NeotiaCrossEmblem className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Role-based access control and hospital-unit isolation enforced by backend JWT guard.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#0B4F8A] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#0B4F8A] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F39200] to-[#E07B00] hover:from-[#E07B00] hover:to-[#CC6E00] text-white font-bold text-sm rounded-lg shadow-md shadow-[#F39200]/25 flex items-center justify-center gap-2 transition-all"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Neotia Bhagirathi Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Role Switcher for Demo / UAT Evaluation */}
          <div className="mt-7 pt-5 border-t border-slate-200">
            <div className="text-xs font-bold text-[#0B4F8A] uppercase tracking-wider mb-2.5">
              Synthetic Demo & UAT Role Switcher (Password: AnhvlDemo@2026)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('AnhvlDemo@2026');
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${email === acc.email
                      ? 'border-[#F39200] bg-[#FFF4E5] text-[#062646] font-bold shadow-sm'
                      : 'border-slate-200 hover:bg-[#F4F8FC] text-slate-600'
                    }`}
                >
                  <div className="truncate">{acc.label}</div>
                  <div className="text-[10px] text-[#0B4F8A] truncate">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
