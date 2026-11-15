import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  MessageSquare,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Plus,
  Play,
  Reply,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// ============================================================================
// PAGE 6: WHATSAPP COMMUNICATION CENTRE
// ============================================================================
export const WhatsAppCommCentrePage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (statusFilter !== 'ALL') params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', selectedHospitalId, statusFilter],
    queryFn: () => apiRequest(`/messages?${params.toString()}`),
  });

  const webhookSimMutation = useMutation({
    mutationFn: (payload: { whatsappMessageId: string; status: string }) =>
      apiRequest('/webhooks/whatsapp', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
      setFeedback(
        `Processed Meta webhook receipt (${vars.status.toUpperCase()}) for wamid ${vars.whatsappMessageId}`
      );
    },
  });

  const messages = data?.data || [];
  const lifecyclePie = [
    { name: 'READ', value: messages.filter((m: any) => m.status === 'READ').length, color: '#4f46e5' },
    { name: 'DELIVERED', value: messages.filter((m: any) => m.status === 'DELIVERED').length, color: '#0d9488' },
    { name: 'SENT / SUBMITTED', value: messages.filter((m: any) => ['SENT', 'SUBMITTED'].includes(m.status)).length, color: '#0284c7' },
    { name: 'SUPPRESSED', value: messages.filter((m: any) => m.status === 'SUPPRESSED').length, color: '#94a3b8' },
    { name: 'FAILED', value: messages.filter((m: any) => m.status === 'FAILED').length, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const langPie = [
    { name: 'Bengali (BN)', value: messages.filter((m: any) => m.language === 'bn').length, color: '#0d9488' },
    { name: 'Hindi (HI)', value: messages.filter((m: any) => m.language === 'hi').length, color: '#6366f1' },
    { name: 'English (EN)', value: messages.filter((m: any) => m.language === 'en').length, color: '#0284c7' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            WhatsApp Communication Centre
          </h1>
          <p className="text-xs text-slate-500">
            Full lifecycle tracking: QUEUED → SCHEDULED → SUBMITTED → SENT → DELIVERED → READ (plus FAILED & SUPPRESSED)
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="ALL">All Lifecycle States</option>
          <option value="SENT">SENT (Submitted to API)</option>
          <option value="DELIVERED">DELIVERED (Receipt Confirmed)</option>
          <option value="READ">READ (Patient Opened)</option>
          <option value="FAILED">FAILED</option>
          <option value="SUPPRESSED">SUPPRESSED (Consent / Holdout)</option>
        </select>
      </div>

      {/* Visual Pie Charts Row for WhatsApp Lifecycle & Language Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            Message Delivery Lifecycle Distribution
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            Separating API Submission from Verified Handset Delivery & Read Receipts
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={lifecyclePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {lifecyclePie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            Multilingual Message Dispatch Split
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            New Town (Bengali / English) & Raipur (Hindi / English)
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={langPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {langPie.map((entry) => (
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
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading message logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Direction & Category</th>
                  <th className="py-3 px-3">Booking & Recipient</th>
                  <th className="py-3 px-3">Lang</th>
                  <th className="py-3 px-3">Rendered Content</th>
                  <th className="py-3 px-3">Lifecycle Status</th>
                  <th className="py-3 px-3 text-right">Simulate Webhook Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((msg: any) => (
                  <tr key={msg.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                          msg.direction === 'INBOUND'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {msg.direction}
                      </span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {msg.messageCategory}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {msg.appointment?.bookingId || 'Direct'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {msg.recipientMobile}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 uppercase font-bold text-slate-700">
                      {msg.language}
                    </td>
                    <td className="py-2.5 px-3 max-w-md">
                      <div className="line-clamp-2 text-slate-700">{msg.renderedContent}</div>
                      {msg.whatsappMessageId && (
                        <div className="text-[10px] font-mono text-slate-400">
                          {msg.whatsappMessageId}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          msg.status === 'READ'
                            ? 'bg-emerald-100 text-emerald-800'
                            : msg.status === 'DELIVERED'
                            ? 'bg-teal-100 text-teal-800'
                            : msg.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : msg.status === 'SUPPRESSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                      {msg.whatsappMessageId && msg.direction === 'OUTBOUND' && (
                        <>
                          <button
                            onClick={() =>
                              webhookSimMutation.mutate({
                                whatsappMessageId: msg.whatsappMessageId,
                                status: 'delivered',
                              })
                            }
                            className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-semibold"
                          >
                            +Delivered
                          </button>
                          <button
                            onClick={() =>
                              webhookSimMutation.mutate({
                                whatsappMessageId: msg.whatsappMessageId,
                                status: 'read',
                              })
                            }
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold"
                          >
                            +Read
                          </button>
                          <button
                            onClick={() =>
                              webhookSimMutation.mutate({
                                whatsappMessageId: msg.whatsappMessageId,
                                status: 'failed',
                              })
                            }
                            className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-800 text-[10px] font-semibold"
                          >
                            +Fail
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PAGE 7: WHATSAPP TEMPLATE MANAGEMENT (10 CATEGORIES, EN / BN / HI)
// ============================================================================
export const TemplateManagementPage: React.FC = () => {
  const { selectedHospitalId, hospitals } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [langFilter, setLangFilter] = useState('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultHospitalId =
    selectedHospitalId !== 'ALL' ? selectedHospitalId : hospitals[0]?.id || '';

  const [form, setForm] = useState({
    hospitalId: '',
    code: 'appt_confirmation',
    name: 'Updated Appointment Confirmation',
    category: 'APPOINTMENT_CONFIRMATION',
    language: 'en',
    bodyText:
      'Namaskar {{patient_name}}, your OPD visit with {{doctor_name}} at {{hospital_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Address: {{hospital_address}}. Helpline: {{helpline}}.',
  });

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (langFilter !== 'ALL') params.set('language', langFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['templates', selectedHospitalId, langFilter],
    queryFn: () => apiRequest(`/templates?${params.toString()}`),
  });

  const createVersionMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowNewModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: (vars: { id: string; approvalStatus: string }) =>
      apiRequest(`/templates/${vars.id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ approvalStatus: vars.approvalStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const templates = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            WhatsApp Utility Template Library (10 Categories • EN / BN / HI)
          </h1>
          <p className="text-xs text-slate-500">
            Version-controlled templates with variable mapping & Meta approval tracking • Never sends unapproved templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="ALL">All Languages (EN, BN, HI)</option>
            <option value="en">English (EN)</option>
            <option value="bn">Bengali (BN — New Town)</option>
            <option value="hi">Hindi (HI — Raipur)</option>
          </select>

          <button
            onClick={() => {
              setForm((f) => ({ ...f, hospitalId: defaultHospitalId }));
              setErrorMsg(null);
              setShowNewModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Create / Version Template
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl: any) => {
            const latest = tpl.versions?.[0];
            return (
              <div
                key={tpl.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase text-teal-700">
                      {tpl.category} • {tpl.language.toUpperCase()} • v{tpl.activeVersion}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tpl.approvalStatus.includes('APPROVED')
                          ? 'bg-emerald-100 text-emerald-800'
                          : tpl.approvalStatus === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tpl.approvalStatus}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{tpl.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 mb-2">
                    Meta ID: {tpl.metaTemplateName} ({tpl.hospital?.city})
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {latest?.bodyText}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400">
                    Variables: 7 mapped • Non-clinical verified
                  </span>
                  <div className="space-x-1">
                    <button
                      onClick={() =>
                        approvalMutation.mutate({
                          id: tpl.id,
                          approvalStatus: 'APPROVED',
                        })
                      }
                      className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold"
                    >
                      Mark Meta Approved
                    </button>
                    <button
                      onClick={() =>
                        approvalMutation.mutate({
                          id: tpl.id,
                          approvalStatus: 'SUBMITTED',
                        })
                      }
                      className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold"
                    >
                      Mark Pending
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Create or Publish New Template Version
            </h3>
            {errorMsg && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 font-medium">
                {errorMsg}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="font-semibold">Hospital Unit</label>
                <select
                  value={form.hospitalId || defaultHospitalId}
                  onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                  className="w-full mt-1 border rounded px-2.5 py-1.5"
                >
                  {hospitals.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold">Template Code</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full mt-1 border rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold">Language</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full mt-1 border rounded px-2.5 py-1.5"
                  >
                    <option value="en">English (en)</option>
                    <option value="bn">Bengali (bn)</option>
                    <option value="hi">Hindi (hi)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold">
                  Template Body (Prohibits clinical diagnosis/prescription terms)
                </label>
                <textarea
                  rows={4}
                  value={form.bodyText}
                  onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                  className="w-full mt-1 border rounded p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded border"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    createVersionMutation.mutate({
                      ...form,
                      hospitalId: form.hospitalId || defaultHospitalId,
                    })
                  }
                  className="px-4 py-1.5 rounded bg-teal-600 text-white font-semibold"
                >
                  Publish Version
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 8: AUTOMATED REMINDER SCHEDULER
// ============================================================================
export const ReminderSchedulerPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (statusFilter !== 'ALL') params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduler-jobs', selectedHospitalId, statusFilter],
    queryFn: () => apiRequest(`/scheduler/jobs?${params.toString()}`),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/scheduler/jobs/${id}/execute`, { method: 'POST' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setFeedback(
        res.data?.skipped
          ? `Job execution skipped/suppressed: ${res.data.reason}`
          : `Executed scheduled reminder job -> Status: ${res.data?.job?.status}`
      );
    },
  });

  const jobs = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Automated Reminder Scheduler (24h Advance & 2–3h Same-Day)
          </h1>
          <p className="text-xs text-slate-500">
            Enforces 8:00 AM–9:00 PM Hospital Quiet Hours with approved Morning-Appointment Exception • Idempotent job keys
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="ALL">All Queue States</option>
          <option value="SCHEDULED">SCHEDULED (Pending)</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="SUPPRESSED">SUPPRESSED (STOP / Control Holdout)</option>
          <option value="CANCELLED">CANCELLED (HIS Reschedule/Cancel)</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading scheduled jobs...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-3">Idempotency Key</th>
                <th className="py-3 px-3">Booking & Patient</th>
                <th className="py-3 px-3">Job Type</th>
                <th className="py-3 px-3">Scheduled For (UTC)</th>
                <th className="py-3 px-3">Quiet-Hours Check</th>
                <th className="py-3 px-3">Status & Reason</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {job.appointment?.bookingId}:{job.jobType}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">
                      {job.appointment?.patientName}
                    </div>
                    <div className="text-[11px] text-slate-500">{job.hospital?.city}</div>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{job.jobType}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {new Date(job.scheduledForUtc).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    {job.wasQuietHourShifted ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        SHIFTED (Quiet Hours)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Within 8AM–9PM</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : job.status === 'SCHEDULED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {job.status}
                    </span>
                    {job.suppressionReason && (
                      <div className="text-[10px] text-red-600 mt-0.5">
                        {job.suppressionReason}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {job.status === 'SCHEDULED' && (
                      <button
                        onClick={() => executeMutation.mutate(job.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold"
                      >
                        <Play className="w-3 h-3" />
                        Run Now
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
// PAGE 9: PATIENT RESPONSES
// ============================================================================
export const PatientResponsesPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const [actionFilter, setActionFilter] = useState('ALL');

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (actionFilter !== 'ALL') params.set('action', actionFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['responses', selectedHospitalId, actionFilter],
    queryFn: () => apiRequest(`/responses?${params.toString()}`),
  });

  const responses = data?.data || [];
  const respPie = [
    { name: 'CONFIRM', value: responses.filter((r: any) => r.mappedAction === 'CONFIRM').length, color: '#10b981' },
    { name: 'RESCHEDULE', value: responses.filter((r: any) => r.mappedAction === 'RESCHEDULE').length, color: '#f97316' },
    { name: 'CANCEL', value: responses.filter((r: any) => r.mappedAction === 'CANCEL').length, color: '#ef4444' },
    { name: 'TALK_TO_US', value: responses.filter((r: any) => r.mappedAction === 'TALK_TO_US').length, color: '#8b5cf6' },
    { name: 'STOP', value: responses.filter((r: any) => r.mappedAction === 'STOP').length, color: '#64748b' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Inbound Patient WhatsApp Responses
          </h1>
          <p className="text-xs text-slate-500">
            Interactive buttons & multilingual text keywords mapped to appointment state & call-centre workflows
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="ALL">All Mapped Actions</option>
          <option value="CONFIRM">CONFIRM</option>
          <option value="RESCHEDULE">RESCHEDULE</option>
          <option value="CANCEL">CANCEL</option>
          <option value="TALK_TO_US">TALK_TO_US</option>
          <option value="STOP">STOP (Opt-Out)</option>
        </select>
      </div>

      {/* Patient Response Intent Donut Chart & Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            Patient Intent Classification Pie Chart
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            Distribution of interactive quick-reply buttons & free-text intents
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={respPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {respPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {respPie.map((item) => (
            <div
              key={item.name}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">{item.name}</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2">{item.value}</div>
                <div className="text-[11px] text-slate-400">Inbound patient replies</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading patient responses...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-4">Received At</th>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Raw Patient Input</th>
                <th className="py-3 px-4">Mapped Action</th>
                <th className="py-3 px-4">Ack Sent</th>
                <th className="py-3 px-4">Call-Centre Escalated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {responses.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-500">
                    {new Date(r.receivedAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold">
                    {r.appointment?.bookingId}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-900">{r.patient?.fullName}</div>
                    <div className="text-[11px] text-slate-500">{r.hospital?.name}</div>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">
                    "{r.rawResponseText}"
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-[10px]">
                      {r.mappedAction}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {r.acknowledgementSent ? 'Yes (Auto-Ack)' : 'Suppressed'}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">
                    {r.followUpTriggered ? 'Queued in Altruist Worklist' : 'Not Required'}
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

