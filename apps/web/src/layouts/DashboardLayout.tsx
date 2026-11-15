import React, { createContext, useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  MessageSquare,
  FileText,
  Clock,
  Reply,
  PhoneCall,
  Headphones,
  UserX,
  ShieldCheck,
  CheckCircle2,
  Server,
  Smartphone,
  Share2,
  FlaskConical,
  BarChart3,
  Building2,
  UserCog,
  FileSearch,
  Settings,
  PlayCircle,
  Presentation,
  Layers,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest, clearAuthSession, getStoredUser, AuthSessionUser } from '../services/api';

interface HospitalFilterContextType {
  selectedHospitalId: string;
  setSelectedHospitalId: (id: string) => void;
  hospitals: any[];
  user: AuthSessionUser | null;
  operatingMode: 'DEMO' | 'PRODUCTION';
}

export const HospitalFilterContext = createContext<HospitalFilterContextType>({
  selectedHospitalId: 'ALL',
  setSelectedHospitalId: () => {},
  hospitals: [],
  user: null,
  operatingMode: 'DEMO',
});

export const useHospitalFilter = () => useContext(HospitalFilterContext);

export const DashboardLayout: React.FC<{
  children?: React.ReactNode;
  selectedHospitalId?: string;
  onSelectHospital?: (id: string) => void;
  user?: AuthSessionUser | null;
}> = ({ children }) => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    user?.hospitalId || 'ALL'
  );

  const { data: hospitalsRes } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => apiRequest('/hospitals'),
  });

  const { data: healthRes } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest('/settings/health'),
    refetchInterval: 15000,
  });

  const hospitals = hospitalsRes?.data || [];
  const operatingMode = healthRes?.operatingMode || 'DEMO';

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    sessionStorage.setItem('anhvl_explicit_logout', 'true');
    clearAuthSession();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'Core Operations',
      items: [
        { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
        { to: '/appointments', label: 'Appointment Management', icon: CalendarCheck },
        { to: '/patients', label: 'Patient Profiles (Restricted)', icon: Users },
        { to: '/attendance', label: 'Attendance Reconciliation', icon: CheckCircle2 },
        { to: '/no-shows', label: 'No-Show & Rebooking', icon: UserX },
      ],
    },
    {
      title: 'WhatsApp & Orchestration',
      items: [
        { to: '/messages', label: 'WhatsApp Comm Centre', icon: MessageSquare },
        { to: '/templates', label: 'Template Management', icon: FileText },
        { to: '/scheduler', label: 'Reminder Scheduler', icon: Clock },
        { to: '/responses', label: 'Patient Responses', icon: Reply },
        { to: '/consent', label: 'Consent & Opt-Out (STOP)', icon: ShieldCheck },
      ],
    },
    {
      title: 'Call-Centre & Altruist',
      items: [
        { to: '/followups', label: 'Follow-Up Worklist', icon: PhoneCall },
        { to: '/agents', label: 'Agent Management', icon: Headphones },
      ],
    },
    {
      title: 'Integrations & Pilot',
      items: [
        { to: '/integrations/his', label: 'HIS Integration Monitor', icon: Server },
        { to: '/integrations/whatsapp', label: 'WhatsApp Cloud Settings', icon: Smartphone },
        { to: '/integrations/altruist', label: 'Altruist Settings', icon: Share2 },
        { to: '/pilot', label: 'Pilot / Control Group', icon: FlaskConical },
        { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Governance & Architecture',
      items: [
        { to: '/hospitals', label: 'Hospital Configuration', icon: Building2 },
        { to: '/users', label: 'User & Role Management', icon: UserCog },
        { to: '/audit-logs', label: 'Security Audit Logs', icon: FileSearch },
        { to: '/settings', label: 'System Settings', icon: Settings },
        { to: '/architecture', label: 'Technology Architecture', icon: Layers },
      ],
    },
    {
      title: 'Simulator & Client Showcase',
      items: [
        { to: '/simulator', label: 'Live Demo Simulator', icon: PlayCircle },
        { to: '/presentation', label: 'Client Presentation Mode', icon: Presentation },
      ],
    },
  ];

  return (
    <HospitalFilterContext.Provider
      value={{
        selectedHospitalId: user?.hospitalId || selectedHospitalId,
        setSelectedHospitalId,
        hospitals,
        user,
        operatingMode,
      }}
    >
      <div className="min-h-screen flex bg-slate-50 text-slate-900">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-sm shadow">
                AN
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white">
                  ANHVL Engagement
                </div>
                <div className="text-[11px] text-teal-400 font-medium">
                  Neotia Bhagirathi • Plan D Media
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
            {navSections.map((section) => (
              <div key={section.title}>
                <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-800 bg-slate-950/60">
            <div className="text-xs font-medium text-white truncate">
              {user?.fullName || 'User'}
            </div>
            <div className="text-[11px] text-teal-400 truncate">
              {user?.roleName} ({user?.roleCode})
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-red-900/70 text-slate-200 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Operational Header & Mode Banner */}
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              {operatingMode === 'DEMO' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  DEMO MODE — ISOLATED SYNTHETIC DATA (NO LIVE PATIENT MESSAGES)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  PRODUCTION MODE — VERIFIED META & HIS INTEGRATIONS
                </span>
              )}
              <span className="text-xs text-slate-500 hidden md:inline">
                DB: {healthRes?.database?.engine || 'PostgreSQL 16'} • Queue: {healthRes?.scheduler?.backend || 'Active'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600">
                Hospital Unit:
              </label>
              <select
                value={user?.hospitalId || selectedHospitalId}
                disabled={Boolean(user?.hospitalId)}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="text-xs font-medium border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {!user?.hospitalId && (
                  <option value="ALL">All ANHVL Hospitals (New Town & Raipur)</option>
                )}
                {hospitals.map((h: any) => (
                  <option key={h.id} value={h.id}>
                    {h.city} ({h.code})
                  </option>
                ))}
              </select>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </HospitalFilterContext.Provider>
  );
};

