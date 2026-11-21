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
  MapPin,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// Ambuja Neotia Bespoke Editorial Palette (Royal Sapphire, Warm Amber Gold, Deep Clinical Emerald, Muted Slate)
const STATUS_COLORS = ['#0B4F8A', '#0F766E', '#E68A00', '#5B84B1', '#C84B31', '#8A94A6'];
const WA_COLORS = ['#072A4D', '#0B4F8A', '#0F766E', '#B8B2A6', '#C84B31'];
const LANG_COLORS = ['#0B4F8A', '#E68A00', '#5B84B1'];

const TOOLTIP_STYLE = {
  backgroundColor: '#072A4D',
  border: 'none',
  borderRadius: '10px',
  color: '#FFFFFF',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 10px 25px rgba(7, 42, 77, 0.22)',
};

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
    { label: 'Confirmation Pending', count: kpis.confirmationPending ?? 0, desc: 'Awaiting patient reply on WhatsApp', to: '/appointments', icon: Clock, tone: 'text-[#B45309] bg-[#FFF8EE]' },
    { label: 'Reschedule Callbacks', count: kpis.rescheduleRequests ?? 0, desc: 'Routed to Altruist desk for new slot', to: '/followups', icon: RefreshCw, tone: 'text-[#0B4F8A] bg-[#F0F6FC]' },
    { label: 'Cancellation Reviews', count: kpis.cancellationRequests ?? 0, desc: 'Pending official HIS verification', to: '/followups', icon: XCircle, tone: 'text-[#B91C1C] bg-red-50' },
    { label: 'Talk-to-Us Assistance', count: kpis.assistanceRequests ?? 0, desc: 'First-visit & campus navigation help', to: '/responses', icon: HelpCircle, tone: 'text-[#072A4D] bg-slate-100' },
    { label: 'Delivery Failure Fallbacks', count: kpis.failedMessages ?? 0, desc: 'Undeliverable WhatsApp escalated to voice', to: '/messages', icon: AlertOctagon, tone: 'text-[#C84B31] bg-orange-50' },
    { label: 'Verified HIS No-Shows', count: kpis.noShows ?? 0, desc: 'Eligible for rebooking outreach', to: '/no-shows', icon: UserX, tone: 'text-[#526277] bg-[#FAF9F6]' },
    { label: 'Active Altruist Queue', count: kpis.pendingFollowUps ?? 0, desc: 'Open human follow-up tasks', to: '/followups', icon: PhoneCall, tone: 'text-[#0F766E] bg-teal-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Bespoke Editorial Masthead Card */}
      <div className="neotia-card rounded-2xl p-6 md:p-7 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] flex">
          <div className="w-28 bg-[#F39200]" />
          <div className="flex-1 bg-[#0B4F8A]/20" />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B4F8A] mb-2">
              <span>Neotia Bhagirathi · Executive Suite</span>
              <span className="text-[#D4CFC5]">•</span>
              <span className="inline-flex items-center gap-1 text-[#64748B] normal-case tracking-normal font-medium">
                <MapPin className="w-3 h-3 text-[#E68A00]" />
                New Town, Kolkata (BN/EN) &amp; Raipur (HI/EN)
              </span>
            </div>
            <h1 className="font-editorial text-3xl md:text-[34px] font-semibold text-[#072A4D] leading-tight">
              Patient Engagement &amp; OPD Conversion
            </h1>
            <p className="text-sm text-[#64748B] mt-1.5 max-w-2xl">
              Real-time visibility across HIS appointment ingestion, WhatsApp utility delivery, patient confirmations, Altruist callbacks, and verified OPD attendance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[#FAF9F6] border border-[#E2DDD4] rounded-full px-3.5 py-2 text-xs text-[#475569]">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent focus:outline-none text-[#072A4D] font-medium"
              />
              <span className="text-[#CBD5E1]">—</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent focus:outline-none text-[#072A4D] font-medium"
              />
            </div>

            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white hover:bg-[#FAF9F6] text-[#475569] border border-[#E2DDD4] rounded-full transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#8A94A6] ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={() =>
                downloadAuthenticatedCsv(
                  `/appointments/export/csv?${queryParams.toString()}`,
                  'neotia-bhagirathi-appointments.csv'
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white hover:bg-[#F0F6FC] text-[#072A4D] border border-[#E2DDD4] rounded-full transition"
            >
              <Download className="w-3.5 h-3.5 text-[#0B4F8A]" />
              Export CSV
            </button>

            <Link
              to="/simulator"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#072A4D] hover:bg-[#0B4F8A] text-white rounded-full transition shadow-sm"
            >
              <PlayCircle className="w-3.5 h-3.5 text-[#F39200]" />
              Journey Simulator
            </Link>
          </div>
        </div>
      </div>

      {/* Tier 1: 4 Sculpted Executive North-Star Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-36 bg-white rounded-2xl border border-[#EAE6DF] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="neotia-card neotia-card-hover rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                Appointments
              </span>
              <div className="w-9 h-9 rounded-full bg-[#F0F6FC] flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-[#0B4F8A]" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-[36px] leading-none font-bold text-[#072A4D] tabular-nums font-display">
                {kpis.appointmentsReceived ?? 0}
              </div>
              <div className="text-xs text-[#64748B] mt-2">
                <strong className="text-[#072A4D] font-semibold">{kpis.completedAppointments ?? 0}</strong> consultations completed
              </div>
            </div>
            <div className="pt-3 border-t border-[#F2EFEA] flex items-center justify-between text-[11px] text-[#8A94A6]">
              <span>HIS Checked-In</span>
              <span className="font-semibold text-[#0B4F8A] tabular-nums">
                {kpis.registeredPatients ?? 0} arrivals
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="neotia-card neotia-card-hover rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                Confirmation Rate
              </span>
              <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[36px] leading-none font-bold text-[#072A4D] tabular-nums font-display">
                  {kpis.confirmationRate ?? 0}%
                </span>
                <span className="text-[11px] font-semibold text-[#0F766E] bg-teal-50 px-2.5 py-0.5 rounded-full">
                  {kpis.confirmedAppointments ?? 0} confirmed
                </span>
              </div>
              <div className="text-xs text-[#64748B] mt-2">Verified via WhatsApp reply</div>
            </div>
            <div className="pt-3 border-t border-[#F2EFEA]">
              <div className="w-full h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F766E] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpis.confirmationRate || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="neotia-card neotia-card-hover rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                WhatsApp Delivery
              </span>
              <div className="w-9 h-9 rounded-full bg-[#F0F6FC] flex items-center justify-center">
                <MailCheck className="w-4 h-4 text-[#0B4F8A]" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[36px] leading-none font-bold text-[#072A4D] tabular-nums font-display">
                  {kpis.deliveryRate ?? 0}%
                </span>
                <span className="text-[11px] font-semibold text-[#0B4F8A] bg-[#F0F6FC] px-2.5 py-0.5 rounded-full">
                  {kpis.readRate ?? 0}% read
                </span>
              </div>
              <div className="text-xs text-[#64748B] mt-2">Meta Cloud API receipts</div>
            </div>
            <div className="pt-3 border-t border-[#F2EFEA] flex items-center justify-between text-[11px] text-[#8A94A6]">
              <span>Delivered / Sent</span>
              <span className="font-semibold text-[#072A4D] tabular-nums">
                {kpis.messagesDelivered ?? 0} / {kpis.messagesSent ?? 0}
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="neotia-card neotia-card-hover rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                OPD Turn-Up
              </span>
              <div className="w-9 h-9 rounded-full bg-[#FFF8EE] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#E68A00]" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-[36px] leading-none font-bold text-[#072A4D] tabular-nums font-display">
                {kpis.attendanceConversionRate ?? 0}%
              </div>
              <div className="text-xs text-[#64748B] mt-2">Reconciled HIS attendance</div>
            </div>
            <div className="pt-3 border-t border-[#F2EFEA]">
              <div className="w-full h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0B4F8A] to-[#F39200] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpis.attendanceConversionRate || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier 2: Asymmetric Flagship Charts (8 + 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 neotia-card rounded-2xl p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-editorial text-xl font-semibold text-[#072A4D]">
                {trendMode === 'trend'
                  ? 'Appointment & Attendance Trajectory'
                  : 'Hospital Performance Comparison'}
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                {trendMode === 'trend'
                  ? 'Daily progression across HIS Bookings, WhatsApp Confirmations, and OPD Arrivals'
                  : 'Side-by-side conversion comparison across New Town (Kolkata) & Raipur'}
              </p>
            </div>

            <div className="inline-flex rounded-full bg-[#FAF9F6] border border-[#EAE6DF] p-1 text-xs font-medium">
              <button
                onClick={() => setTrendMode('trend')}
                className={`px-4 py-1.5 rounded-full transition ${
                  trendMode === 'trend'
                    ? 'bg-[#072A4D] text-white font-semibold shadow-sm'
                    : 'text-[#64748B] hover:text-[#072A4D]'
                }`}
              >
                Daily Trend
              </button>
              <button
                onClick={() => setTrendMode('hospital')}
                className={`px-4 py-1.5 rounded-full transition ${
                  trendMode === 'hospital'
                    ? 'bg-[#072A4D] text-white font-semibold shadow-sm'
                    : 'text-[#64748B] hover:text-[#072A4D]'
                }`}
              >
                By Hospital
              </button>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {trendMode === 'trend' ? (
                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sapphireGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B4F8A" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#0B4F8A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E68A00" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#E68A00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EFEA" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A94A6' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A94A6' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#FFFFFF' }} />
                  <Area type="monotone" dataKey="booked" name="HIS Booked" stroke="#0B4F8A" strokeWidth={2.5} fill="url(#sapphireGrad)" />
                  <Area type="monotone" dataKey="confirmed" name="WA Confirmed" stroke="#E68A00" strokeWidth={2.5} fill="url(#goldGrad)" />
                  <Area type="monotone" dataKey="attended" name="HIS Attended" stroke="#0F766E" strokeWidth={2} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              ) : (
                <BarChart data={overview?.hospitalComparison || []} margin={{ top: 10, right: 12, left: -16, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EFEA" />
                  <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A94A6' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#FFFFFF' }} />
                  <Bar dataKey="appointments" name="Booked" fill="#072A4D" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="messagesDelivered" name="WA Delivered" fill="#5B84B1" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="#E68A00" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="attended" name="HIS Attended" fill="#0F766E" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F2EFEA] flex flex-wrap items-center gap-6 text-xs text-[#526277]">
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0B4F8A]" />HIS Booked</span>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#E68A00]" />WhatsApp Confirmed</span>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />HIS Attended</span>
          </div>
        </div>

        {/* Right 4 Cols: Booking Lifecycle Donut Chart */}
        <div className="lg:col-span-4 neotia-card rounded-2xl p-6 md:p-7 flex flex-col justify-between">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-[#072A4D]">
              Booking Lifecycle
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Current operational state across all OPD slots
            </p>
          </div>

          <div className="relative h-[220px] my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2.5}
                  stroke="none"
                >
                  {statusPieData.map((entry: any, idx: number) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#FFFFFF' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-editorial text-3xl font-bold text-[#072A4D] tabular-nums">
                {kpis.appointmentsReceived ?? 0}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A94A6] mt-0.5">
                Bookings
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#F2EFEA]">
            {statusPieData.map((item: any, idx: number) => {
              const pct = kpis.appointmentsReceived
                ? Math.round((item.value / kpis.appointmentsReceived) * 100)
                : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2.5 text-[#526277] truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold text-[#072A4D] tabular-nums">
                    {item.value} <span className="text-[#8A94A6] font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier 3: Communication Mix Donut + Action Queues (6 + 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 neotia-card rounded-2xl p-6 md:p-7 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-editorial text-xl font-semibold text-[#072A4D]">
                WhatsApp &amp; Reply Analytics
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Delivery funnel, interactive button replies, and language routing
              </p>
            </div>
            <div className="inline-flex rounded-full bg-[#FAF9F6] border border-[#EAE6DF] p-1 text-xs font-medium">
              {[
                { id: 'whatsapp', label: 'Delivery' },
                { id: 'replies', label: 'Replies' },
                { id: 'language', label: 'Language' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInsightTab(t.id as any)}
                  className={`px-3 py-1 rounded-full transition ${
                    insightTab === t.id
                      ? 'bg-[#072A4D] text-white font-semibold'
                      : 'text-[#64748B] hover:text-[#072A4D]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-6 my-auto">
            <div className="sm:col-span-5 relative h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeInsightData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2.5}
                    stroke="none"
                  >
                    {activeInsightData.map((entry: any) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#FFFFFF' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-editorial text-2xl font-bold text-[#072A4D] tabular-nums">
                  {activeInsightTotal}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A94A6]">
                  {insightTab}
                </span>
              </div>
            </div>

            <div className="sm:col-span-7 space-y-3">
              {activeInsightData.map((item: any) => {
                const pct = activeInsightTotal > 0 ? Math.round((item.value / activeInsightTotal) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-[#334155]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name}
                      </span>
                      <span className="font-semibold text-[#072A4D] tabular-nums">
                        {item.value}{' '}
                        <span className="text-[#8A94A6] font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2EFEA] flex items-center justify-between text-xs text-[#64748B]">
            <span>Bengali · Hindi · English Routing</span>
            <Link to="/reports" className="font-semibold text-[#0B4F8A] hover:text-[#E68A00] inline-flex items-center gap-1 transition">
              Explore Full Reports <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 6 Cols: Operational Action Queues */}
        <div className="lg:col-span-6 neotia-card rounded-2xl p-6 md:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-editorial text-xl font-semibold text-[#072A4D]">
                Operational Action Queues
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Live patient exceptions &amp; Altruist care-desk escalations
              </p>
            </div>
            <Link
              to="/followups"
              className="text-xs font-semibold text-[#0B4F8A] hover:text-[#E68A00] inline-flex items-center gap-1 transition"
            >
              Open Worklist <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#F2EFEA]">
            {operationalQueues.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.label}
                  to={q.to}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] -mx-3 px-3 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${q.tone}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#072A4D] group-hover:text-[#0B4F8A] transition">
                        {q.label}
                      </div>
                      <div className="text-[11px] text-[#8A94A6] truncate">{q.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-sm font-bold text-[#072A4D] tabular-nums bg-[#FAF9F6] px-2.5 py-0.5 rounded-full border border-[#EAE6DF]">
                      {q.count}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#E68A00] transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier 4: Consultant & Speciality Leaderboard */}
      <div className="neotia-card rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-[#EAE6DF] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-[#072A4D]">
              Consultant &amp; Speciality Turn-Up Leaderboard
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Appointment confirmations and reconciled HIS attendance across consultants
            </p>
          </div>
          <Link
            to="/appointments"
            className="text-xs font-semibold text-[#0B4F8A] hover:text-[#E68A00] inline-flex items-center gap-1 transition"
          >
            View All Appointments <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-[#EAE6DF] text-[#8A94A6] font-semibold text-[10px] uppercase tracking-[0.12em]">
                <th className="py-3.5 px-7">Consultant</th>
                <th className="py-3.5 px-4">Speciality</th>
                <th className="py-3.5 px-4">Hospital Unit</th>
                <th className="py-3.5 px-4 text-right">Booked</th>
                <th className="py-3.5 px-4 text-right">Confirmed</th>
                <th className="py-3.5 px-4 text-right">HIS Attended</th>
                <th className="py-3.5 px-4 text-right">No-Show</th>
                <th className="py-3.5 px-7">Confirmation Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFEA]">
              {(overview?.doctorAnalysis || []).map((doc: any) => {
                const confPct = doc.booked > 0 ? Math.round((doc.confirmed / doc.booked) * 100) : 0;
                return (
                  <tr key={doc.doctorName} className="hover:bg-[#FAF9F6]/80 transition">
                    <td className="py-4 px-7 font-semibold text-[#072A4D]">{doc.doctorName}</td>
                    <td className="py-4 px-4 text-[#526277]">{doc.department}</td>
                    <td className="py-4 px-4 text-[#526277]">{doc.hospitalName}</td>
                    <td className="py-4 px-4 text-right font-semibold text-[#072A4D] tabular-nums">{doc.booked}</td>
                    <td className="py-4 px-4 text-right font-semibold text-[#0F766E] tabular-nums">{doc.confirmed}</td>
                    <td className="py-4 px-4 text-right font-semibold text-[#0B4F8A] tabular-nums">{doc.attended}</td>
                    <td className="py-4 px-4 text-right font-medium text-[#C84B31] tabular-nums">{doc.noShows}</td>
                    <td className="py-4 px-7 w-52">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#0B4F8A] to-[#E68A00] rounded-full"
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-[#072A4D] tabular-nums w-8 text-right">
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

        <div className="px-7 py-4 bg-[#FAF9F6] border-t border-[#EAE6DF] text-[11px] text-[#64748B] flex flex-wrap gap-x-8 gap-y-1">
          <span><strong className="text-[#072A4D]">Delivery Rate:</strong> Delivered ÷ Submitted to Meta</span>
          <span><strong className="text-[#072A4D]">Confirmation Rate:</strong> Confirmed ÷ Booked</span>
          <span><strong className="text-[#072A4D]">Turn-Up Conversion:</strong> HIS Arrived ÷ Reconciled Outcomes</span>
        </div>
      </div>
    </div>
  );
};
