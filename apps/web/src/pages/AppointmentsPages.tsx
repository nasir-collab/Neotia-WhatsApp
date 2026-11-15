import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Search,
  Eye,
  XCircle,
  Send,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// ============================================================================
// PAGE 3: APPOINTMENT MANAGEMENT
// ============================================================================
export const AppointmentManagementPage: React.FC = () => {
  const { selectedHospitalId, hospitals } = useHospitalFilter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const defaultHospitalId =
    selectedHospitalId !== 'ALL' ? selectedHospitalId : hospitals[0]?.id || '';

  const [form, setForm] = useState({
    bookingId: `BK-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
    externalPatientId: `UHID-${Math.floor(Math.random() * 900 + 100)}`,
    patientName: '',
    mobileNumber: '+9198300',
    preferredLanguage: 'bn',
    hospitalId: '',
    department: 'Obstetrics & Gynaecology',
    doctorName: 'Dr. Ananya Chatterjee',
    appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    appointmentTime: '11:00',
    bookingSource: 'HIS_API',
    isFirstVisit: true,
  });

  const [bulkJsonText, setBulkJsonText] = useState(
    JSON.stringify(
      [
        {
          bookingId: 'HIS-BULK-3001',
          externalPatientId: 'UHID-BULK-301',
          patientName: 'Nabanita Sen (SYNTHETIC BULK)',
          mobileNumber: '+919830033001',
          preferredLanguage: 'bn',
          department: 'Obstetrics & Gynaecology',
          doctorName: 'Dr. Ananya Chatterjee',
          appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          appointmentTime: '10:30',
        },
      ],
      null,
      2
    )
  );

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (statusFilter !== 'ALL') params.set('status', statusFilter);
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', selectedHospitalId, statusFilter, search],
    queryFn: () => apiRequest(`/appointments?${params.toString()}`),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
      setShowCreateModal(false);
      setFeedback(
        res.data?.duplicateSkipped
          ? `Duplicate booking ID ignored safely (${res.data.message})`
          : `Ingested appointment ${res.data?.appointment?.bookingId} and scheduled WhatsApp reminders.`
      );
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/appointments/bulk-import', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowImportModal(false);
      setFeedback(
        `Bulk import completed: ${res.data.insertedRecords} inserted, ${res.data.updatedRecords} updated, ${res.data.duplicateSkipped} duplicates skipped.`
      );
    },
  });

  const appointments = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Appointment Management & HIS Ingestion
          </h1>
          <p className="text-xs text-slate-500">
            Deduplicated by stable Booking ID • Automatic language routing & reminder scheduling
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setForm((f) => ({
                ...f,
                hospitalId: defaultHospitalId,
                bookingId: `BK-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
              }));
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            New Appointment
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import (HIS JSON/CSV)
          </button>
          <button
            onClick={() =>
              downloadAuthenticatedCsv(
                `/appointments/export/csv?${params.toString()}`,
                'anhvl-appointments-export.csv'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-teal-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Booking ID, Patient Name, Mobile, Doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="ALL">All Appointment Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CONFIRMATION_PENDING">Confirmation Pending</option>
          <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
          <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
          <option value="CANCELLED">Cancelled (Confirmed)</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No-Show</option>
        </select>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No appointments match your current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <th className="py-3 px-3">Booking ID</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Hospital & Lang</th>
                  <th className="py-3 px-3">Doctor & Dept</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Appt Status</th>
                  <th className="py-3 px-3">HIS Attendance</th>
                  <th className="py-3 px-3">Pilot Cohort</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt: any) => (
                  <tr key={appt.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                      {appt.bookingId}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{appt.patientName}</div>
                      <div className="text-[11px] text-slate-500">{appt.mobileNumber}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{appt.hospital?.city}</div>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                        {appt.preferredLanguage}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{appt.doctorName}</div>
                      <div className="text-[11px] text-slate-500">{appt.department}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium">
                        {appt.appointmentDate?.split('T')[0]}
                      </div>
                      <div className="text-[11px] text-slate-500">{appt.appointmentTime} IST</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.status === 'CONFIRMED' || appt.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : appt.status.includes('REQUESTED')
                            ? 'bg-amber-100 text-amber-800'
                            : appt.status === 'NO_SHOW' || appt.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {appt.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {appt.holdoutAssignment ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            appt.holdoutAssignment.cohortGroup === 'CONTROL'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {appt.holdoutAssignment.cohortGroup}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standard</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to={`/appointments/${appt.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-teal-700 text-white text-[11px] font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Ingest New Appointment & Schedule WhatsApp Journey
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  ...form,
                  hospitalId: form.hospitalId || defaultHospitalId,
                });
              }}
              className="grid grid-cols-2 gap-3 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700">Hospital Unit</label>
                <select
                  value={form.hospitalId || defaultHospitalId}
                  onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                >
                  {hospitals.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.city} ({h.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">External Booking ID</label>
                <input
                  required
                  value={form.bookingId}
                  onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Patient Full Name</label>
                <input
                  required
                  placeholder="e.g. Ruma Chatterjee (SYNTHETIC)"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Mobile Number</label>
                <input
                  required
                  value={form.mobileNumber}
                  onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Preferred Language</label>
                <select
                  value={form.preferredLanguage}
                  onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                >
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Consultant Doctor</label>
                <input
                  required
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Appointment Date</label>
                <input
                  type="date"
                  required
                  value={form.appointmentDate}
                  onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Appointment Time (24h)</label>
                <input
                  type="time"
                  required
                  value={form.appointmentTime}
                  onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-1.5 rounded bg-teal-600 text-white font-semibold"
                >
                  {createMutation.isPending ? 'Ingesting...' : 'Ingest & Schedule WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Bulk HIS Appointment Import (JSON / CSV Payload)
            </h3>
            <p className="text-xs text-slate-500">
              Records are validated, deduplicated by Booking ID, and scheduled for confirmation & reminders.
            </p>
            <textarea
              rows={10}
              value={bulkJsonText}
              onChange={(e) => setBulkJsonText(e.target.value)}
              className="w-full font-mono text-xs border rounded-lg p-3 bg-slate-50"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 rounded border text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(bulkJsonText);
                    bulkMutation.mutate({
                      hospitalId: defaultHospitalId,
                      records: Array.isArray(parsed) ? parsed : [parsed],
                      source: 'BULK_UPLOAD',
                    });
                  } catch {
                    alert('Invalid JSON array format');
                  }
                }}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold"
              >
                Run Bulk Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 4: APPOINTMENT DETAILS & INTERACTIVE LIFECYCLE
// ============================================================================
export const AppointmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment-detail', id],
    queryFn: () => apiRequest(`/appointments/${id}`),
  });

  const appt = data?.data;

  const responseMutation = useMutation({
    mutationFn: (payload: { rawResponseText: string; buttonPayload?: string }) =>
      apiRequest('/responses/capture', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: id,
          rawResponseText: payload.rawResponseText,
          buttonPayload: payload.buttonPayload,
        }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', id] });
      setActionFeedback(`Processed patient response: ${res.data.mappedAction}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/appointments/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Official HIS / Hospital Registration Desk Cancellation Confirmation',
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', id] });
      setActionFeedback(
        'Confirmed official HIS cancellation and suppressed all pending scheduled reminders.'
      );
    },
  });

  const testMessageMutation = useMutation({
    mutationFn: (category: string) =>
      apiRequest('/messages/test', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: id,
          category,
          simulateDeliveryReceiptInDemo: true,
        }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', id] });
      setActionFeedback(
        res.data?.suppressed
          ? `Message suppressed by Consent/Holdout Guard: ${res.data.reason}`
          : `Dispatched template message -> Status: ${res.data?.messageLog?.status}`
      );
    },
  });

  if (isLoading) {
    return <div className="p-8 text-xs text-slate-500">Loading appointment lifecycle...</div>;
  }
  if (!appt) {
    return <div className="p-8 text-xs text-red-600">Appointment not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/appointments"
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Booking {appt.bookingId}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900">
                {appt.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {appt.patientName} ({appt.mobileNumber}) • {appt.hospital?.name} • Language: {appt.preferredLanguage.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => testMessageMutation.mutate('APPOINTMENT_CONFIRMATION')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            Send Confirmation
          </button>
          <button
            onClick={() => testMessageMutation.mutate('DIRECTIONS')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
          >
            Send Directions
          </button>
          {appt.status !== 'CANCELLED' && (
            <button
              onClick={() => cancelMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              <XCircle className="w-3.5 h-3.5" />
              Confirm Official HIS Cancellation
            </button>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          {actionFeedback}
        </div>
      )}

      {/* Simulate Inbound Patient Reply Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-900">
            Test Patient WhatsApp Interactive Reply on This Booking
          </div>
          <div className="text-[11px] text-slate-500">
            Triggers the real backend Response & Call-Centre Workflow Engine
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              responseMutation.mutate({
                rawResponseText: 'Confirm Appointment',
                buttonPayload: 'BTN_CONFIRM',
              })
            }
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            Tap "Confirm"
          </button>
          <button
            onClick={() =>
              responseMutation.mutate({
                rawResponseText: 'Reschedule',
                buttonPayload: 'BTN_RESCHEDULE',
              })
            }
            className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
          >
            Tap "Reschedule"
          </button>
          <button
            onClick={() =>
              responseMutation.mutate({
                rawResponseText: 'Cancel',
                buttonPayload: 'BTN_CANCEL',
              })
            }
            className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
          >
            Tap "Cancel"
          </button>
          <button
            onClick={() =>
              responseMutation.mutate({
                rawResponseText: 'Talk to Us',
                buttonPayload: 'BTN_TALK',
              })
            }
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            Tap "Talk to Us"
          </button>
          <button
            onClick={() =>
              responseMutation.mutate({
                rawResponseText: 'STOP',
              })
            }
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-black text-white text-xs font-semibold"
          >
            Reply "STOP" (Opt-Out)
          </button>
        </div>
      </div>

      {/* Scheduled Reminders & WhatsApp Message Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Scheduled Reminder Jobs ({appt.scheduledMessages?.length || 0})
          </h3>
          <div className="space-y-2.5">
            {(appt.scheduledMessages || []).map((job: any) => (
              <div
                key={job.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-800">{job.jobType}</div>
                  <div className="text-[11px] text-slate-500">
                    Scheduled UTC: {new Date(job.scheduledForUtc).toLocaleString()}
                  </div>
                  {job.wasQuietHourShifted && (
                    <div className="text-[10px] text-amber-700 font-semibold">
                      Quiet-Hours Shifted (8:00 AM–9:00 PM rule)
                    </div>
                  )}
                  {job.suppressionReason && (
                    <div className="text-[10px] text-red-600 font-semibold">
                      Reason: {job.suppressionReason}
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            WhatsApp Communication History ({appt.messageLogs?.length || 0})
          </h3>
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {(appt.messageLogs || []).map((msg: any) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border text-xs ${
                  msg.direction === 'INBOUND'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] uppercase">
                    {msg.direction} • {msg.messageCategory} ({msg.language})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border font-semibold text-[10px]">
                    {msg.status}
                  </span>
                </div>
                <p className="text-slate-700">{msg.renderedContent}</p>
                {msg.whatsappMessageId && (
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    wamid: {msg.whatsappMessageId}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Immutable Appointment Event Audit Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Appointment Lifecycle Event Audit Trail
        </h3>
        <div className="space-y-2">
          {(appt.events || []).map((ev: any) => (
            <div
              key={ev.id}
              className="flex items-start justify-between p-2.5 rounded bg-slate-50 border border-slate-100 text-xs"
            >
              <div>
                <span className="font-bold text-teal-800 mr-2">{ev.eventType}</span>
                <span className="text-slate-700">{ev.description}</span>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(ev.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE 5: PATIENT PROFILES (RESTRICTED NON-CLINICAL VISIBILITY)
// ============================================================================
export const PatientProfilesPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', selectedHospitalId, search],
    queryFn: () => apiRequest(`/patients?${params.toString()}`),
  });

  const patients = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Patient Service Profiles (Restricted Visibility)
        </h1>
        <p className="text-xs text-slate-500">
          Strictly restricted to appointment communication and consent attributes
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-teal-950 text-teal-100 border border-teal-800 flex items-center gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-teal-400 shrink-0" />
        <span>
          <strong>Phase 1 Data Protection Safeguard:</strong> No clinical diagnosis, prescriptions, lab reports, or treatment notes are stored in the database or transmitted via WhatsApp.
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <input
          type="text"
          placeholder="Search by UHID, Patient Name, or Mobile Number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-1.5 text-xs border border-slate-300 rounded-md"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading patients...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-4">External UHID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Hospital Unit</th>
                <th className="py-3 px-4">Preferred Language</th>
                <th className="py-3 px-4">Consent & Eligibility</th>
                <th className="py-3 px-4">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p: any) => {
                const consent = p.consents?.[0];
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold">{p.externalPatientId}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{p.fullName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{p.mobileNumber}</td>
                    <td className="py-2.5 px-4">{p.hospital?.city}</td>
                    <td className="py-2.5 px-4 uppercase font-semibold">{p.preferredLanguage}</td>
                    <td className="py-2.5 px-4">
                      {consent?.communicationEligible ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          ELIGIBLE ({consent.consentStatus})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                          OPTED OUT (STOP)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">{p._count?.appointments ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

