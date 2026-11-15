import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest, setAuthSession } from '../services/api';

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
      setAuthSession(accessToken, refreshToken, user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Brand Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold mb-6">
              <ShieldCheck className="w-4 h-4" />
              ANHVL Healthcare Operations
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              WhatsApp Patient Engagement Platform
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Centralized appointment confirmation, multilingual reminders, patient response capture, Altruist call-centre handoff, and HIS attendance reconciliation for New Town (Kolkata) & Raipur.
            </p>
          </div>

          <div className="space-y-3 pt-8 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>New Town (Bengali / English) & Raipur (Hindi / English)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Non-Clinical Safeguard & Instant STOP Opt-Out</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Developed by Plan D Media for Neotia Bhagirathi / ANHVL</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Sign in to Operations Console
          </h2>
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
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In to Platform'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Synthetic UAT Account Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              UAT / Demonstration Role Accounts (Click to populate):
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
                  className={`text-left px-2.5 py-1.5 rounded border text-[11px] transition-colors ${
                    email === acc.email
                      ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate">{acc.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

