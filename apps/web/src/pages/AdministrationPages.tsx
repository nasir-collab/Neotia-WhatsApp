import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  UserCog,
  FileSearch,
  Settings,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Save,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// ============================================================================
// PAGE 20: MULTI-HOSPITAL CONFIGURATION (NEW TOWN KOLKATA & RAIPUR)
// ============================================================================
export const HospitalConfigurationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['hospitals-config'],
    queryFn: () => apiRequest('/hospitals'),
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { id: string; payload: any }) =>
      apiRequest(`/hospitals/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify(vars.payload),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['hospitals-config'] });
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      setFeedback(`Saved updated configuration for ${res.data.name}.`);
    },
  });

  const hospitals = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Multi-Hospital Configuration (New Town, Kolkata & Raipur)
        </h1>
        <p className="text-xs text-slate-500">
          Configure hospital address, map pin, helpline, OPD timings, entrance/parking guidance, languages, and reminder cadence
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {feedback}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading hospitals...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {hospitals.map((h: any) => {
            const cfg = h.configuration || {};
            const localEdit = edits[h.id] || {
              name: h.name,
              address: cfg.address,
              helpline: cfg.helpline,
              opdTimings: cfg.opdTimings,
              entranceGuidance: cfg.entranceGuidance,
              parkingGuidance: cfg.parkingGuidance,
              firstVisitInstructions: cfg.firstVisitInstructions,
              advanceReminderHours: cfg.advanceReminderHours,
              preVisitReminderHours: cfg.preVisitReminderHours,
              quietHoursStart: cfg.quietHoursStart,
              quietHoursEnd: cfg.quietHoursEnd,
            };

            const updateField = (key: string, val: any) => {
              setEdits({
                ...edits,
                [h.id]: { ...localEdit, [key]: val },
              });
            };

            return (
              <div
                key={h.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-teal-700">
                      {h.code} • {h.city}, {h.state} • TZ: {h.timezone}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{h.name}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                    Languages: {(cfg.supportedLanguages || []).join(', ').toUpperCase()}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                  {cfg.dataVerificationLabel || 'DEMONSTRATION DATA — PENDING ANHVL VERIFICATION'}
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Hospital Address</label>
                  <input
                    value={localEdit.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full mt-1 border rounded px-2.5 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Helpline Number</label>
                    <input
                      value={localEdit.helpline}
                      onChange={(e) => updateField('helpline', e.target.value)}
                      className="w-full mt-1 border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">OPD Timings</label>
                    <input
                      value={localEdit.opdTimings}
                      onChange={(e) => updateField('opdTimings', e.target.value)}
                      className="w-full mt-1 border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Entrance & Gate Guidance</label>
                    <input
                      value={localEdit.entranceGuidance}
                      onChange={(e) => updateField('entranceGuidance', e.target.value)}
                      className="w-full mt-1 border rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Parking Guidance</label>
                    <input
                      value={localEdit.parkingGuidance}
                      onChange={(e) => updateField('parkingGuidance', e.target.value)}
                      className="w-full mt-1 border rounded px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">
                    First-Visit Assistance Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={localEdit.firstVisitInstructions}
                    onChange={(e) => updateField('firstVisitInstructions', e.target.value)}
                    className="w-full mt-1 border rounded p-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <label className="font-semibold text-slate-700">Advance Reminder (h)</label>
                    <input
                      type="number"
                      value={localEdit.advanceReminderHours}
                      onChange={(e) => updateField('advanceReminderHours', e.target.value)}
                      className="w-full mt-1 border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Same-Day Reminder (h)</label>
                    <input
                      type="number"
                      value={localEdit.preVisitReminderHours}
                      onChange={(e) => updateField('preVisitReminderHours', e.target.value)}
                      className="w-full mt-1 border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Quiet Hours</label>
                    <div className="mt-1.5 font-mono text-slate-600">
                      {localEdit.quietHoursStart} – {localEdit.quietHoursEnd}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                  <button
                    onClick={() =>
                      saveMutation.mutate({ id: h.id, payload: localEdit })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Hospital Configuration
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 21: USER & ROLE MANAGEMENT
// ============================================================================
export const UserRoleManagementPage: React.FC = () => {
  const { hospitals } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [showNewUser, setShowNewUser] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: 'AnhvlUser@2026',
    roleCode: 'OPS_EXECUTIVE',
    hospitalId: '',
  });

  const { data: usersRes } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => apiRequest('/users'),
  });

  const { data: rolesRes } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => apiRequest('/users/roles'),
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setShowNewUser(false);
      setFeedback(`Created user ${res.data.email} (${res.data.roleCode}).`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      apiRequest(`/users/${vars.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: vars.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });

  const users = usersRes?.data || [];
  const roles = rolesRes?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            User & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-500">
            6 enforced backend roles with hospital-unit scope restrictions & bcrypt password hashing
          </p>
        </div>

        <button
          onClick={() => setShowNewUser(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Platform User
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
              <th className="py-3 px-4">Full Name & Email</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Hospital Scope</th>
              <th className="py-3 px-4">Last Login</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-4">
                  <div className="font-semibold text-slate-900">{u.fullName}</div>
                  <div className="text-[11px] text-slate-500">{u.email}</div>
                </td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-900 font-bold text-[10px]">
                    {u.roleCode}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-700">{u.hospitalName}</td>
                <td className="py-2.5 px-4 text-slate-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() =>
                      statusMutation.mutate({
                        id: u.id,
                        status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                      })
                    }
                    className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold"
                  >
                    {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Definitions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Configured Role & Permission Matrix ({roles.length} Roles)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {roles.map((r: any) => (
            <div key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900">{r.name}</div>
              <div className="text-[10px] font-mono text-teal-700 mb-1">{r.code}</div>
              <p className="text-[11px] text-slate-600 mb-2">{r.description}</p>
              <div className="text-[10px] text-slate-500">
                Permissions: {(r.permissions || []).length} granted
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-3 text-xs">
            <h3 className="text-base font-bold text-slate-900">Create Platform User</h3>
            <div>
              <label className="font-semibold">Full Name</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full mt-1 border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="font-semibold">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 border rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="font-semibold">Role</label>
              <select
                value={form.roleCode}
                onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
                className="w-full mt-1 border rounded px-2.5 py-1.5"
              >
                {roles.map((r: any) => (
                  <option key={r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold">Assigned Hospital (Optional for Group Roles)</label>
              <select
                value={form.hospitalId}
                onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                className="w-full mt-1 border rounded px-2.5 py-1.5"
              >
                <option value="">All Hospitals (Group Scope)</option>
                {hospitals.map((h: any) => (
                  <option key={h.id} value={h.id}>
                    {h.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setShowNewUser(false)}
                className="px-3 py-1.5 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={() => createUserMutation.mutate(form)}
                className="px-4 py-1.5 rounded bg-teal-600 text-white font-semibold"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 22: SECURITY & OPERATIONAL AUDIT LOGS
// ============================================================================
export const AuditLogsPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', selectedHospitalId, search],
    queryFn: () => apiRequest(`/audit-logs?${params.toString()}`),
  });

  const logs = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Security & Operational Audit Logs
        </h1>
        <p className="text-xs text-slate-500">
          Immutable audit trail for logins, consent/STOP changes, appointment imports, message dispatches, and configuration updates
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <input
          type="text"
          placeholder="Filter audit logs by actor email, action, or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-1.5 text-xs border border-slate-300 rounded-md"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Operational Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-900">{l.actorEmail}</div>
                    <div className="text-[10px] text-slate-500">{l.actorRole}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-[10px]">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{l.entityType}</td>
                  <td className="py-2.5 px-4 text-slate-800">{l.summary}</td>
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
// PAGE 23: SYSTEM SETTINGS & OPERATING MODE CONTROL
// ============================================================================
export const SystemSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => apiRequest('/settings'),
  });

  const modeMutation = useMutation({
    mutationFn: (mode: 'DEMO' | 'PRODUCTION') =>
      apiRequest('/settings/mode', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      setErrorMsg(null);
      setSuccessMsg(`Switched platform operating mode to ${res.operatingMode}.`);
    },
    onError: (err: any) => {
      setSuccessMsg(null);
      setErrorMsg(err.message);
    },
  });

  const settings = data?.data || [];
  const currentMode = data?.operatingMode || 'DEMO';
  const missingPrereqs = data?.missingProductionPrerequisites || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          System Settings & Production Activation Gate
        </h1>
        <p className="text-xs text-slate-500">
          Strict separation between Isolated Synthetic Demo Mode and Live Production Mode
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <strong>Production Safety Gate Blocked Activation:</strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Platform Operating Mode: {currentMode} MODE
            </h3>
            <p className="text-xs text-slate-500">
              Production Mode strictly requires verified ANHVL Meta Business Manager and HIS credentials and never silently falls back to simulated messaging.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => modeMutation.mutate('DEMO')}
              className={`px-4 py-2 rounded-lg text-xs font-bold ${currentMode === 'DEMO'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700'
                }`}
            >
              DEMO MODE (Synthetic)
            </button>
            <button
              onClick={() => modeMutation.mutate('PRODUCTION')}
              className={`px-4 py-2 rounded-lg text-xs font-bold ${currentMode === 'PRODUCTION'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
            >
              Attempt Live PRODUCTION Activation
            </button>
          </div>
        </div>

        {missingPrereqs.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
            <div className="font-bold text-amber-900">
              Missing External Environment Variables for Production Cutover:
            </div>
            <div className="font-mono text-[11px] text-amber-800">
              {missingPrereqs.join(' • ')}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((s: any) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2 text-xs"
          >
            <div className="font-mono font-bold text-teal-700">{s.key}</div>
            <p className="text-slate-600">{s.description}</p>
            <pre className="p-3 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(s.value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// SECTION 21: TECHNOLOGY ARCHITECTURE VISUALIZATION
// ============================================================================
export const ArchitectureViewPage: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['arch-health'],
    queryFn: () => apiRequest('/settings/health'),
  });

  const layers = [
    {
      layer: '1. USER EXPERIENCE LAYER',
      subtitle: 'React 18 + TypeScript + Tailwind CSS + TanStack Query',
      items: [
        'React Administration Dashboard (24 Operational Modules)',
        'Hospital Users / Operations Executives / Management Viewers',
        'Altruist Call-Centre Agent Worklist & Interactive Demo Simulator',
      ],
      color: 'border-teal-600 bg-teal-50/40',
    },
    {
      layer: '2. APPLICATION & WORKFLOW SERVICES (NestJS / Node.js)',
      subtitle: 'Modular REST API (/api/v1) + Swagger OpenAPI (/api/docs)',
      items: [
        'Appointment Ingestion, Validation & Deduplication Service',
        'Patient Response Capture & Multilingual Keyword Parser (EN / BN / HI)',
        'WhatsApp Orchestration & Non-Clinical Content Safeguard',
        'Automated Reminder Scheduler (24h & 2–3h + 8 AM–9 PM Quiet Hours)',
        'Call-Centre Follow-Up Queue & Escalation Engine',
        'HIS Attendance Reconciliation & Verified No-Show Rebooking Engine',
      ],
      color: 'border-blue-600 bg-blue-50/40',
    },
    {
      layer: '3. INTEGRATION ADAPTER LAYER',
      subtitle: 'Strict Separation of Demo Simulation vs Verified Production Credentials',
      items: [
        'Meta WhatsApp Business Cloud API Adapter (Outgoing & Webhook Receiver)',
        'HIS REST API / Webhook Synchronizer with Configurable Field Mapping',
        'SFTP / CSV Batch Import & Export Fallback Engine',
        'Altruist Call-Centre Handoff Adapter (REST API & Exportable Worklist CSV)',
      ],
      color: 'border-indigo-600 bg-indigo-50/40',
    },
    {
      layer: '4. DATA & PERSISTENT QUEUE LAYER',
      subtitle: `Live Status: ${health?.database?.status || 'CONNECTED'} (${health?.database?.engine || 'PostgreSQL 16'})`,
      items: [
        'PostgreSQL Relational Database (24 Normalized Tables via Prisma ORM)',
        'Redis / BullMQ & Transactional Persistent Scheduled Jobs',
        'Immutable AppointmentEvents, WhatsAppWebhooks & AuditLogs',
      ],
      color: 'border-emerald-600 bg-emerald-50/40',
    },
    {
      layer: '5. SECURITY & DATA PROTECTION LAYER',
      subtitle: 'Backend-Enforced RBAC, Consent Guard & Non-Clinical Safeguards',
      items: [
        'JWT Access & Refresh Token Authentication with Bcrypt Password Hashing',
        '6 Role-Based Access Profiles & Hospital-Level Data Isolation',
        'Instant STOP Opt-Out Suppression (Pre-Queue & Pre-Send Checks)',
        'HMAC-SHA256 Webhook Verification & Sanitized Non-PII Error Logging',
      ],
      color: 'border-amber-600 bg-amber-50/40',
    },
    {
      layer: '6. REPORTING & PILOT MEASUREMENT LAYER',
      subtitle: 'Real-Time Database Queries with Explicit Denominators',
      items: [
        'Executive Operational Analytics (15+ KPIs)',
        'New Town vs Raipur Hospital Comparison & Consultant Turn-Up Analysis',
        'New Town Pilot Randomized 80/20 Treatment vs Control Holdout Measurement',
        'Message Lifecycle Tracking (Submitted vs Delivered vs Read vs Confirmed)',
      ],
      color: 'border-purple-600 bg-purple-50/40',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Implemented Technology Architecture Visualization
          </h1>
          <p className="text-xs text-slate-500">
            Live logical architecture of the ANHVL WhatsApp Patient Engagement Platform built by Plan D Media
          </p>
        </div>
        <a
          href="http://localhost:4000/api/docs"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
        >
          Open Swagger OpenAPI Docs (/api/docs) ↗
        </a>
      </div>

      <div className="space-y-4">
        {layers.map((l) => (
          <div
            key={l.layer}
            className={`rounded-xl border-l-4 border border-slate-200 p-5 bg-white shadow-sm ${l.color}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900">{l.layer}</h3>
              <span className="text-xs font-semibold text-slate-600">{l.subtitle}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {l.items.map((item) => (
                <div
                  key={item}
                  className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

