import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  CalendarX,
  Clock,
  PhoneCall,
  Send,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Users,
  Megaphone,
  Lock,
  Sparkles,
  UserX,
  FileSpreadsheet,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';
import { NeotiaCrossEmblem } from '../components/NeotiaBrandLogo';

// ============================================================================
// PAGE 25: DOCTOR CANCELLATION / DELAY / BULK RESCHEDULE BROADCAST
// ============================================================================
export const DoctorDisruptionPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('ALL_UPCOMING');
  const [disruptionType, setDisruptionType] = useState<'DOCTOR_CANCELLED' | 'DOCTOR_DELAYED'>('DOCTOR_CANCELLED');
  const [delayMinutes, setDelayMinutes] = useState(60);
  const [reason, setReason] = useState('Emergency OT / Unavoidable clinical schedule adjustment');
  const [banner, setBanner] = useState<string | null>(null);
  const [selectedPreviewAction, setSelectedPreviewAction] = useState<'NEXT_SLOT' | 'ANOTHER_DOCTOR' | 'CALL_ME' | null>(null);
  const [lastExecution, setLastExecution] = useState<any>(null);

  const hospParam = selectedHospitalId && selectedHospitalId !== 'ALL' ? `hospitalId=${selectedHospitalId}` : '';

  const { data: doctorsRes } = useQuery({
    queryKey: ['disruption-doctors', selectedHospitalId],
    queryFn: () => apiRequest(`/campaigns/doctor-disruptions/doctors?${hospParam}`),
  });

  const doctors = doctorsRes?.data?.doctors || [];
  const history = doctorsRes?.data?.disruptionHistory || [];

  useEffect(() => {
    if (!selectedDoctor && doctors.length > 0) {
      setSelectedDoctor(doctors[0].doctorName);
    }
  }, [doctors, selectedDoctor]);

  const currentDocObj = doctors.find((d: any) => d.doctorName === selectedDoctor);

  const previewParams = new URLSearchParams();
  if (selectedHospitalId && selectedHospitalId !== 'ALL') previewParams.set('hospitalId', selectedHospitalId);
  if (selectedDoctor) previewParams.set('doctorName', selectedDoctor);
  if (selectedDate) previewParams.set('date', selectedDate);

  const { data: previewRes, isLoading: previewLoading } = useQuery({
    queryKey: ['disruption-preview', selectedHospitalId, selectedDoctor, selectedDate],
    queryFn: () => apiRequest(`/campaigns/doctor-disruptions/preview?${previewParams.toString()}`),
    enabled: Boolean(selectedDoctor),
  });

  const preview = previewRes?.data;

  const executeMutation = useMutation({
    mutationFn: () =>
      apiRequest('/campaigns/doctor-disruptions/execute', {
        method: 'POST',
        body: JSON.stringify({
          hospitalId: selectedHospitalId !== 'ALL' ? selectedHospitalId : undefined,
          doctorName: selectedDoctor,
          date: selectedDate,
          disruptionType,
          delayMinutes: disruptionType === 'DOCTOR_DELAYED' ? delayMinutes : undefined,
          reason,
        }),
      }),
    onSuccess: (res) => {
      const d = res.data;
      setLastExecution(d);
      setBanner(
        `Broadcast executed for ${d.doctorName}: Stopped ${d.remindersStopped} pending reminders, sent ${d.messagesSent} WhatsApp Utility messages (Next Slot / Another Doctor / Call Me), and escalated ${d.altruistTasksCreated} same-day/priority cases to Altruist.`
      );
      queryClient.invalidateQueries({ queryKey: ['disruption-doctors'] });
      queryClient.invalidateQueries({ queryKey: ['disruption-preview'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
    },
    onError: (err: any) => {
      setBanner(`Error: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#062646] via-[#0B4F8A] to-[#083B6B] text-white p-6 shadow-lg border border-[#0D68AF]/40 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, #F39200 0%, #FFB74D 40%, #0D68AF 40%, #38bdf8 100%)' }}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#F39200]/20 border border-[#F39200]/40 text-[#FFB74D] text-[11px] font-bold mb-2">
              <CalendarX className="w-3.5 h-3.5" />
              Use Case 1 • Operational Disruption Engine (Meta UTILITY Category)
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Doctor Cancellation, Delay & Bulk Reschedule Broadcast
            </h1>
            <p className="text-xs text-sky-100/90 mt-1 max-w-3xl">
              Pick a doctor and OPD date to immediately halt pending reminders, send one multilingual WhatsApp Utility alert with interactive options (<strong>Next Available Slot</strong>, <strong>Another Doctor</strong>, <strong>Call Me</strong>), and auto-escalate same-day visits to Altruist.
            </p>
          </div>
          <NeotiaCrossEmblem className="w-10 h-10 opacity-90 hidden sm:block" />
        </div>
      </div>

      {/* HIS-Independent Override Safeguard Box */}
      <div className="bg-[#EBF4FC] border border-[#0B4F8A]/25 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#0B4F8A] shrink-0 mt-0.5" />
        <div className="text-xs text-[#062646] space-y-1">
          <div className="font-bold text-[#0B4F8A]">
            How This Works Even When HIS Is Not Updated Per Booking (HIS-Independent Override Lock)
          </div>
          <p className="text-slate-700 leading-relaxed">
            When an admin triggers a Doctor Cancellation/Delay here, the platform places an internal{' '}
            <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-[#0B4F8A]">
              DOCTOR_DISRUPTION_OVERRIDE
            </code>{' '}
            lock on all affected Booking IDs and cancels their queued reminders. Subsequent HIS polling syncs containing the old appointment time are automatically ignored (preventing duplicate/wrong reminders) until Altruist or the OPD desk updates the booking with a <strong>new slot timestamp</strong> or an <strong>official HIS cancellation</strong>.
          </p>
        </div>
      </div>

      {banner && (
        <div className="p-4 rounded-xl bg-[#FFF4E5] border-2 border-[#F39200] text-[#062646] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#F39200] shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {/* Control Panel + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#062646] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F39200]" />
            1. Configure Doctor Disruption Event
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Consultant / Doctor
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setSelectedDate('ALL_UPCOMING');
              }}
              className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-[#F4F8FC] text-[#062646]"
            >
              {doctors.map((d: any) => (
                <option key={`${d.hospitalId}:${d.doctorName}`} value={d.doctorName}>
                  {d.doctorName} — {d.department} ({d.hospitalCity}) [{d.activeBookingsCount} active]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Affected OPD Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="ALL_UPCOMING">All Active Upcoming Dates for Selected Doctor</option>
              {(currentDocObj?.dates || []).map((dt: string) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDisruptionType('DOCTOR_CANCELLED')}
              className={`p-3 rounded-xl border text-left text-xs transition ${
                disruptionType === 'DOCTOR_CANCELLED'
                  ? 'border-[#F39200] bg-[#FFF4E5] text-[#062646] font-bold shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarX className="w-4 h-4 text-[#F39200] mb-1" />
              OPD Cancelled / Rescheduled
            </button>
            <button
              type="button"
              onClick={() => setDisruptionType('DOCTOR_DELAYED')}
              className={`p-3 rounded-xl border text-left text-xs transition ${
                disruptionType === 'DOCTOR_DELAYED'
                  ? 'border-[#0B4F8A] bg-[#EBF4FC] text-[#062646] font-bold shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4 text-[#0B4F8A] mb-1" />
              Doctor Running Late
            </button>
          </div>

          {disruptionType === 'DOCTOR_DELAYED' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimated Delay (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Audit Reason (Non-Clinical)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          {/* WhatsApp Utility Message Preview */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#FFB74D]">Meta UTILITY Template Preview</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                UTILITY (Service Alert)
              </span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              "Namaskar {'{{patient_name}}'}, due to an unavoidable schedule update, <strong>{selectedDoctor || 'Doctor'}</strong>'s OPD on {'{{date}}'} at {'{{time}}'} is{' '}
              {disruptionType === 'DOCTOR_DELAYED' ? `delayed by ${delayMinutes} mins` : 'cancelled/rescheduled'}. Please choose how you would like to proceed:"
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: 'NEXT_SLOT', label: 'Next Available Slot', color: 'bg-[#0B4F8A] hover:bg-[#0D68AF]' },
                { id: 'ANOTHER_DOCTOR', label: 'See Another Doctor', color: 'bg-[#0B4F8A] hover:bg-[#0D68AF]' },
                { id: 'CALL_ME', label: 'Call Me (Altruist)', color: 'bg-[#F39200] hover:bg-[#E07B00]' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedPreviewAction(btn.id as any)}
                  className={`px-2.5 py-1 rounded text-white font-semibold transition cursor-pointer ${btn.color} ${
                    selectedPreviewAction === btn.id ? 'ring-2 ring-white shadow-md scale-[1.02]' : ''
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            {selectedPreviewAction && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-800 border border-sky-400/30 text-[11px] text-sky-100">
                <strong className="text-[#FFB74D] block mb-0.5">
                  Simulated Patient Tap → {selectedPreviewAction.replace('_', ' ')}:
                </strong>
                {selectedPreviewAction === 'NEXT_SLOT' &&
                  'Sets booking to RESCHEDULE_REQUESTED (never auto-allocates slots), sends multilingual acknowledgement, and queues High-Priority Altruist callback with next available slot preferences.'}
                {selectedPreviewAction === 'ANOTHER_DOCTOR' &&
                  'Routes to Altruist Desk with same-department alternate consultant list (e.g., OB-GYN / Paediatrics) so agent confirms replacement slot in HIS.'}
                {selectedPreviewAction === 'CALL_ME' &&
                  'Creates CRITICAL-priority Altruist callback task immediately (2-hour SLA; immediate for same-day OPD visits) and notifies patient that a care coordinator will call shortly.'}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={executeMutation.isPending || !preview || preview.totalAffected === 0}
            onClick={() => executeMutation.mutate()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F39200] to-[#E07B00] hover:from-[#E07B00] hover:to-[#CC6E00] disabled:opacity-40 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {executeMutation.isPending
              ? 'Stopping Reminders & Dispatching Broadcast...'
              : `Stop ${preview?.totalPendingRemindersToStop ?? 0} Reminders & Notify ${preview?.totalAffected ?? 0} Affected Patients`}
          </button>

          {lastExecution && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Disruption Broadcast Executed for {lastExecution.doctorName}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-lg p-2 border border-emerald-200">
                  <div className="text-base font-extrabold text-[#0B4F8A]">{lastExecution.remindersStopped}</div>
                  <div className="text-[10px] text-slate-600">Reminders Halted</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-200">
                  <div className="text-base font-extrabold text-emerald-700">{lastExecution.messagesSent}</div>
                  <div className="text-[10px] text-slate-600">WA Alerts Sent</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-200">
                  <div className="text-base font-extrabold text-[#D97E00]">{lastExecution.altruistTasksCreated}</div>
                  <div className="text-[10px] text-slate-600">Altruist Calls</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/messages"
                  className="px-3 py-1 rounded-md bg-[#0B4F8A] text-white font-semibold text-[11px] hover:bg-[#0D68AF]"
                >
                  View Sent WhatsApp Alerts →
                </Link>
                <Link
                  to="/followups"
                  className="px-3 py-1 rounded-md bg-[#F39200] text-white font-semibold text-[11px] hover:bg-[#E07B00]"
                >
                  Open Altruist Callback Queue →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right: Affected Patients Live Impact Preview */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#062646]">
                  2. Impact Preview — Affected Patients ({preview?.totalAffected ?? 0})
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time list of active bookings matched to {selectedDoctor || 'selected doctor'}
                </p>
              </div>
              <div className="flex gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-full bg-[#EBF4FC] text-[#0B4F8A]">
                  {preview?.totalPendingRemindersToStop ?? 0} Pending Reminders Halted
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#FFF4E5] text-[#B86200]">
                  {preview?.sameDayAltruistEscalations ?? 0} Altruist Callbacks
                </span>
              </div>
            </div>

            {previewLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading affected appointments...</div>
            ) : (preview?.affectedPatients || []).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                No active upcoming appointments for this doctor/date selection. Choose another consultant above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4F8FC] border-b border-slate-200 text-[#062646] uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Booking & Patient</th>
                      <th className="py-2.5 px-3">Date & Slot</th>
                      <th className="py-2.5 px-3">Lang</th>
                      <th className="py-2.5 px-3">Reminders Stopped</th>
                      <th className="py-2.5 px-3">Routing Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(preview?.affectedPatients || []).map((p: any) => (
                      <tr key={p.appointmentId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[#062646]">{p.patientName}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {p.bookingId} • {p.mobileNumber}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {p.appointmentDate} <span className="text-[#0B4F8A] font-bold">{p.appointmentTime}</span>
                          {p.isSameDay && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                              SAME-DAY
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 uppercase font-bold text-[#0B4F8A]">
                          {p.preferredLanguage}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">
                          {p.pendingRemindersToStop} queued
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-1">
                            {p.whatsappEligible ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <Send className="w-3 h-3" /> 1 Utility WhatsApp
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-600">
                                WA Suppressed (Opted Out)
                              </span>
                            )}
                            {p.altruistCallbackRequired && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97E00]">
                                <PhoneCall className="w-3 h-3" /> Altruist Priority Call
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Execution History */}
          {history.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="text-xs font-bold text-[#062646] mb-2">
                Recent Disruption Broadcasts Executed
              </div>
              <div className="space-y-2">
                {history.slice(0, 3).map((h: any) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-lg bg-[#F4F8FC] border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                  >
                    <div>
                      <strong className="text-[#0B4F8A]">{h.doctorName}</strong> ({h.disruptionType}) —{' '}
                      {h.affectedCount} patients, {h.remindersStopped} reminders halted, {h.altruistTasksCreated} Altruist calls
                    </div>
                    <span className="text-slate-500">
                      {new Date(h.executedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE 26: MULTI-SEGMENT RE-TARGETING & META CONSENT GOVERNANCE
// ============================================================================
export const RetargetingConsolePage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'NO_SHOW_UNREBOOKED' | 'CANCELLED_NO_SLOT' | 'UNCONVERTED_FORM_LEADS'>('NO_SHOW_UNREBOOKED');
  const [feedback, setFeedback] = useState<string | null>(null);

  const hospParam = selectedHospitalId && selectedHospitalId !== 'ALL' ? `hospitalId=${selectedHospitalId}` : '';

  const { data, isLoading } = useQuery({
    queryKey: ['retargeting-cohorts', selectedHospitalId],
    queryFn: () => apiRequest(`/campaigns/retargeting/cohorts?${hospParam}`),
  });

  const launchMutation = useMutation({
    mutationFn: (segment: string) =>
      apiRequest('/campaigns/retargeting/launch', {
        method: 'POST',
        body: JSON.stringify({
          segment,
          hospitalId: selectedHospitalId !== 'ALL' ? selectedHospitalId : undefined,
        }),
      }),
    onSuccess: (res) => {
      const c = res.data;
      setFeedback(
        `Campaign launched for "${c.segmentTitle}" (${c.metaCategory}): Dispatched ${c.dispatchedCount} consent-verified messages; suppressed ${c.suppressedCount} blocked/opted-out contacts.`
      );
      queryClient.invalidateQueries({ queryKey: ['retargeting-cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
    },
    onError: (err: any) => setFeedback(`Error: ${err.message}`),
  });

  const segments = data?.data?.segments || {};
  const history = data?.data?.campaignHistory || [];
  const activeSeg = segments[activeTab];

  const totalEligible =
    (segments.NO_SHOW_UNREBOOKED?.eligibleCount || 0) +
    (segments.CANCELLED_NO_SLOT?.eligibleCount || 0) +
    (segments.UNCONVERTED_FORM_LEADS?.eligibleCount || 0);
  const totalBlocked =
    (segments.NO_SHOW_UNREBOOKED?.blockedCount || 0) +
    (segments.CANCELLED_NO_SLOT?.blockedCount || 0) +
    (segments.UNCONVERTED_FORM_LEADS?.blockedCount || 0);

  const consentPieData = [
    { name: 'Consent-Eligible Contacts', value: totalEligible, color: '#0B4F8A' },
    { name: 'Suppressed (No Opt-In / STOP / Holdout)', value: totalBlocked, color: '#F39200' },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#062646] via-[#0B4F8A] to-[#083B6B] text-white p-6 shadow-lg border border-[#0D68AF]/40 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, #F39200 0%, #FFB74D 40%, #0D68AF 40%, #38bdf8 100%)' }}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#F39200]/20 border border-[#F39200]/40 text-[#FFB74D] text-[11px] font-bold mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              Use Case 2 • Multi-Segment Re-Targeting & Meta Category Compliance
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Patient Re-Targeting & Lead Re-Engagement Console
            </h1>
            <p className="text-xs text-sky-100/90 mt-1 max-w-3xl">
              Re-engage <strong>No-Shows without rebooking</strong>, <strong>Cancelled patients without a new slot</strong>, and <strong>Website/Ad form-fillers who never booked</strong> — with automated Meta <strong>UTILITY vs MARKETING</strong> classification and dual-consent enforcement.
            </p>
          </div>
          <NeotiaCrossEmblem className="w-10 h-10 opacity-90 hidden sm:block" />
        </div>
      </div>

      {/* Meta Category & Consent Governance Matrix + Consent Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#062646] mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B4F8A]" />
            Meta WhatsApp Template Category & Dual-Consent Governance Rules
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F8FC] border-b border-slate-200 text-[#062646] uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Re-Targeting Cohort</th>
                  <th className="py-2.5 px-3">Meta Category</th>
                  <th className="py-2.5 px-3">Required Consent Tier</th>
                  <th className="py-2.5 px-3">Eligible / Blocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-[#062646]">1. No-Shows Who Didn't Rebook</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      UTILITY (≤72h)
                    </span>{' '}
                    <span className="px-2 py-0.5 rounded bg-[#FFF4E5] text-[#B86200] font-bold text-[10px]">
                      MARKETING (&gt;72h)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Appointment Service Consent (excludes Pilot Control Holdout & STOP)
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className="text-emerald-700">{segments.NO_SHOW_UNREBOOKED?.eligibleCount ?? 0}</span> /{' '}
                    <span className="text-red-600">{segments.NO_SHOW_UNREBOOKED?.blockedCount ?? 0}</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-[#062646]">2. Cancelled Without New Slot</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-[#FFF4E5] text-[#B86200] font-bold text-[10px]">
                      MARKETING (Mandatory)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Separate Explicit Marketing Opt-In + Instant STOP opt-out
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className="text-emerald-700">{segments.CANCELLED_NO_SLOT?.eligibleCount ?? 0}</span> /{' '}
                    <span className="text-red-600">{segments.CANCELLED_NO_SLOT?.blockedCount ?? 0}</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-[#062646]">3. Form-Fillers Who Never Booked</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-[#FFF4E5] text-[#B86200] font-bold text-[10px]">
                      MARKETING (Mandatory)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Explicit Web-Form Marketing Opt-In Checkbox + 14-day Frequency Cap (max 2)
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className="text-emerald-700">{segments.UNCONVERTED_FORM_LEADS?.eligibleCount ?? 0}</span> /{' '}
                    <span className="text-red-600">{segments.UNCONVERTED_FORM_LEADS?.blockedCount ?? 0}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Consent Eligibility Donut Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#062646]">
              Consent Guardrail Filter (Pie)
            </h3>
            <p className="text-xs text-slate-500">
              Automatic suppression of missing opt-ins, STOP replies & control holdouts
            </p>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={consentPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={4}
                >
                  {consentPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-[#FFF4E5] border-2 border-[#F39200] text-[#062646] text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F39200] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Cohort Tabs & Contact List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'NO_SHOW_UNREBOOKED', label: 'No-Shows (Unrebooked)', icon: UserX },
              { id: 'CANCELLED_NO_SLOT', label: 'Cancelled (No New Slot)', icon: CalendarX },
              { id: 'UNCONVERTED_FORM_LEADS', label: 'Web Form Leads (Never Booked)', icon: FileSpreadsheet },
            ].map((tab) => {
              const Icon = tab.icon;
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                    isAct
                      ? 'bg-[#0B4F8A] text-white shadow-sm'
                      : 'bg-[#F4F8FC] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label} ({segments[tab.id]?.total ?? 0})
                </button>
              );
            })}
          </div>

          <button
            disabled={launchMutation.isPending || !activeSeg || activeSeg.eligibleCount === 0}
            onClick={() => launchMutation.mutate(activeTab)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#F39200] to-[#E07B00] hover:from-[#E07B00] hover:to-[#CC6E00] disabled:opacity-40 text-white text-xs font-bold shadow-md transition"
          >
            <Send className="w-3.5 h-3.5" />
            Launch Re-Engagement ({activeSeg?.eligibleCount ?? 0} Eligible)
          </button>
        </div>

        {activeSeg && (
          <div className="p-3 rounded-lg bg-[#F4F8FC] border border-[#0B4F8A]/15 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-[#0B4F8A]">Meta Category Rule:</strong> {activeSeg.metaCategoryRule}
            </div>
            <div>
              <strong className="text-[#D97E00]">Consent Enforcement:</strong> {activeSeg.consentRule}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading cohort records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Ref ID & Contact</th>
                  <th className="py-2.5 px-3">Hospital & Speciality</th>
                  <th className="py-2.5 px-3">Source / Doctor</th>
                  <th className="py-2.5 px-3">Meta Category</th>
                  <th className="py-2.5 px-3">Consent Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeSeg?.records || []).map((rec: any) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#062646]">{rec.patientName}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {rec.referenceCode} • {rec.mobileNumber} ({rec.preferredLanguage?.toUpperCase()})
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#0B4F8A]">{rec.hospitalCity}</div>
                      <div className="text-[11px] text-slate-500">{rec.department}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{rec.doctorName}</div>
                      <div className="text-[10px] text-slate-400">{rec.eventDate}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          rec.metaCategory === 'UTILITY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#FFF4E5] text-[#B86200]'
                        }`}
                      >
                        {rec.metaCategory}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {rec.eligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Eligible ({rec.consentRequired})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold text-[10px]">
                          <ShieldAlert className="w-3 h-3" /> Blocked: {rec.blockReason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <div className="text-xs font-bold text-[#062646] mb-2">
              Recent Re-Targeting Campaigns Launched
            </div>
            <div className="space-y-1.5">
              {history.slice(0, 4).map((c: any) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg bg-[#F4F8FC] border border-slate-200 flex items-center justify-between text-[11px]"
                >
                  <span>
                    <strong className="text-[#0B4F8A]">{c.segmentTitle}</strong> ({c.metaCategory}) — Sent:{' '}
                    <strong className="text-emerald-700">{c.dispatchedCount}</strong>, Suppressed:{' '}
                    <strong className="text-red-600">{c.suppressedCount}</strong>
                  </span>
                  <span className="text-slate-500">{new Date(c.launchedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
