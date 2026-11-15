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
  Sparkles,
  Building2,
  Languages,
  Activity,
  PieChart as PieChartIcon,
  ArrowUpRight,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

const FALLBACK_COLORS = ['#0d9488', '#10b981', '#4f46e5', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];

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
    { label: 'Appointments Received', value: kpis.appointmentsReceived ?? 0, sub: 'Total HIS ingested', icon: CalendarCheck, color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-l-slate-700' },
    { label: 'Confirmed Appointments', value: kpis.confirmedAppointments ?? 0, sub: `${kpis.confirmationRate ?? 0}% confirmation rate`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-l-emerald-500' },
    { label: 'Confirmation Pending', value: kpis.confirmationPending ?? 0, sub: 'Awaiting patient tap', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-l-amber-500' },
    { label: 'Messages Sent (API)', value: kpis.messagesSent ?? 0, sub: 'Submitted to Meta API', icon: Send, color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-l-sky-500' },
    { label: 'Messages Delivered', value: kpis.messagesDelivered ?? 0, sub: `${kpis.deliveryRate ?? 0}% delivery rate`, icon: MailCheck, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-l-teal-500' },
    { label: 'Messages Read', value: kpis.messagesRead ?? 0, sub: `${kpis.readRate ?? 0}% read receipt rate`, icon: Eye, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-l-indigo-500' },
    { label: 'Failed Messages', value: kpis.failedMessages ?? 0, sub: 'Routed to call fallback', icon: AlertOctagon, color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-500' },
    { label: 'Reschedule Requests', value: kpis.rescheduleRequests ?? 0, sub: 'Agent callback queue', icon: RefreshCw, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-l-orange-500' },
    { label: 'Cancellation Requests', value: kpis.cancellationRequests ?? 0, sub: 'Pending HIS confirmation', icon: XCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-l-rose-500' },
    { label: 'Assistance Requests', value: kpis.assistanceRequests ?? 0, sub: 'Talk-to-Us help desk', icon: HelpCircle, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-l-purple-500' },
    { label: 'Registered Patients (HIS)', value: kpis.registeredPatients ?? 0, sub: 'OPD desk check-ins', icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-l-emerald-600' },
    { label: 'Completed Visits', value: kpis.completedAppointments ?? 0, sub: 'Consultation finished', icon: CheckCircle2, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-l-teal-600' },
    { label: 'Verified No-Shows', value: kpis.noShows ?? 0, sub: 'Rebooking prompt eligible', icon: UserX, color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-600' },
    { label: 'Attendance Conversion', value: `${kpis.attendanceConversionRate ?? 0}%`, sub: 'Reconciled HIS turn-up', icon: TrendingUp, color: 'text-teal-800', bg: 'bg-teal-100', border: 'border-l-teal-700' },
    { label: 'Pending Follow-Ups', value: kpis.pendingFollowUps ?? 0, sub: 'Active Altruist queue', icon: PhoneCall, color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-l-amber-600' },
  ];

  const statusPieData = overview?.statusDistribution || [];
  const whatsappPieData = overview?.whatsappLifecyclePie || [];
  const languagePieData = (overview?.languageBreakdown || []).filter((l: any) => l.appointments > 0);
  const responsePieData = overview?.responseActionPie || [];
  const dailyTrendData = overview?.dailyTrend || [];

  return (
    <div className="space-y-6">
      {/* Executive Gradient Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 shadow-lg border border-teal-800/40">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[11px] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL)
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Executive Operational Command Center
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Live end-to-end patient journey telemetry across <strong>New Town, Kolkata (Bengali & English)</strong> and <strong>Raipur (Hindi & English)</strong> — tracking HIS ingestion, WhatsApp utility delivery, interactive patient responses, Altruist callbacks, and OPD attendance reconciliation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs bg-transparent text-white focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs bg-transparent text-white focus:outline-none"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
            >
              Refresh Data
            </button>
            <button
              onClick={() =>
                downloadAuthenticatedCsv(
                  `/appointments/export/csv?${queryParams.toString()}`,
                  'anhvl-executive-appointments.csv'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <Link
              to="/simulator"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition shadow-md"
            >
              <PlayCircle className="w-4 h-4" />
              Live Journey Simulator
            </Link>
          </div>
        </div>

        {/* Quick Executive Highlight Strip */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-teal-300 font-medium">WhatsApp Delivery Rate</div>
            <div className="text-xl font-bold mt-0.5">{kpis.deliveryRate ?? 0}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full" style={{ width: `${Math.min(100, kpis.deliveryRate || 0)}%` }} />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-300 font-medium">Patient Read Receipt Rate</div>
            <div className="text-xl font-bold mt-0.5">{kpis.readRate ?? 0}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${Math.min(100, kpis.readRate || 0)}%` }} />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-emerald-300 font-medium">Appointment Confirmation Rate</div>
            <div className="text-xl font-bold mt-0.5">{kpis.confirmationRate ?? 0}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, kpis.confirmationRate || 0)}%` }} />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-amber-300 font-medium">HIS OPD Turn-Up Conversion</div>
            <div className="text-xl font-bold mt-0.5">{kpis.attendanceConversionRate ?? 0}%</div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, kpis.attendanceConversionRate || 0)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Donut / Pie Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Pie 1: Appointment Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5" />
                Booking Lifecycle
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                {kpis.appointmentsReceived ?? 0} Total
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
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
                    <Cell key={entry.name} fill={entry.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {statusPieData.slice(0, 4).map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie 2: WhatsApp Delivery States */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Meta Cloud API
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                {kpis.deliveryRate ?? 0}% Delivered
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
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
                    <Cell key={entry.name} fill={entry.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {whatsappPieData.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie 3: Regional Language Routing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5" />
                Language Split
              </span>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                BN • HI • EN
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
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
                    <Cell key={entry.language} fill={entry.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {languagePieData.map((item: any, idx: number) => (
              <div key={item.language} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
                  />
                  {item.label}
                </span>
                <span className="font-bold text-slate-900">
                  {item.appointments} ({item.delivered} deliv)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie 4: Patient Interactive Response Intents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Inbound Replies
              </span>
              <Link
                to="/responses"
                className="text-[11px] font-semibold text-teal-700 hover:underline flex items-center gap-0.5"
              >
                Inbox <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
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
                    <Cell key={entry.name} fill={entry.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', fontSize: '12px', borderColor: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {responsePieData.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}</span>
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
        {/* Multi-Day Trend Area Chart */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-900">
              Multi-Day Appointment & Turn-Up Trajectory
            </h2>
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
              Chronological OPD Trend
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Daily progression of Booked vs WhatsApp Confirmed vs HIS Attended visits
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorBooked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="booked" name="HIS Booked" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorBooked)" />
                <Area type="monotone" dataKey="confirmed" name="WA Confirmed" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorConfirmed)" />
                <Area type="monotone" dataKey="attended" name="HIS Attended" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAttended)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hospital Comparison Bar Chart */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-teal-700" />
              Hospital-Wise Performance (New Town vs Raipur)
            </h2>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
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
                <Bar dataKey="appointments" name="Booked" fill="#0f2942" radius={[5, 5, 0, 0]} />
                <Bar dataKey="messagesDelivered" name="WA Delivered" fill="#0284c7" radius={[5, 5, 0, 0]} />
                <Bar dataKey="confirmed" name="Confirmed" fill="#0d9488" radius={[5, 5, 0, 0]} />
                <Bar dataKey="attended" name="HIS Attended" fill="#10b981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Doctor & Speciality Conversion Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Consultant & Speciality Turn-Up Leaderboard
            </h2>
            <p className="text-xs text-slate-500">
              Granular conversion tracking by doctor, department, hospital unit, and reconciled HIS attendance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/reports"
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              Full Analytics & Pie Charts →
            </Link>
            <Link
              to="/appointments"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              View All Appointments →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase text-[11px]">
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
                  <tr key={doc.doctorName} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{doc.doctorName}</td>
                    <td className="py-3 px-3 text-slate-600">{doc.department}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {doc.hospitalName}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">{doc.booked}</td>
                    <td className="py-3 px-3 text-emerald-700 font-bold">{doc.confirmed}</td>
                    <td className="py-3 px-3 text-amber-700 font-medium">{doc.rescheduleRequested}</td>
                    <td className="py-3 px-3 text-teal-700 font-bold">{doc.attended}</td>
                    <td className="py-3 px-3 text-red-600 font-semibold">{doc.noShows}</td>
                    <td className="py-3 px-3 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 w-9 text-right">
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
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="font-bold text-teal-400 block">Delivery Rate Formula</span>
            {overview?.denominatorsNote?.deliveryRate}
          </div>
          <div>
            <span className="font-bold text-emerald-400 block">Confirmation Rate Formula</span>
            {overview?.denominatorsNote?.confirmationRate}
          </div>
          <div>
            <span className="font-bold text-amber-400 block">Attendance Conversion Formula</span>
            {overview?.denominatorsNote?.attendanceConversionRate}
          </div>
        </div>
      </div>
    </div>
  );
};
