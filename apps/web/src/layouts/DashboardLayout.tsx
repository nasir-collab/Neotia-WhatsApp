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
import { NeotiaBrandLogo, NeotiaCrossEmblem } from '../components/NeotiaBrandLogo';

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
      <div className="min-h-screen flex bg-[#F4F8FC] text-slate-900">
        {/* Sidebar in Bhagirathi Deep Medical Blue (#062646 -> #093562) */}
        <aside className="w-64 bg-gradient-to-b from-[#062646] via-[#08315A] to-[#051E38] text-slate-100 flex flex-col shrink-0 border-r border-[#0D4A80]/50 shadow-xl">
          {/* Official Neotia Bhagirathi Logo Header */}
          <div className="p-4 border-b border-white/10 bg-[#041A30]/50 flex flex-col items-center">
            <NeotiaBrandLogo size="md" className="w-full items-center" />
            <div className="mt-2.5 w-full flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F39200]">
                Patient Engagement
              </span>
              <span className="text-[10px] font-medium text-sky-200/80">
                Plan D Media
              </span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
            {navSections.map((section) => (
              <div key={section.title}>
                <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300/70 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#F39200]" />
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
                          `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-[#F39200] to-[#E07B00] text-white font-semibold shadow-md shadow-[#F39200]/20'
                              : 'text-sky-100/85 hover:bg-[#0B4F8A]/60 hover:text-white'
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

          <div className="p-3.5 border-t border-white/10 bg-[#041A30]/80">
            <div className="flex items-center gap-2 mb-1">
              <NeotiaCrossEmblem className="w-4 h-4 shrink-0" />
              <div className="text-xs font-semibold text-white truncate">
                {user?.fullName || 'User'}
              </div>
            </div>
            <div className="text-[11px] text-[#F39200] font-medium truncate">
              {user?.roleName} ({user?.roleCode})
            </div>
            <button
              onClick={handleLogout}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B4F8A]/60 hover:bg-red-700 text-white border border-sky-400/20 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out / Switch Role
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Dual-Color Neotia Orange & Bhagirathi Blue Top Accent Bar */}
          <div
            className="h-1 w-full"
            style={{
              background: 'linear-gradient(90deg, #F39200 0%, #F39200 32%, #0D68AF 32%, #0B4F8A 100%)',
            }}
          />

          {/* Top Operational Header & Mode Banner */}
          <header className="bg-white border-b border-slate-200/90 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
              <NeotiaCrossEmblem className="w-6 h-6 hidden sm:block" />
              {operatingMode === 'DEMO' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF4E5] text-[#B86200] border border-[#F39200]/40">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F39200]" />
                  DEMO MODE — ISOLATED SYNTHETIC DATA (NO LIVE PATIENT MESSAGES)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  PRODUCTION MODE — VERIFIED META & HIS INTEGRATIONS
                </span>
              )}
              <span className="text-xs text-slate-500 hidden lg:inline font-medium">
                DB: <strong className="text-[#0B4F8A]">{healthRes?.database?.engine || 'PostgreSQL 16'}</strong> • Queue:{' '}
                <strong className="text-[#0B4F8A]">{healthRes?.scheduler?.backend || 'Active'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#0B4F8A]">
                Hospital Unit:
              </label>
              <select
                value={user?.hospitalId || selectedHospitalId}
                disabled={Boolean(user?.hospitalId)}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="text-xs font-semibold border-2 border-[#0B4F8A]/25 rounded-lg px-3 py-1.5 bg-[#F4F8FC] text-[#062646] focus:outline-none focus:ring-2 focus:ring-[#F39200] disabled:bg-slate-100"
              >
                {!user?.hospitalId && (
                  <option value="ALL">All ANHVL Units (New Town Kolkata & Raipur)</option>
                )}
                {hospitals.map((h: any) => (
                  <option key={h.id} value={h.id}>
                    {h.city} — {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>
          </header>

          {/* Page Outlet */}
          <main className="flex-1 p-6 overflow-x-hidden">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </HospitalFilterContext.Provider>
  );
};
