import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Server,
  Smartphone,
  Share2,
  FlaskConical,
  BarChart3,
  Play,
  AlertTriangle,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { apiRequest, downloadAuthenticatedCsv } from '../services/api';
import { useHospitalFilter } from '../layouts/DashboardLayout';

// Shared helper for rendering Integration Cards + Connection Tests
const IntegrationAdapterView: React.FC<{
  integrationType: 'HIS_API' | 'META_WHATSAPP' | 'ALTRUIST_CALLCENTRE';
  title: string;
  subtitle: string;
}> = ({ integrationType, title, subtitle }) => {
  const { selectedHospitalId } = useHospitalFilter();
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<Record<string, string>>({});

  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);
  params.set('integrationType', integrationType);

  const { data, isLoading } = useQuery({
    queryKey: ['integrations', selectedHospitalId, integrationType],
    queryFn: () => apiRequest(`/integrations?${params.toString()}`),
  });

  const testMutation = useMutation({
    mutationFn: (configId: string) =>
      apiRequest('/integrations/test', {
        method: 'POST',
        body: JSON.stringify({ configId }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setTestResult(res.data.summary);
    },
  });

  const saveMappingMutation = useMutation({
    mutationFn: (vars: { id: string; fieldMappings: any }) =>
      apiRequest(`/integrations/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fieldMappings: vars.fieldMappings }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setTestResult('Saved updated adapter field mappings.');
    },
  });

  const configs = data?.data?.configurations || [];
  const logs = (data?.data?.logs || []).filter(
    (l: any) => l.integrationType === integrationType
  );
  const syncJobs = data?.data?.syncJobs || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      {testResult && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium">
          {testResult}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading integration adapters...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {configs.map((cfg: any) => (
            <div
              key={cfg.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase text-teal-700">
                    {cfg.integrationType} • {cfg.hospital?.city || 'Group'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{cfg.name}</h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    cfg.connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : cfg.connectionStatus === 'DEMO_SIMULATED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {cfg.connectionStatus}
                </span>
              </div>

              {/* Missing ANHVL Prerequisites Box */}
              {cfg.missingPrerequisites?.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Required from ANHVL for Live Production Cutover:
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                    {cfg.missingPrerequisites.map((p: string) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Field Mappings Editor */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">
                  Configurable Field Mapping / Adapter Parameters (JSON)
                </div>
                <textarea
                  rows={5}
                  value={
                    editingMapping[cfg.id] ??
                    JSON.stringify(cfg.fieldMappings || {}, null, 2)
                  }
                  onChange={(e) =>
                    setEditingMapping({ ...editingMapping, [cfg.id]: e.target.value })
                  }
                  className="w-full font-mono text-[11px] border border-slate-300 rounded-lg p-2.5 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400">
                  Last Test:{' '}
                  {cfg.lastConnectionTestAt
                    ? new Date(cfg.lastConnectionTestAt).toLocaleTimeString()
                    : 'Not run yet'}
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(
                          editingMapping[cfg.id] ?? JSON.stringify(cfg.fieldMappings)
                        );
                        saveMappingMutation.mutate({ id: cfg.id, fieldMappings: parsed });
                      } catch {
                        alert('Invalid JSON format in field mappings');
                      }
                    }}
                    className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 font-semibold"
                  >
                    Save Mapping
                  </button>
                  <button
                    onClick={() => testMutation.mutate(cfg.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  >
                    <Play className="w-3 h-3" />
                    Test Connection
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integration Logs & Sync Jobs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Adapter Execution & Synchronization Logs ({logs.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
          {logs.map((l: any) => (
            <div
              key={l.id}
              className="p-2.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-slate-800 mr-2">{l.operation}</span>
                <span className="text-slate-600">{l.sanitizedSummary}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                {l.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {integrationType === 'HIS_API' && syncJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            HIS Synchronization Batch Jobs ({syncJobs.length})
          </h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-2 px-3">Job Type</th>
                <th className="py-2 px-3">Source</th>
                <th className="py-2 px-3">Inserted</th>
                <th className="py-2 px-3">Updated</th>
                <th className="py-2 px-3">Duplicates Skipped</th>
                <th className="py-2 px-3">Failed</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {syncJobs.map((j: any) => (
                <tr key={j.id}>
                  <td className="py-2 px-3 font-semibold">{j.jobType}</td>
                  <td className="py-2 px-3">{j.source}</td>
                  <td className="py-2 px-3 text-emerald-700 font-bold">{j.insertedRecords}</td>
                  <td className="py-2 px-3 text-blue-700 font-bold">{j.updatedRecords}</td>
                  <td className="py-2 px-3 text-slate-600">{j.duplicateSkipped}</td>
                  <td className="py-2 px-3 text-red-600">{j.failedRecords}</td>
                  <td className="py-2 px-3 font-bold">{j.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// PAGE 15: HIS INTEGRATION MONITOR
export const HisIntegrationMonitorPage: React.FC = () => (
  <IntegrationAdapterView
    integrationType="HIS_API"
    title="HIS Integration Monitor (REST API, Webhooks & SFTP/CSV Fallback)"
    subtitle="Configurable field mapping between ANHVL HIS fields and platform data model • Deduplicates by booking ID"
  />
);

// PAGE 16: WHATSAPP INTEGRATION SETTINGS
export const WhatsAppIntegrationSettingsPage: React.FC = () => (
  <IntegrationAdapterView
    integrationType="META_WHATSAPP"
    title="Meta WhatsApp Business Cloud API Settings"
    subtitle="WABA & Phone Number ID configuration • Webhook verification (/api/v1/webhooks/whatsapp) • Never exposes tokens in UI"
  />
);

// PAGE 17: ALTRUIST INTEGRATION SETTINGS
export const AltruistIntegrationSettingsPage: React.FC = () => (
  <IntegrationAdapterView
    integrationType="ALTRUIST_CALLCENTRE"
    title="Altruist Call-Centre Integration Adapter"
    subtitle="Supports direct REST API handoff when Altruist credentials are provided, or immediate CSV Worklist export"
  />
);

// ============================================================================
// PAGE 18: PILOT / CONTROL GROUP MEASUREMENT (NEW TOWN)
// ============================================================================
export const PilotControlGroupPage: React.FC = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);

  const { data, isLoading } = useQuery({
    queryKey: ['pilot-metrics', selectedHospitalId],
    queryFn: () => apiRequest(`/pilot?${params.toString()}`),
  });

  const pilot = data?.data;
  const cohortPieData = [
    { name: 'Treatment (WhatsApp Active)', value: pilot?.treatment?.total ?? 0, color: '#0d9488' },
    { name: 'Control Holdout (Suppressed)', value: pilot?.control?.total ?? 0, color: '#9333ea' },
  ].filter((d) => d.value > 0);

  const cohortComparisonBars = [
    {
      cohort: 'Treatment (WA Enabled)',
      ArrivalRate: pilot?.treatment?.arrivalRate ?? 0,
      NoShowRate: pilot?.treatment?.noShowRate ?? 0,
    },
    {
      cohort: 'Control Holdout (Suppressed)',
      ArrivalRate: pilot?.control?.arrivalRate ?? 0,
      NoShowRate: pilot?.control?.noShowRate ?? 0,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-[11px] font-semibold mb-2">
          <FlaskConical className="w-3.5 h-3.5" />
          Randomized Controlled Pilot Evaluation • New Town, Kolkata
        </div>
        <h1 className="text-xl font-bold">
          New Town Pilot & Control Group Holdout Measurement
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Deterministic 80/20 Treatment vs Control assignment • Control group excluded from automated WhatsApp campaigns to measure pure OPD turn-up lift
        </p>
      </div>

      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
        {pilot?.dataLabel || 'SYNTHETIC DEMONSTRATION DATA — NEW TOWN PILOT HOLDOUT'}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading pilot metrics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-teal-600 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-teal-700">
                Treatment Group (WhatsApp Enabled)
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {pilot?.treatment?.arrivalRate ?? 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Arrival Rate ({pilot?.treatment?.attended ?? 0} attended / {pilot?.treatment?.total ?? 0} assigned)
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-purple-600 p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-purple-700">
                Control Holdout Group (Campaigns Suppressed)
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {pilot?.control?.arrivalRate ?? 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Arrival Rate ({pilot?.control?.attended ?? 0} attended / {pilot?.control?.total ?? 0} assigned)
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-xl p-5 shadow-sm">
              <div className="text-xs font-bold uppercase text-teal-300">
                Observed Turn-Up Lift (Synthetic Pilot)
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                +{pilot?.liftPercentagePoints ?? 0} pp
              </div>
              <div className="text-xs text-teal-200 mt-1">
                Percentage-point improvement in OPD arrival rate vs Control Holdout
              </div>
            </div>
          </div>

          {/* Pilot Charts Row: Donut Cohort Split & Arrival Rate Bar Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Cohort Allocation Split (Pie / Donut)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Deterministic SHA-256 booking ID hash split (80% Treatment / 20% Holdout)
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cohortPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {cohortPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Treatment vs Control Arrival Rate (%)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Comparing reconciled HIS OPD arrival rates between WhatsApp-engaged patients and holdout control
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cohortComparisonBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="cohort" tick={{ fontSize: 12 }} />
                    <YAxis unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ArrivalRate" name="OPD Arrival Rate (%)" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="NoShowRate" name="No-Show Rate (%)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Persistent Cohort Assignment Records ({pilot?.assignments?.length || 0})
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <th className="py-2.5 px-3">Booking ID</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Deterministic Hash</th>
                  <th className="py-2.5 px-3">Assigned Cohort</th>
                  <th className="py-2.5 px-3">Campaigns Suppressed</th>
                  <th className="py-2.5 px-3">HIS Attendance Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(pilot?.assignments || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold">{a.bookingId}</td>
                    <td className="py-2.5 px-3 font-medium">{a.appointment?.patientName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{a.deterministicHash}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          a.cohortGroup === 'CONTROL'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {a.cohortGroup}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {a.campaignsSuppressed ? 'YES (Excluded)' : 'NO (Active)'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">
                      {a.appointment?.attendanceStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// PAGE 19: REPORTS & ANALYTICS
// ============================================================================
export const ReportsAnalyticsPage: React.FC<{ hospitalId?: string }> = () => {
  const { selectedHospitalId } = useHospitalFilter();
  const params = new URLSearchParams();
  if (selectedHospitalId !== 'ALL') params.set('hospitalId', selectedHospitalId);

  const { data } = useQuery({
    queryKey: ['reports-full', selectedHospitalId],
    queryFn: () => apiRequest(`/reports/overview?${params.toString()}`),
  });

  const overview = data?.data;
  const sourcePie = overview?.sourceBreakdown || [];
  const attendancePie = overview?.attendanceOutcomePie || [];
  const followUpPie = overview?.followUpTaskPie || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Operational Reports, Visual Pie Charts & CSV Exports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Department, Consultant, Booking Source, Attendance Reconciliation, and Call-Centre Escalation Analytics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              downloadAuthenticatedCsv(
                `/appointments/export/csv?${params.toString()}`,
                'anhvl-appointments-report.csv'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Appointments CSV
          </button>
          <button
            onClick={() =>
              downloadAuthenticatedCsv(
                `/followups/export/csv?${params.toString()}`,
                'anhvl-followups-report.csv'
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Call-Centre CSV
          </button>
        </div>
      </div>

      {/* 3 Pie Charts Row: Booking Source, HIS Attendance Outcomes, Call-Centre Task Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pie 1: Booking Source Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Booking Ingestion Channel Split
            </h3>
            <p className="text-xs text-slate-500">
              Distribution by HIS REST API, Webhook, SFTP CSV & Simulator
            </p>
          </div>
          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourcePie}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {sourcePie.map((entry: any, i: number) => (
                    <Cell key={entry.source} fill={entry.color || ['#0f766e', '#0284c7', '#7c3aed', '#f59e0b'][i % 4]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie 2: HIS Attendance Reconciliation Split */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              HIS Attendance Outcomes (Pie)
            </h3>
            <p className="text-xs text-slate-500">
              Completed, Arrived/Registered, Pending, No-Show & Unmatched
            </p>
          </div>
          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendancePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {attendancePie.map((entry: any, i: number) => (
                    <Cell key={entry.name} fill={entry.color || ['#0d9488', '#10b981', '#3b82f6', '#ef4444', '#a855f7'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie 3: Call-Centre Follow-Up Task Reasons */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Altruist Call-Centre Task Split
            </h3>
            <p className="text-xs text-slate-500">
              Escalations by Reschedule, Cancellation, Help, No-Show & Fallback
            </p>
          </div>
          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={followUpPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {followUpPie.map((entry: any, i: number) => (
                    <Cell key={entry.name} fill={entry.color || ['#f97316', '#ef4444', '#eab308', '#8b5cf6', '#dc2626'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Bar Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Department-Wise Conversion Bar Chart
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Comparing Booked, Confirmed, Attended, and No-Shows by clinical speciality
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.departmentAnalysis || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="booked" name="Booked" fill="#0f2942" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confirmed" name="Confirmed" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attended" name="Attended" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="noShows" name="No-Show" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Department-Wise Conversion Summary Table
          </h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase text-[11px]">
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Booked</th>
                <th className="py-2.5 px-3">Confirmed</th>
                <th className="py-2.5 px-3">Attended</th>
                <th className="py-2.5 px-3">No-Shows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.departmentAnalysis || []).map((d: any) => (
                <tr key={d.department} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{d.department}</td>
                  <td className="py-2.5 px-3 font-bold">{d.booked}</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">{d.confirmed}</td>
                  <td className="py-2.5 px-3 text-teal-700 font-bold">{d.attended}</td>
                  <td className="py-2.5 px-3 text-red-600 font-semibold">{d.noShows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

