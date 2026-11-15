import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PhoneCall,
  Download,
  CheckCircle2,
  AlertTriangle,
  UserX,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// ============================================================================
// PAGE 10: CALL-CENTRE / ALTRUIST FOLLOW-UP WORKLIST
// ============================================================================
export const FollowUpWorklistPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (statusFilter !== 'ALL') params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['followups', selectedHospitalId, statusFilter],
    queryFn: () => apiRequest(`/followups?${params.toString()}`),
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents', selectedHospitalId],
    queryFn: () => apiRequest(`/users/agents?${params.toString()}`),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      status?: string;
      assignedAgentId?: string;
      note?: string;
      resolutionNotes?: string;
    }) =>
      apiRequest(`/followups/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
    },
  });

  const tasks = data?.data || [];
  const agents = agentsData?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Call-Centre & Altruist Follow-Up Worklist
          </h1>
          <p className="text-xs text-slate-500">
            Actionable human intervention queue for reschedule requests, cancellation reviews, assistance, and delivery failures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="ALL">All Task Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REOPENED">REOPENED</option>
          </select>

          <button
            onClick={() =>
              downloadAuthenticatedCsv(
                `/followups/export/csv?${params.toString()}`,
                'altruist-followup-worklist.csv'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Export Altruist Worklist CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading worklist...</div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {task.taskCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${task.priority === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}
                    >
                      {task.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold">
                      {task.taskType}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">
                      {task.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {task.patient?.fullName} ({task.patient?.mobileNumber}) — Booking {task.appointment?.bookingId}
                  </div>
                  <div className="text-xs text-slate-500">
                    {task.hospital?.name} • {task.appointment?.doctorName} ({task.appointment?.appointmentDate?.split('T')[0]} at {task.appointment?.appointmentTime})
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    <strong>Trigger:</strong> {task.triggerReason}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={task.assignedAgentId || ''}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: task.id,
                        assignedAgentId: e.target.value,
                      })
                    }
                    className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((ag: any) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.agentCode} — {ag.user?.fullName}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() =>
                      updateMutation.mutate({ id: task.id, status: 'IN_PROGRESS' })
                    }
                    className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() =>
                      updateMutation.mutate({ id: task.id, status: 'ESCALATED' })
                    }
                    className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold"
                  >
                    Escalate
                  </button>
                  {task.status !== 'RESOLVED' ? (
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: task.id,
                          status: 'RESOLVED',
                          resolutionNotes:
                            noteInputs[task.id] ||
                            'Patient contacted by Altruist agent and request resolved with hospital desk.',
                        })
                      }
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        updateMutation.mutate({ id: task.id, status: 'REOPENED' })
                      }
                      className="px-2.5 py-1 rounded bg-slate-800 text-white font-semibold"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Internal Notes & Add Note */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-[11px] text-slate-500">
                  Altruist Sync: <strong>{task.altruistSyncStatus}</strong>
                  {task.resolutionNotes && ` • Resolution: ${task.resolutionNotes}`}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add agent call note or resolution remark..."
                    value={noteInputs[task.id] || ''}
                    onChange={(e) =>
                      setNoteInputs({ ...noteInputs, [task.id]: e.target.value })
                    }
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs w-64"
                  />
                  <button
                    onClick={() => {
                      if (!noteInputs[task.id]) return;
                      updateMutation.mutate({
                        id: task.id,
                        note: noteInputs[task.id],
                      });
                      setNoteInputs({ ...noteInputs, [task.id]: '' });
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 11: CALL-CENTRE AGENT MANAGEMENT
// ============================================================================
export const AgentManagementPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);

  const { data, isLoading } = useQuery({
    queryKey: ['agents-page', selectedHospitalId],
    queryFn: () => apiRequest(`/users/agents?${params.toString()}`),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: 'AVAILABLE' | 'BUSY' | 'OFFLINE' }) =>
      apiRequest(`/users/agents/${vars.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: vars.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-page'] });
    },
  });

  const agents = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Call-Centre & Altruist Agent Management
        </h1>
        <p className="text-xs text-slate-500">
          Manage agent availability, language skills (Bengali, Hindi, English), and active task queues
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading agents...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((ag: any) => (
            <div
              key={ag.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-700">
                    {ag.agentCode} • {ag.teamName}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {ag.user?.fullName}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {ag.user?.email} • {ag.hospital?.name}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ag.status === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ag.status === 'BUSY'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {ag.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {ag.activeQueueCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Active Queue</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-700">
                    {ag.resolvedCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Resolved Tasks</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-teal-700 uppercase mt-1">
                    {(ag.languagesSpoken || []).join(', ')}
                  </div>
                  <div className="text-[11px] text-slate-500">Languages</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 text-xs">
                {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => statusMutation.mutate({ id: ag.id, status: st })}
                    className={`px-3 py-1 rounded font-semibold border ${ag.status === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    Set {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 12: NO-SHOW & REBOOKING ENGINE
// ============================================================================
export const NoShowManagementPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);

  const { data: apptsData } = useQuery({
    queryKey: ['noshow-appts', selectedHospitalId],
    queryFn: () => apiRequest(`/appointments?${params.toString()}`),
  });

  const reconcileNoShowMutation = useMutation({
    mutationFn: (vars: { bookingId: string; hospitalId: string }) =>
      apiRequest('/attendance/reconcile', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: vars.bookingId,
          hospitalId: vars.hospitalId,
          outcomeStatus: 'NO_SHOW',
        }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['noshow-appts'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setFeedback(
        `Verified HIS NO_SHOW recorded for ${res.data.record.bookingId}. Rebooking prompt sent: ${res.data.rebookingSent ? 'YES (Approved Utility Template)' : 'SUPPRESSED (Control Group / Opt-Out)'}.`
      );
    },
  });

  const appointments = apptsData?.data || [];
  const noShowAppts = appointments.filter((a: any) => a.status === 'NO_SHOW' || a.attendanceStatus === 'NO_SHOW');
  const pendingAppts = appointments.filter((a: any) =>
    ['CONFIRMED', 'CONFIRMATION_PENDING', 'VALIDATED'].includes(a.status)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          No-Show & Rebooking Engine
        </h1>
        <p className="text-xs text-slate-500">
          Strict Operating Rule: Never sends a no-show prompt merely because appointment time passed; requires verified HIS NO_SHOW attendance feed
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Verified HIS No-Show Appointments ({noShowAppts.length})
          </h3>
          <div className="space-y-2.5">
            {noShowAppts.map((a: any) => (
              <div
                key={a.id}
                className="p-3 rounded-lg bg-red-50/60 border border-red-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {a.bookingId} — {a.patientName}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {a.doctorName} • {a.hospital?.city} • Lang: {a.preferredLanguage.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Cohort: {a.holdoutAssignment?.cohortGroup || 'TREATMENT'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                  NO_SHOW
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Simulate Verified HIS No-Show Feed & Rebooking Trigger
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Select an active appointment to simulate receiving an HIS NO_SHOW outcome and trigger the rebooking workflow:
          </p>
          <div className="space-y-2.5">
            {pendingAppts.slice(0, 6).map((a: any) => (
              <div
                key={a.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {a.bookingId} — {a.patientName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {a.doctorName} ({a.hospital?.city})
                  </div>
                </div>
                <button
                  onClick={() =>
                    reconcileNoShowMutation.mutate({
                      bookingId: a.bookingId,
                      hospitalId: a.hospitalId,
                    })
                  }
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-red-700 text-white text-[11px] font-semibold"
                >
                  Feed HIS No-Show & Trigger Rebooking
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE 13: CONSENT & DATA PROTECTION MANAGEMENT
// ============================================================================
export const ConsentManagementPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);

  const { data, isLoading } = useQuery({
    queryKey: ['consents', selectedHospitalId],
    queryFn: () => apiRequest(`/consent?${params.toString()}`),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; consentStatus: 'GRANTED' | 'REVOKED' }) =>
      apiRequest(`/consent/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          consentStatus: vars.consentStatus,
          consentSource: vars.consentStatus === 'REVOKED' ? 'ADMIN_STOP_OVERRIDE' : 'REGISTRATION_DESK',
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] });
    },
  });

  const consents = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Patient Consent, STOP Opt-Out & Data Protection
        </h1>
        <p className="text-xs text-slate-500">
          Pre-queue and pre-send consent checks • Instant suppression of pending reminders on STOP opt-out
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading consent ledger...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Hospital Unit</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Opt-Out (STOP)</th>
                <th className="py-3 px-4">Outbound Eligible</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consents.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-900">{c.patient?.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {c.patient?.mobileNumber}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">{c.hospital?.name}</td>
                  <td className="py-2.5 px-4 font-bold">{c.consentStatus}</td>
                  <td className="py-2.5 px-4 text-slate-600">{c.consentSource}</td>
                  <td className="py-2.5 px-4">
                    {c.optOutStatus ? (
                      <span className="text-red-600 font-bold">
                        YES ({c.optOutReason || 'STOP'})
                      </span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    {c.communicationEligible ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        ELIGIBLE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                        SUPPRESSED
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {c.communicationEligible ? (
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ id: c.id, consentStatus: 'REVOKED' })
                        }
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold"
                      >
                        Process Opt-Out (STOP)
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ id: c.id, consentStatus: 'GRANTED' })
                        }
                        className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold"
                      >
                        Restore Desk Consent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PAGE 14: HIS ATTENDANCE RECONCILIATION
