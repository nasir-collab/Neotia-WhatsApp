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
  CalendarX,
  Megaphone,
  ChevronDown,
} from 'lucide-react';
import { apiRequest, clearAuthSession, getStoredUser, AuthSessionUser } from '../services/api';
import { NeotiaBrandLogo } from '../components/NeotiaBrandLogo';

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
      title: 'Operations',
      items: [
        { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
        { to: '/appointments', label: 'Appointments', icon: CalendarCheck },
        { to: '/patients', label: 'Patient Directory', icon: Users },
        { to: '/attendance', label: 'HIS Attendance', icon: CheckCircle2 },
        { to: '/no-shows', label: 'No-Show Recovery', icon: UserX },
      ],
    },
    {
      title: 'WhatsApp Engagement',
      items: [
        { to: '/messages', label: 'Message Logs', icon: MessageSquare },
        { to: '/templates', label: 'Templates', icon: FileText },
        { to: '/scheduler', label: 'Reminder Queue', icon: Clock },
        { to: '/responses', label: 'Patient Replies', icon: Reply },
        { to: '/consent', label: 'Consent & STOP', icon: ShieldCheck },
        { to: '/doctor-disruptions', label: 'Doctor Cancel / Delay', icon: CalendarX },
        { to: '/retargeting', label: 'Re-Targeting', icon: Megaphone },
      ],
    },
    {
      title: 'Altruist Call-Centre',
      items: [
        { to: '/followups', label: 'Follow-Up Worklist', icon: PhoneCall },
        { to: '/agents', label: 'Agent Roster', icon: Headphones },
      ],
    },
    {
      title: 'Integrations & Pilot',
      items: [
        { to: '/integrations/his', label: 'HIS Connector', icon: Server },
        { to: '/integrations/whatsapp', label: 'WhatsApp Cloud API', icon: Smartphone },
        { to: '/integrations/altruist', label: 'Altruist Handoff', icon: Share2 },
        { to: '/pilot', label: 'New Town Pilot', icon: FlaskConical },
        { to: '/reports', label: 'Reports & Exports', icon: BarChart3 },
      ],
    },
    {
      title: 'Administration',
      items: [
        { to: '/hospitals', label: 'Hospital Units', icon: Building2 },
        { to: '/users', label: 'Users & RBAC', icon: UserCog },
        { to: '/audit-logs', label: 'Audit Trail', icon: FileSearch },
        { to: '/settings', label: 'System Settings', icon: Settings },
        { to: '/architecture', label: 'Architecture', icon: Layers },
      ],
    },
    {
      title: 'Interactive Showcase',
      items: [
        { to: '/simulator', label: 'Journey Simulator', icon: PlayCircle },
        { to: '/presentation', label: 'Client Walkthrough', icon: Presentation },
      ],
    },
  ];

  const userInitials = (user?.fullName || 'AS')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

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
      <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
        {/* Clean Light Editorial Sidebar with Seamless Prominent Official Logo */}
        <aside className="w-[268px] bg-white border-r border-slate-200/90 flex flex-col shrink-0 sticky top-0 h-screen">
          {/* Top Brand Signature Stripe */}
          <div className="h-[3px] w-full flex shrink-0">
            <div className="w-[34%] bg-[#F39200]" />
            <div className="flex-1 bg-[#0B4F8A]" />
          </div>

          {/* Prominent Unclipped Official Neotia Bhagirathi Logo Header */}
          <div className="px-5 pt-4 pb-3.5 border-b border-slate-100 bg-white flex flex-col items-start">
            <NeotiaBrandLogo size="lg" className="w-full" />
            <div className="mt-1.5 flex items-center justify-between w-full text-[11px] text-slate-400">
              <span className="font-medium text-slate-500">WhatsApp Engagement</span>
              <span>Plan D Media</span>
            </div>
          </div>

          {/* Quiet, Scannable Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                          `relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                            isActive
                              ? 'bg-[#EFF6FC] text-[#0B4F8A] font-semibold'
                              : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#F39200]" />
                            )}
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-[#0B4F8A]' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Refined User Profile Footer */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B4F8A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {user?.fullName || 'Administrator'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {user?.roleName || user?.roleCode}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              Switch Role / Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Calm, Airy Top Bar */}
          <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200/90 px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              {operatingMode === 'DEMO' ? (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFF7EB] text-[#B45309] border border-[#F39200]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F39200]" />
                  Demo Sandbox · Synthetic Data
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Production · Verified Meta & HIS
                </span>
              )}
              <span className="text-xs text-slate-400 hidden lg:inline">
                PostgreSQL 16 Connected · Persistent Reminder Worker Active
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                Hospital Unit
              </span>
              <div className="relative">
                <select
                  value={user?.hospitalId || selectedHospitalId}
                  disabled={Boolean(user?.hospitalId)}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="appearance-none text-xs font-semibold border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]/20 focus:border-[#0B4F8A] disabled:bg-slate-50 cursor-pointer transition"
                >
                  {!user?.hospitalId && (
                    <option value="ALL">All Units (New Town Kolkata & Raipur)</option>
                  )}
                  {hospitals.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.city} ({h.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </header>

          {/* Spacious Editorial Main Canvas */}
          <main className="flex-1 px-8 py-7 max-w-[1440px] w-full mx-auto overflow-x-hidden">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </HospitalFilterContext.Provider>
  );
};
