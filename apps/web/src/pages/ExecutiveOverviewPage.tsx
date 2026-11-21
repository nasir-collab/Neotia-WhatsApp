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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Download,
  PlayCircle,
  RefreshCw,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  MailCheck,
  TrendingUp,
  Clock,
  XCircle,
  HelpCircle,
  AlertOctagon,
  PhoneCall,
  UserX,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// Curated Editorial Healthcare Palette (Restrained & Cohesive)
const STATUS_COLORS = ['#0B4F8A', '#059669', '#F39200', '#3B82F6', '#DC2626', '#64748B'];
const WA_COLORS = ['#0B4F8A', '#1565A8', '#059669', '#94A3B8', '#DC2626'];
const LANG_COLORS = ['#0B4F8A', '#F39200', '#38BDF8'];

export const ExecutiveOverviewPage: React.FC<{ hospitalId?: string }> = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [trendMode, setTrendMode] = useState<'trend' | 'hospital'>('trend');
  const [insightTab, setInsightTab] = useState<'whatsapp' | 'replies' | 'language'>('whatsapp');

  const queryParams = new URLSearchParams();
  if (selectedHospitalId && selectedHospitalId !== 'ALL') {
    queryParams.set('hospitalId', selectedHospitalId);
  }
  if (fromDate) queryParams.set('fromDate', fromDate);
  if (toDate) queryParams.set('toDate', toDate);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports-overview', selectedHospitalId, fromDate, toDate],
    queryFn: () => apiRequest(`/reports/overview?${queryParams.toString()}`),
  });

  const overview = data?.data;
  const kpis = overview?.kpis || {};

  const statusPieData = overview?.statusDistribution || [];
  const whatsappPieData = overview?.whatsappLifecyclePie || [];
  const languagePieData = (overview?.languageBreakdown || []).filter((l: any) => l.appointments > 0);
  const responsePieData = overview?.responseActionPie || [];
  const dailyTrendData = overview?.dailyTrend || [];

  const activeInsightData =
    insightTab === 'whatsapp'
      ? whatsappPieData.map((d: any, i: number) => ({ ...d, fill: WA_COLORS[i % WA_COLORS.length] }))
      : insightTab === 'replies'
      ? responsePieData.map((d: any, i: number) => ({ ...d, fill: STATUS_COLORS[i % STATUS_COLORS.length] }))
      : languagePieData.map((d: any, i: number) => ({
          name: d.label,
          value: d.appointments,
          sub: `${d.delivered} delivered`,
          fill: LANG_COLORS[i % LANG_COLORS.length],
        }));

  const activeInsightTotal = activeInsightData.reduce((acc: number, x: any) => acc + (x.value || 0), 0);

  const operationalQueues = [
    { label: 'Confirmation Pending', count: kpis.confirmationPending ?? 0, desc: 'Awaiting patient reply on WhatsApp', to: '/appointments', icon: Clock, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Reschedule Requests', count: kpis.rescheduleRequests ?? 0, desc: 'Queued for Altruist slot callback', to: '/followups', icon: RefreshCw, tone: 'text-[#0B4F8A] bg-[#EFF6FC]' },
    { label: 'Cancellation Reviews', count: kpis.cancellationRequests ?? 0, desc: 'Pending official HIS confirmation', to: '/followups', icon: XCircle, tone: 'text-rose-600 bg-rose-50' },
    { label: 'Talk-to-Us Assistance', count: kpis.assistanceRequests ?? 0, desc: 'First-visit & directions help desk', to: '/responses', icon: HelpCircle, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Delivery Failure Fallbacks', count: kpis.failedMessages ?? 0, desc: 'Undeliverable WhatsApp escalated to voice', to: '/messages', icon: AlertOctagon, tone: 'text-red-600 bg-red-50' },
    { label: 'Verified HIS No-Shows', count: kpis.noShows ?? 0, desc: 'Eligible for rebooking outreach', to: '/no-shows', icon: UserX, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Open Altruist Tasks', count: kpis.pendingFollowUps ?? 0, desc: 'Active human follow-up worklist', to: '/followups', icon: PhoneCall, tone: 'text-[#D97E00] bg-[#FFF7EB]' },
  ];

  return (
    <div className="space-y-7">
      {/* Clean Editorial Page Header (No Heavy AI Gradient Box) */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Patient Engagement Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live OPD appointment conversion, WhatsApp utility delivery, and HIS attendance across New Town &amp; Raipur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-700"
            />
            <span className="text-slate-300">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-700"
            />
          </div>

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() =>
              downloadAuthenticatedCsv(
                `/appointments/export/csv?${queryParams.toString()}`,
                'neotia-bhagirathi-appointments.csv'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg transition shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <Download className="w-3.5 h-3.5 text-[#0B4F8A]" />
            Export CSV
          </button>

          <Link
            to="/simulator"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#F39200] hover:bg-[#DC8300] text-white rounded-lg transition shadow-sm"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Run Simulator
          </Link>
        </div>
      </div>

      {/* Tier 1: 4 North-Star Executive Metrics (Clean Hierarchy, No Rainbow Clutter) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Metric 1 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Appointments Ingested</span>
              <CalendarCheck className="w-4 h-4 text-[#0B4F8A]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold text-slate-900 tabular-nums font-display">
                {kpis.appointmentsReceived ?? 0}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {kpis.completedAppointments ?? 0} completed
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>HIS Registered Arrivals</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {kpis.registeredPatients ?? 0} patients
              </span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Patient Confirmation Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold text-slate-900 tabular-nums font-display">
                {kpis.confirmationRate ?? 0}%
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {kpis.confirmedAppointments ?? 0} confirmed
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, kpis.confirmationRate || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>WhatsApp Delivery Rate</span>
              <MailCheck className="w-4 h-4 text-[#0B4F8A]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold text-slate-900 tabular-nums font-display">
                {kpis.deliveryRate ?? 0}%
              </span>
              <span className="text-xs font-medium text-[#0B4F8A] bg-[#EFF6FC] px-2 py-0.5 rounded-full">
                {kpis.readRate ?? 0}% read
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Delivered / Submitted</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {kpis.messagesDelivered ?? 0} / {kpis.messagesSent ?? 0}
              </span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>OPD Turn-Up Conversion</span>
              <TrendingUp className="w-4 h-4 text-[#F39200]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold text-slate-900 tabular-nums font-display">
                {kpis.attendanceConversionRate ?? 0}%
              </span>
              <span className="text-xs font-medium text-slate-500">
                of reconciled HIS visits
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F39200] rounded-full transition-all"
                  style={{ width: `${Math.min(100, kpis.attendanceConversionRate || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: Asymmetric Analytical Canvas (8-col Trajectory/Hospital + 4-col Status Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Trajectory / Unit Comparison */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {trendMode === 'trend'
                  ? 'Appointment & Attendance Trajectory'
                  : 'Hospital Performance — New Town vs Raipur'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {trendMode === 'trend'
                  ? 'Chronological flow from HIS booking to WhatsApp confirmation and OPD arrival'
                  : 'Side-by-side operational comparison across active ANHVL hospital units'}
              </p>
            </div>

            {/* Clean Segmented Control */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
              <button
                onClick={() => setTrendMode('trend')}
                className={`px-3 py-1.5 rounded-md transition ${
                  trendMode === 'trend'
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily Trend
              </button>
              <button
                onClick={() => setTrendMode('hospital')}
                className={`px-3 py-1.5 rounded-md transition ${
                  trendMode === 'hospital'
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                By Hospital
              </button>
            </div>
          </div>

          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              {trendMode === 'trend' ? (
                <AreaChart data={dailyTrendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B4F8A" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#0B4F8A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F39200" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#F39200" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="booked" name="HIS Booked" stroke="#0B4F8A" strokeWidth={2.25} fill="url(#gradBlue)" />
                  <Area type="monotone" dataKey="confirmed" name="WA Confirmed" stroke="#F39200" strokeWidth={2.25} fill="url(#gradOrange)" />
                  <Area type="monotone" dataKey="attended" name="HIS Attended" stroke="#059669" strokeWidth={2} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              ) : (
                <BarChart data={overview?.hospitalComparison || []} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="appointments" name="Booked" fill="#0B4F8A" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="messagesDelivered" name="WA Delivered" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="#F39200" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="attended" name="HIS Attended" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0B4F8A]" />HIS Booked</span>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F39200]" />WhatsApp Confirmed</span>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />HIS Attended</span>
          </div>
        </div>

        {/* Right 4 Cols: Appointment Status Donut Chart with Centered KPI */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Booking Lifecycle</h2>
            <p className="text-xs text-slate-500 mt-0.5">Distribution of current appointment states</p>
          </div>

          <div className="relative h-[210px] my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusPieData.map((entry: any, idx: number) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centered Donut Total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900 tabular-nums font-display">
                {kpis.appointmentsReceived ?? 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400">Bookings</span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            {statusPieData.map((item: any, idx: number) => {
              const pct = kpis.appointmentsReceived
                ? Math.round((item.value / kpis.appointmentsReceived) * 100)
                : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {item.value} <span className="text-slate-400 font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier 3: Communication Breakdown Donut + Actionable Operational Queues (6 + 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Tabbed Pie / Donut Insights (WhatsApp Delivery / Patient Replies / Languages) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                WhatsApp &amp; Patient Engagement Mix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect delivery receipts, patient button intents, and language preference
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
              {[
                { id: 'whatsapp', label: 'Delivery' },
                { id: 'replies', label: 'Replies' },
                { id: 'language', label: 'Language' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInsightTab(t.id as any)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    insightTab === t.id
                      ? 'bg-white text-slate-900 font-semibold shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 my-auto">
            <div className="sm:col-span-5 relative h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeInsightData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {activeInsightData.map((entry: any) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900 tabular-nums font-display">
                  {activeInsightTotal}
                </span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {insightTab}
                </span>
              </div>
            </div>

            <div className="sm:col-span-7 space-y-2.5">
              {activeInsightData.map((item: any) => {
                const pct = activeInsightTotal > 0 ? Math.round((item.value / activeInsightTotal) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {item.value}{' '}
                        <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: item.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>New Town (BN/EN) · Raipur (HI/EN)</span>
            <Link to="/reports" className="font-semibold text-[#0B4F8A] hover:underline inline-flex items-center gap-1">
              Detailed Reports <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 6 Cols: Actionable Operational Queues */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Operational Action Queues
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live exceptions and Altruist call-centre escalations requiring attention
              </p>
            </div>
            <Link
              to="/followups"
              className="text-xs font-semibold text-[#0B4F8A] hover:underline inline-flex items-center gap-1"
            >
              Open Worklist <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {operationalQueues.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.label}
                  to={q.to}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${q.tone}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-[#0B4F8A] transition">
                        {q.label}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{q.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {q.count}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0B4F8A] transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier 4: Consultant & Speciality Turn-Up Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Consultant &amp; Speciality Turn-Up Performance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Appointment confirmation and reconciled HIS attendance breakdown by doctor
            </p>
          </div>
          <Link
            to="/appointments"
            className="text-xs font-semibold text-[#0B4F8A] hover:underline inline-flex items-center gap-1"
          >
            View All Appointments <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-6">Consultant</th>
                <th className="py-3 px-4">Speciality</th>
                <th className="py-3 px-4">Hospital Unit</th>
                <th className="py-3 px-4 text-right">Booked</th>
                <th className="py-3 px-4 text-right">Confirmed</th>
                <th className="py-3 px-4 text-right">HIS Attended</th>
                <th className="py-3 px-4 text-right">No-Show</th>
                <th className="py-3 px-6">Confirmation Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.doctorAnalysis || []).map((doc: any) => {
                const confPct = doc.booked > 0 ? Math.round((doc.confirmed / doc.booked) * 100) : 0;
                return (
                  <tr key={doc.doctorName} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{doc.doctorName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{doc.department}</td>
                    <td className="py-3.5 px-4 text-slate-600">{doc.hospitalName}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">{doc.booked}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 tabular-nums">{doc.confirmed}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#0B4F8A] tabular-nums">{doc.attended}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-red-600 tabular-nums">{doc.noShows}</td>
                    <td className="py-3.5 px-6 w-48">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0B4F8A] rounded-full"
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-8 text-right">
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

        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
          <span><strong className="text-slate-700">Delivery Rate:</strong> Delivered ÷ API Submitted</span>
          <span><strong className="text-slate-700">Confirmation Rate:</strong> Patient Confirmed ÷ Booked</span>
          <span><strong className="text-slate-700">Turn-Up Conversion:</strong> HIS Arrived ÷ Reconciled Outcomes</span>
        </div>
      </div>
    </div>
  );
};
