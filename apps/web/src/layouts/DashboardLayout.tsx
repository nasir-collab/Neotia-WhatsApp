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
      title: 'Clinical Operations',
      items: [
        { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
        { to: '/appointments', label: 'Appointments', icon: CalendarCheck },
        { to: '/patients', label: 'Patient Directory', icon: Users },
        { to: '/attendance', label: 'HIS Attendance', icon: CheckCircle2 },
        { to: '/no-shows', label: 'No-Show Recovery', icon: UserX },
      ],
    },
    {
      title: 'Patient Engagement',
      items: [
        { to: '/messages', label: 'WhatsApp Logs', icon: MessageSquare },
        { to: '/templates', label: 'Message Templates', icon: FileText },
        { to: '/scheduler', label: 'Reminder Queue', icon: Clock },
        { to: '/responses', label: 'Patient Replies', icon: Reply },
        { to: '/consent', label: 'Consent & STOP', icon: ShieldCheck },
        { to: '/doctor-disruptions', label: 'Doctor Cancel / Delay', icon: CalendarX },
        { to: '/retargeting', label: 'Re-Targeting', icon: Megaphone },
      ],
    },
    {
      title: 'Altruist Desk',
      items: [
        { to: '/followups', label: 'Follow-Up Worklist', icon: PhoneCall },
        { to: '/agents', label: 'Agent Roster', icon: Headphones },
      ],
    },
    {
      title: 'Integrations & Pilot',
      items: [
        { to: '/integrations/his', label: 'HIS Connector', icon: Server },
        { to: '/integrations/whatsapp', label: 'WhatsApp Cloud', icon: Smartphone },
        { to: '/integrations/altruist', label: 'Altruist Handoff', icon: Share2 },
        { to: '/pilot', label: 'New Town Pilot', icon: FlaskConical },
        { to: '/reports', label: 'Reports & Exports', icon: BarChart3 },
      ],
    },
    {
      title: 'Governance',
      items: [
        { to: '/hospitals', label: 'Hospital Units', icon: Building2 },
        { to: '/users', label: 'Users & RBAC', icon: UserCog },
        { to: '/audit-logs', label: 'Audit Trail', icon: FileSearch },
        { to: '/settings', label: 'System Settings', icon: Settings },
        { to: '/architecture', label: 'Architecture', icon: Layers },
      ],
    },
    {
      title: 'Executive Showcase',
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
      <div className="min-h-screen flex bg-[#FAF9F6] text-[#102438]">
        {/* Refined Pure White Sidebar with Prominent Neotia Bhagirathi Brand Plinth */}
        <aside className="w-[276px] bg-white border-r border-[#EAE6DF] flex flex-col shrink-0 sticky top-0 h-screen shadow-[2px_0_16px_rgba(7,42,77,0.025)]">
          {/* Signature Hairline Brand Bar */}
          <div className="h-[3px] w-full flex shrink-0">
            <div className="w-[35%] bg-[#F39200]" />
            <div className="flex-1 bg-[#0B4F8A]" />
          </div>

          {/* Museum-Clean Brand Logo Plinth */}
          <div className="px-5 pt-4 pb-4 border-b border-[#EAE6DF] bg-white flex flex-col items-center">
            <NeotiaBrandLogo size="lg" className="items-center" />
            <div className="mt-2 pt-2 border-t border-[#F2EFEA] w-full flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[#8A94A6] font-semibold">
              <span className="text-[#0B4F8A]">Patient Suite</span>
              <span>Plan D Media</span>
            </div>
          </div>

          {/* Classy, Quiet Navigation */}
          <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A0B2]">
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
                          `relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-[#0B4F8A]/[0.09] to-[#0B4F8A]/[0.02] text-[#072A4D] font-semibold'
                              : 'text-[#526277] font-medium hover:bg-[#FAF9F6] hover:text-[#072A4D]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#F39200]" />
                            )}
                            <Icon
                              className={`w-[16px] h-[16px] shrink-0 transition-colors ${
                                isActive ? 'text-[#0B4F8A]' : 'text-[#94A0B2]'
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

          {/* Refined Executive Profile Footer */}
          <div className="p-4 border-t border-[#EAE6DF] bg-[#FAF9F6]/70">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#072A4D] text-white text-xs font-semibold flex items-center justify-center shrink-0 ring-2 ring-[#F39200]/25">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#072A4D] truncate">
                  {user?.fullName || 'Administrator'}
                </div>
                <div className="text-[11px] text-[#64748B] truncate">
                  {user?.roleName || user?.roleCode}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#072A4D] hover:text-white text-[#475569] border border-[#E2DDD4] text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Switch Role / Sign Out
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Translucent Porcelain Glass Top Header */}
          <header className="h-16 bg-white/85 backdrop-blur-md border-b border-[#EAE6DF] px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-3.5">
              {operatingMode === 'DEMO' ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FFF8EE] text-[#B45309] border border-[#F39200]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F39200]" />
                  Demo Sandbox · Synthetic Patient Dataset
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Production · Live Meta &amp; HIS
                </span>
              )}
              <span className="text-xs text-[#8A94A6] hidden xl:inline">
                PostgreSQL 16 Connected · Persistent Reminder Engine
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A94A6] hidden sm:inline">
                Hospital Unit
              </span>
              <div className="relative">
                <select
                  value={user?.hospitalId || selectedHospitalId}
                  disabled={Boolean(user?.hospitalId)}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="appearance-none text-xs font-semibold border border-[#E2DDD4] hover:border-[#0B4F8A]/50 rounded-full pl-4 pr-9 py-2 bg-white text-[#072A4D] focus:outline-none focus:ring-2 focus:ring-[#0B4F8A]/15 focus:border-[#0B4F8A] disabled:bg-slate-50 cursor-pointer transition shadow-[0_1px_3px_rgba(7,42,77,0.04)]"
                >
                  {!user?.hospitalId && (
                    <option value="ALL">All Units — New Town Kolkata &amp; Raipur</option>
                  )}
                  {hospitals.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.city} ({h.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#0B4F8A] absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </header>

          {/* Spacious Porcelain Canvas */}
          <main className="flex-1 px-8 py-8 max-w-[1440px] w-full mx-auto overflow-x-hidden">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </HospitalFilterContext.Provider>
  );
};
