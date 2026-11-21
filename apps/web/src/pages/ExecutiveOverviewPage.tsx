import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Send,
  MailCheck,
  Eye,
  AlertOctagon,
  RefreshCw,
  XCircle,
  HelpCircle,
  UserCheck,
  UserX,
  TrendingUp,
  PhoneCall,
  Download,
  PlayCircle,
  Building2,
  Languages,
  Activity,
  PieChart as PieChartIcon,
  ArrowUpRight,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';
import { NeotiaBrandLogo, NeotiaCrossEmblem } from '../components/NeotiaBrandLogo';

// Neotia Bhagirathi Harmonized Brand Chart Palette
const NEOTIA_CHART_COLORS = [
  '#0B4F8A', // Bhagirathi Deep Blue
  '#F39200', // Neotia Saffron Orange
  '#0D68AF', // Bhagirathi Royal Blue
  '#10B981', // WhatsApp Verification Emerald
  '#6366F1', // Clinical Indigo
  '#EF4444', // Alert Coral
  '#8B5CF6', // Violet
];

export const ExecutiveOverviewPage: React.FC<{ hospitalId?: string }> = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const queryParams = new URLSearchParams();
  if (selectedHospitalId && selectedHospitalId !== 'ALL') {
    queryParams.set('hospitalId', selectedHospitalId);
  }
  if (fromDate) queryParams.set('fromDate', fromDate);
  if (toDate) queryParams.set('toDate', toDate);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports-overview', selectedHospitalId, fromDate, toDate],
    queryFn: () => apiRequest(`/reports/overview?${queryParams.toString()}`),
  });

  const overview = data?.data;
  const kpis = overview?.kpis || {};

  const kpiCards = [
    { label: 'Appointments Received', value: kpis.appointmentsReceived ?? 0, sub: 'Total HIS ingested', icon: CalendarCheck, color: 'text-[#062646]', bg: 'bg-[#EBF4FC]', border: 'border-l-[#0B4F8A]' },
    { label: 'Confirmed Appointments', value: kpis.confirmedAppointments ?? 0, sub: `${kpis.confirmationRate ?? 0}% confirmation rate`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-l-emerald-500' },
    { label: 'Confirmation Pending', value: kpis.confirmationPending ?? 0, sub: 'Awaiting patient tap', icon: Clock, color: 'text-[#D97E00]', bg: 'bg-[#FFF4E5]', border: 'border-l-[#F39200]' },
    { label: 'Messages Sent (API)', value: kpis.messagesSent ?? 0, sub: 'Submitted to Meta API', icon: Send, color: 'text-[#0D68AF]', bg: 'bg-[#EBF4FC]', border: 'border-l-[#0D68AF]' },
    { label: 'Messages Delivered', value: kpis.messagesDelivered ?? 0, sub: `${kpis.deliveryRate ?? 0}% delivery rate`, icon: MailCheck, color: 'text-[#0B4F8A]', bg: 'bg-sky-50', border: 'border-l-[#0B4F8A]' },
    { label: 'Messages Read', value: kpis.messagesRead ?? 0, sub: `${kpis.readRate ?? 0}% read receipt rate`, icon: Eye, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-l-indigo-500' },
    { label: 'Failed Messages', value: kpis.failedMessages ?? 0, sub: 'Routed to call fallback', icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-500' },
    { label: 'Reschedule Requests', value: kpis.rescheduleRequests ?? 0, sub: 'Agent callback queue', icon: RefreshCw, color: 'text-[#D97E00]', bg: 'bg-[#FFF4E5]', border: 'border-l-[#F39200]' },
    { label: 'Cancellation Requests', value: kpis.cancellationRequests ?? 0, sub: 'Pending HIS confirmation', icon: XCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-l-rose-500' },
    { label: 'Assistance Requests', value: kpis.assistanceRequests ?? 0, sub: 'Talk-to-Us help desk', icon: HelpCircle, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-l-purple-500' },
    { label: 'Registered Patients (HIS)', value: kpis.registeredPatients ?? 0, sub: 'OPD desk check-ins', icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-l-emerald-600' },
    { label: 'Completed Visits', value: kpis.completedAppointments ?? 0, sub: 'Consultation finished', icon: CheckCircle2, color: 'text-[#0B4F8A]', bg: 'bg-[#EBF4FC]', border: 'border-l-[#0B4F8A]' },
    { label: 'Verified No-Shows', value: kpis.noShows ?? 0, sub: 'Rebooking prompt eligible', icon: UserX, color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-600' },
    { label: 'Attendance Conversion', value: `${kpis.attendanceConversionRate ?? 0}%`, sub: 'Reconciled HIS turn-up', icon: TrendingUp, color: 'text-[#062646]', bg: 'bg-[#EBF4FC]', border: 'border-l-[#0D68AF]' },
    { label: 'Pending Follow-Ups', value: kpis.pendingFollowUps ?? 0, sub: 'Active Altruist queue', icon: PhoneCall, color: 'text-[#B86200]', bg: 'bg-[#FFF4E5]', border: 'border-l-[#F39200]' },
  ];

  const statusPieData = overview?.statusDistribution || [];
  const whatsappPieData = overview?.whatsappLifecyclePie || [];
  const languagePieData = (overview?.languageBreakdown || []).filter((l: any) => l.appointments > 0);
  const responsePieData = overview?.responseActionPie || [];
  const dailyTrendData = overview?.dailyTrend || [];

  return (
    <div className="space-y-6">
      {/* Neotia Bhagirathi Executive Hero Header with Official Brand Logo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#062646] via-[#0B4F8A] to-[#083B6B] text-white p-6 shadow-xl border border-[#0D68AF]/50">
        {/* Top Neotia Orange Accent Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, #F39200 0%, #FFB74D 40%, #0D68AF 40%, #38bdf8 100%)' }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-5">
            {/* Official Uploaded Neotia Bhagirathi Woman and Child Care Centre Logo */}
            <NeotiaBrandLogo size="md" className="shrink-0" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#F39200]/20 border border-[#F39200]/40 text-[#FFB74D] text-[11px] font-bold mb-1.5">
                <span>Ambuja Neotia Healthcare Venture Ltd. (ANHVL)</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Neotia Bhagirathi Patient Engagement Command Center
              </h1>
              <p className="text-xs text-sky-100/90 mt-1 max-w-2xl">
                End-to-end WhatsApp appointment confirmation, multilingual reminders, patient response capture, Altruist callbacks & HIS OPD attendance across <strong>New Town, Kolkata (Bengali/English)</strong> and <strong>Raipur (Hindi/English)</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#041A30]/70 border border-sky-400/30 rounded-lg px-2.5 py-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs bg-transparent text-white focus:outline-none"
              />
              <span className="text-xs text-sky-300">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs bg-transparent text-white focus:outline-none"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-2 text-xs font-semibold bg-[#041A30]/70 hover:bg-[#041A30] text-sky-100 border border-sky-400/30 rounded-lg transition"
            >
              Refresh
            </button>
            <button
              onClick={() =>
                downloadAuthenticatedCsv(
                  `/appointments/export/csv?${queryParams.toString()}`,
                  'neotia-bhagirathi-appointments.csv'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white text-[#062646] rounded-lg hover:bg-sky-50 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#0B4F8A]" />
              Export CSV
            </button>
            <Link
              to="/simulator"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#F39200] to-[#E07B00] text-white rounded-lg hover:from-[#E07B00] hover:to-[#CC6E00] transition shadow-md shadow-[#F39200]/30"
            >
              <PlayCircle className="w-4 h-4" />
              Live Journey Simulator
            </Link>
          </div>
        </div>

        {/* Quick Executive Highlight Strip */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
            <div className="text-[11px] text-[#FFB74D] font-semibold">WhatsApp Delivery Rate</div>
            <div className="text-xl font-extrabold mt-0.5">{kpis.deliveryRate ?? 0}%</div>
            <div className="w-full bg-white/15 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#F39200] h-full rounded-full" style={{ width: `${Math.min(100, kpis.deliveryRate || 0)}%` }} />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
            <div className="text-[11px] text-sky-200 font-semibold">Patient Read Receipt Rate</div>
            <div className="text-xl font-extrabold mt-0.5">{kpis.readRate ?? 0}%</div>
            <div className="w-full bg-white/15 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-sky-400 h-full rounded-full" style={{ width: `${Math.min(100, kpis.readRate || 0)}%` }} />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
            <div className="text-[11px] text-emerald-300 font-semibold">Appointment Confirmation Rate</div>
            <div className="text-xl font-extrabold mt-0.5">{kpis.confirmationRate ?? 0}%</div>
            <div className="w-full bg-white/15 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, kpis.confirmationRate || 0)}%` }} />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
            <div className="text-[11px] text-[#FFB74D] font-semibold">HIS OPD Turn-Up Conversion</div>
            <div className="text-xl font-extrabold mt-0.5">{kpis.attendanceConversionRate ?? 0}%</div>
            <div className="w-full bg-white/15 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#F39200] h-full rounded-full" style={{ width: `${Math.min(100, kpis.attendanceConversionRate || 0)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Donut / Pie Charts Grid (Styled in Neotia Bhagirathi Brand Palette) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Pie 1: Appointment Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#0B4F8A] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B4F8A] flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-[#F39200]" />
                Booking Lifecycle
              </span>
              <span className="text-xs font-bold text-[#062646] bg-[#EBF4FC] px-2.5 py-0.5 rounded-full">
                {kpis.appointmentsReceived ?? 0} Total
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#062646]">
              Appointment Status Breakdown
            </h3>
          </div>

          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={74}
                  paddingAngle={3}
                >
                  {statusPieData.map((entry: any, idx: number) => (
                    <Cell key={entry.name} fill={entry.color || NEOTIA_CHART_COLORS[idx % NEOTIA_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {statusPieData.slice(0, 4).map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || NEOTIA_CHART_COLORS[idx % NEOTIA_CHART_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-bold text-[#062646]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie 2: WhatsApp Delivery States */}
        <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#F39200] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97E00] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#0B4F8A]" />
                Meta Cloud API
              </span>
              <span className="text-xs font-bold text-[#B86200] bg-[#FFF4E5] px-2.5 py-0.5 rounded-full">
                {kpis.deliveryRate ?? 0}% Delivered
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#062646]">
              WhatsApp Delivery & Read Split
            </h3>
          </div>

          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={whatsappPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={74}
                  paddingAngle={3}
                >
                  {whatsappPieData.map((entry: any, idx: number) => (
                    <Cell key={entry.name} fill={NEOTIA_CHART_COLORS[idx % NEOTIA_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {whatsappPieData.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: NEOTIA_CHART_COLORS[idx % NEOTIA_CHART_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-bold text-[#062646]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie 3: Regional Language Routing */}
        <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#0D68AF] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0D68AF] flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#F39200]" />
                Regional Split
              </span>
              <span className="text-xs font-bold text-[#0B4F8A] bg-[#EBF4FC] px-2.5 py-0.5 rounded-full">
                BN • HI • EN
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#062646]">
              Multilingual Patient Preference
            </h3>
          </div>

          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languagePieData}
                  dataKey="appointments"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={74}
                  paddingAngle={4}
                >
                  {languagePieData.map((entry: any, idx: number) => (
                    <Cell
                      key={entry.language}
                      fill={['#0B4F8A', '#F39200', '#0D68AF'][idx % 3]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {languagePieData.map((item: any, idx: number) => (
              <div key={item.language} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ['#0B4F8A', '#F39200', '#0D68AF'][idx % 3] }}
                  />
                  {item.label}
                </span>
                <span className="font-bold text-[#062646]">
                  {item.appointments} ({item.delivered} deliv)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie 4: Patient Interactive Response Intents */}
        <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-600 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#F39200]" />
                Inbound Replies
              </span>
              <Link
                to="/responses"
                className="text-[11px] font-bold text-[#0B4F8A] hover:text-[#F39200] flex items-center gap-0.5"
              >
                Open Inbox <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <h3 className="text-sm font-bold text-[#062646]">
              Patient Response Intent Split
            </h3>
          </div>

          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={responsePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={74}
                  paddingAngle={3}
                >
                  {responsePieData.map((entry: any, idx: number) => (
                    <Cell key={entry.name} fill={entry.color || NEOTIA_CHART_COLORS[idx % NEOTIA_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {responsePieData.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || NEOTIA_CHART_COLORS[idx % NEOTIA_CHART_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-bold text-[#062646]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 15 KPI Cards Grid */}
      {isLoading ? (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-sm text-slate-500">
          Loading real-time PostgreSQL operational metrics...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`bg-white rounded-xl border border-slate-200 border-l-4 ${card.border} p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-600 leading-tight">
                    {card.label}
                  </span>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-extrabold ${card.color}`}>
                    {card.value}
                  </div>
                  {card.sub && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {card.sub}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Middle Charts Row: Multi-Day Trend (AreaChart) & Hospital Unit Comparison (BarChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Multi-Day Trend Area Chart in Bhagirathi Blue & Neotia Orange */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-[#062646] flex items-center gap-2">
              <NeotiaCrossEmblem className="w-4 h-4" />
              Multi-Day Appointment & Turn-Up Trajectory
            </h2>
            <span className="text-[11px] font-bold text-[#0B4F8A] bg-[#EBF4FC] px-2.5 py-0.5 rounded-full">
              Chronological OPD Trend
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Daily progression of HIS Booked vs WhatsApp Confirmed vs HIS Attended visits
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorBookedNeotia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B4F8A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0B4F8A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConfirmedNeotia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F39200" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F39200" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAttendedNeotia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="booked" name="HIS Booked" stroke="#0B4F8A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBookedNeotia)" />
                <Area type="monotone" dataKey="confirmed" name="WA Confirmed" stroke="#F39200" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConfirmedNeotia)" />
                <Area type="monotone" dataKey="attended" name="HIS Attended" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttendedNeotia)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hospital Comparison Bar Chart in Bhagirathi Blue & Neotia Orange */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-[#062646] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#0B4F8A]" />
              Hospital-Wise Performance (New Town vs Raipur)
            </h2>
            <span className="text-[11px] font-bold text-[#B86200] bg-[#FFF4E5] px-2.5 py-0.5 rounded-full">
              2 Active Units
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Comparing Appointments Booked, WhatsApp Delivered, Patient Confirmed, and HIS Attended
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.hospitalComparison || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="city" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="appointments" name="Booked" fill="#0B4F8A" radius={[5, 5, 0, 0]} />
                <Bar dataKey="messagesDelivered" name="WA Delivered" fill="#0D68AF" radius={[5, 5, 0, 0]} />
                <Bar dataKey="confirmed" name="Confirmed" fill="#F39200" radius={[5, 5, 0, 0]} />
                <Bar dataKey="attended" name="HIS Attended" fill="#10B981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Doctor & Speciality Conversion Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#062646]">
              Consultant & Speciality Turn-Up Leaderboard
            </h2>
            <p className="text-xs text-slate-500">
              Granular conversion tracking by doctor, department, hospital unit, and reconciled HIS attendance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/reports"
              className="text-xs font-bold text-[#0B4F8A] hover:text-[#F39200]"
            >
              Full Analytics & Pie Charts →
            </Link>
            <Link
              to="/appointments"
              className="text-xs font-bold text-[#D97E00] hover:underline"
            >
              View All Appointments →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F4F8FC] text-[#062646] uppercase text-[11px] font-bold">
                <th className="py-3 px-3 rounded-tl-lg">Consultant</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Hospital Unit</th>
                <th className="py-3 px-3">Booked</th>
                <th className="py-3 px-3">Confirmed</th>
                <th className="py-3 px-3">Reschedule Req</th>
                <th className="py-3 px-3">HIS Attended</th>
                <th className="py-3 px-3">Verified No-Show</th>
                <th className="py-3 px-3 rounded-tr-lg">Confirmation Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.doctorAnalysis || []).map((doc: any) => {
                const confPct = doc.booked > 0 ? Math.round((doc.confirmed / doc.booked) * 100) : 0;
                return (
                  <tr key={doc.doctorName} className="hover:bg-[#F4F8FC]/80 transition">
                    <td className="py-3 px-3 font-bold text-[#062646]">{doc.doctorName}</td>
                    <td className="py-3 px-3 text-slate-600">{doc.department}</td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF4FC] text-[#0B4F8A]">
                        {doc.hospitalName}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">{doc.booked}</td>
                    <td className="py-3 px-3 text-emerald-700 font-bold">{doc.confirmed}</td>
                    <td className="py-3 px-3 text-[#D97E00] font-semibold">{doc.rescheduleRequested}</td>
                    <td className="py-3 px-3 text-[#0B4F8A] font-bold">{doc.attended}</td>
                    <td className="py-3 px-3 text-red-600 font-semibold">{doc.noShows}</td>
                    <td className="py-3 px-3 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#0B4F8A] to-[#F39200] rounded-full"
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#062646] w-9 text-right">
                          {confPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Documented Metric Denominators Footer */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#062646] to-[#0B4F8A] text-sky-100 text-[11px] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="font-bold text-[#FFB74D] block">Delivery Rate Formula</span>
            {overview?.denominatorsNote?.deliveryRate}
          </div>
          <div>
            <span className="font-bold text-emerald-300 block">Confirmation Rate Formula</span>
            {overview?.denominatorsNote?.confirmationRate}
          </div>
          <div>
            <span className="font-bold text-sky-300 block">Attendance Conversion Formula</span>
            {overview?.denominatorsNote?.attendanceConversionRate}
          </div>
        </div>
      </div>
    </div>
  );
};