// ============================================================================
export const AttendanceReconciliationPage: React.FC = () => {
  const { selectedHospitalId, hospitals } = useHospitalFilter();
  const queryClient = useQueryClient();
  const defaultHospitalId =
    selectedHospitalId !== 'ALL' ? selectedHospitalId : hospitals[0]?.id || '';

  const [bookingId, setBookingId] = useState('NTK-BK-2026-1001');
  const [outcomeStatus, setOutcomeStatus] = useState<'ARRIVED' | 'REGISTERED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'>('REGISTERED');
  const [feedback, setFeedback] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', selectedHospitalId],
    queryFn: () => apiRequest(`/attendance?${params.toString()}`),
  });

  const reconcileMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/attendance/reconcile', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
      setFeedback(
        res.data.matched
          ? `Matched Booking ${res.data.record.bookingId} -> Outcome: ${res.data.record.outcomeStatus}`
          : `Unmatched Booking '${res.data.record.bookingId}' logged as UNMATCHED (never auto-classified as arrived or no-show).`
      );
    },
  });

  const records = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          HIS Registration & Attendance Reconciliation
        </h1>
        <p className="text-xs text-slate-500">
          Matches HIS registration outcomes by stable Booking ID • Isolates UNMATCHED records without false classification
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {feedback}
        </div>
      )}

      {/* Reconcile Input Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Booking ID (Enter unknown ID to test UNMATCHED rule)
          </label>
          <input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 w-60 font-mono"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            HIS Outcome Status
          </label>
          <select
            value={outcomeStatus}
            onChange={(e) => setOutcomeStatus(e.target.value as any)}
            className="border border-slate-300 rounded px-3 py-1.5 bg-white"
          >
            <option value="ARRIVED">ARRIVED</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="NO_SHOW">NO_SHOW</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <button
          onClick={() =>
            reconcileMutation.mutate({
              bookingId,
              hospitalId: defaultHospitalId,
              outcomeStatus,
            })
          }
          className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold"
        >
          Reconcile HIS Outcome
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading attendance records...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-4">External Visit ID</th>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Hospital</th>
                <th className="py-3 px-4">Match Status</th>
                <th className="py-3 px-4">Outcome Status</th>
                <th className="py-3 px-4">Rebooking Sent</th>
                <th className="py-3 px-4">Reconciled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-600">{r.externalVisitId}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{r.bookingId}</td>
                  <td className="py-2.5 px-4">{r.hospital?.city}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.matchStatus === 'UNMATCHED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                        }`}
                    >
                      {r.matchStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold">{r.outcomeStatus}</td>
                  <td className="py-2.5 px-4">
                    {r.rebookingPromptSent ? 'Sent via WhatsApp' : 'N/A'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {new Date(r.reconciledAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

