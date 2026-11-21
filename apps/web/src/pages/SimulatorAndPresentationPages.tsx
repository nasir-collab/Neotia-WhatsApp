import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  StepForward,
  Smartphone,
  Server,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  PhoneCall,
  Layers,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { NeotiaBrandLogo } from '../components/NeotiaBrandLogo';

// ============================================================================
// PAGE 24: INTERACTIVE LIVE DEMO SIMULATOR (10 SCENARIOS)
// ============================================================================
export const LiveDemoSimulatorPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['simulator-status'],
    queryFn: () => apiRequest('/simulator'),
  });

  const startMutation = useMutation({
    mutationFn: (scenarioId: string) =>
      apiRequest('/simulator/start', {
        method: 'POST',
        body: JSON.stringify({ scenarioId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
    },
  });

  const nextStepMutation = useMutation({
    mutationFn: () => apiRequest('/simulator/next-step', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
    },
  });

  const clockMutation = useMutation({
    mutationFn: (minutes: number) =>
      apiRequest('/simulator/advance-clock', {
        method: 'POST',
        body: JSON.stringify({ minutes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (paused: boolean) =>
      apiRequest('/simulator/pause', {
        method: 'POST',
        body: JSON.stringify({ paused }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest('/simulator/reset', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
    },
  });

  const sim = data?.data;
  const scenarios = sim?.scenarios || [];
  const currentScenario = sim?.currentScenario;
  const state = sim?.state || {};
  const activeAppt = sim?.activeAppointment;

  return (
    <div className="space-y-5">
      {/* Unmistakable DEMO Label */}
      <div className="p-3.5 rounded-xl bg-amber-100 border-2 border-amber-400 text-amber-950 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
          <span>
            {sim?.demoBanner ||
              'ISOLATED SYNTHETIC DEMO SIMULATOR — EXERCISES REAL BACKEND WORKFLOWS ON SYNTHETIC DATA ONLY'}
          </span>
        </div>
        <span className="font-mono bg-amber-200/80 px-2.5 py-1 rounded text-[11px]">
          Simulated Clock:{' '}
          {state.simulatedClockIso
            ? new Date(state.simulatedClockIso).toLocaleString('en-IN')
            : 'Ready'}
        </span>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentScenario?.id || 'SCENARIO_1_CONFIRM'}
            onChange={(e) => startMutation.mutate(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-900"
          >
            {scenarios.map((sc: any) => (
              <option key={sc.id} value={sc.id}>
                {sc.title} ({sc.hospitalCode} • {sc.language.toUpperCase()})
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              startMutation.mutate(currentScenario?.id || 'SCENARIO_1_CONFIRM')
            }
            disabled={startMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            Start / Restart Scenario
          </button>

          <button
            onClick={() => nextStepMutation.mutate()}
            disabled={
              !state.isRunning ||
              state.isPaused ||
              state.currentStep >= (currentScenario?.totalSteps || 4)
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold shadow-sm"
          >
            <StepForward className="w-3.5 h-3.5" />
            Run Next Event (Step {state.currentStep || 0}/{currentScenario?.totalSteps || 0})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => clockMutation.mutate(60)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 font-semibold"
          >
            <FastForward className="w-3.5 h-3.5" />
            +1h Clock
          </button>
          <button
            onClick={() => clockMutation.mutate(180)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 font-semibold"
          >
            <FastForward className="w-3.5 h-3.5" />
            +3h Clock
          </button>
          <button
            onClick={() => pauseMutation.mutate(!state.isPaused)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 font-semibold"
          >
            <Pause className="w-3.5 h-3.5" />
            {state.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => resetMutation.mutate()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* 10 Scenario Quick Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {scenarios.map((sc: any) => (
          <button
            key={sc.id}
            onClick={() => startMutation.mutate(sc.id)}
            className={`text-left p-2.5 rounded-lg border text-[11px] transition-all ${
              currentScenario?.id === sc.id
                ? 'bg-teal-950 text-white border-teal-700 shadow'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-bold truncate">{sc.title}</div>
            <div
              className={`text-[10px] mt-0.5 ${
                currentScenario?.id === sc.id ? 'text-teal-300' : 'text-slate-400'
              }`}
            >
              {sc.hospitalCode} • {sc.language.toUpperCase()}
            </div>
          </button>
        ))}
      </div>

      {/* Main Split View: Simulated Patient WhatsApp Screen + Hospital Operations View */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading simulator...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Simulated Patient WhatsApp Handset */}
          <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-4 text-white shadow-xl border border-slate-800 flex flex-col h-[540px]">
            <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                  WA
                </div>
                <div>
                  <div className="text-xs font-bold">
                    Neotia Bhagirathi / ANHVL Official
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    Simulated Patient Handset • Verified Business Account (DEMO)
                  </div>
                </div>
              </div>
              <Smartphone className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(state.whatsappHandsetMessages || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 px-6">
                  Click "Start / Restart Scenario" above to ingest a synthetic HIS appointment and trigger WhatsApp messaging.
                </div>
              ) : (
                (state.whatsappHandsetMessages || []).map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 text-xs max-w-[90%] ${
                      msg.sender === 'PATIENT'
                        ? 'ml-auto bg-emerald-700 text-white'
                        : msg.sender === 'SYSTEM'
                        ? 'mx-auto bg-amber-950/90 border border-amber-700 text-amber-200 text-[11px] max-w-full'
                        : 'bg-slate-800 text-slate-100 border border-slate-700'
                    }`}
                  >
                    <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700 grid grid-cols-2 gap-1.5">
                        {msg.buttons.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={() => nextStepMutation.mutate()}
                            className="px-2 py-1 rounded bg-slate-700 hover:bg-teal-600 text-teal-300 hover:text-white text-[10px] font-semibold text-center transition-colors"
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-[9px] text-slate-400 flex justify-between">
                      <span>{msg.sender}</span>
                      <span>{msg.status || ''}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Hospital Operations & Backend State View */}
          <div className="lg:col-span-7 space-y-4">
            {/* Scenario Progress Checklist */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {currentScenario?.title}
                </h3>
                <span className="text-xs font-semibold text-teal-700">
                  Step {state.currentStep || 0} of {currentScenario?.totalSteps || 0}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {currentScenario?.description}
              </p>

              <div className="space-y-2">
                {(currentScenario?.steps || []).map((stText: string, idx: number) => {
                  const stepNum = idx + 1;
                  const done = (state.currentStep || 0) >= stepNum;
                  return (
                    <div
                      key={stText}
                      className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${
                        done
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          done ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span>
                        Step {stepNum}: {stText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Database Record Inspector */}
            {activeAppt && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-teal-600" />
                    Live PostgreSQL Record State: {activeAppt.bookingId}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-[10px]">
                    Appt Status: {activeAppt.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded bg-slate-50 border">
                    <div className="text-[10px] text-slate-400">Hospital & Lang</div>
                    <div className="font-bold text-slate-800">
                      {activeAppt.hospital?.code} ({activeAppt.preferredLanguage.toUpperCase()})
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border">
                    <div className="text-[10px] text-slate-400">Consent Status</div>
                    <div className="font-bold text-slate-800">{activeAppt.consentStatus}</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border">
                    <div className="text-[10px] text-slate-400">HIS Attendance</div>
                    <div className="font-bold text-slate-800">{activeAppt.attendanceStatus}</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border">
                    <div className="text-[10px] text-slate-400">Pilot Cohort</div>
                    <div className="font-bold text-slate-800">
                      {activeAppt.holdoutAssignment?.cohortGroup || 'TREATMENT'}
                    </div>
                  </div>
                </div>

                {activeAppt.followUpTasks?.length > 0 && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <strong>Altruist Call-Centre Task Generated:</strong>{' '}
                    {activeAppt.followUpTasks[0].taskCode} ({activeAppt.followUpTasks[0].taskType}) — Priority: {activeAppt.followUpTasks[0].priority}
                  </div>
                )}
              </div>
            )}

            {/* Simulator Event History */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-900 mb-2">
                Simulator Execution Event History
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                {(state.eventHistory || []).map((ev: any, i: number) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-teal-800 mr-2">
                        [{ev.module}]
                      </span>
                      <span className="text-slate-700">{ev.summary}</span>
                    </div>
                    <span className="font-bold text-slate-500">{ev.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SECTION 20: CLIENT PRESENTATION MODE (STRICTLY OPERATIONAL — NO COMMERCIALS)
// ============================================================================
export const ClientPresentationModePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      badge: '01 • Solution Overview',
      title: 'Centralized WhatsApp Patient Engagement Platform',
      subtitle: 'Prepared for Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL) • Solution Partner: Plan D Media',
      points: [
        'Converts booked OPD appointments into attended visits across New Town (Kolkata) and Raipur.',
        'Operates using an ANHVL-owned WhatsApp Business Account (WABA) and connects with the hospital HIS environment.',
        'Supports hospital-specific messaging, regional language routing (Bengali, Hindi, English), and structured call-centre follow-up.',
        'Strict non-clinical boundary: Only appointment and service navigation communication is sent; clinical diagnosis and prescriptions remain outside WhatsApp.',
      ],
    },
    {
      badge: '02 • Complete Patient Journey',
      title: 'End-to-End Operational Workflow — From Booking to Attendance',
      subtitle: 'Automated routine communication combined with human call-centre escalation for exceptions',
      points: [
        'Step 1 — HIS Booking Ingestion: Read new, updated, rescheduled, or cancelled bookings with stable Booking ID deduplication.',
        'Step 2 — Consent & Language Selection: Verify patient communication eligibility and route Bengali/English (New Town) or Hindi/English (Raipur).',
        'Step 3 — Confirmation & Reminders: Dispatch approved utility templates immediately upon booking, at ~24 hours prior, and ~2–3 hours prior.',
        'Step 4 — Directions & First-Visit Help: Share Google Maps pin, gate/parking guidance, OPD floor/desk, and Raipur first-visit navigator help.',
        'Step 5 — Response Capture, Call-Centre Handoff & HIS Attendance Reconciliation.',
      ],
    },
    {
      badge: '03 • Appointment Confirmation & Automated Reminders',
      title: 'Time-Aware Scheduling & Quiet-Hours Protection',
      subtitle: 'Persistent background job processing powered by PostgreSQL & Redis/BullMQ',
      points: [
        'Immediate Appointment Confirmation with interactive Confirm, Reschedule, Cancel, and Talk-to-Us options.',
        '24-Hour Advance Reminder and 2–3-Hour Pre-Appointment Same-Day Reminder.',
        'Redundant Burst Prevention: Same-day bookings automatically skip the 24-hour advance reminder.',
        'Hospital Quiet Hours: Routine messages are restricted to 8:00 AM – 9:00 PM local time, with an approved 07:00 AM exception window for early-morning OPD visits.',
        'Dynamic Re-Timing: Any HIS reschedule or official cancellation immediately cancels obsolete pending reminders.',
      ],
    },
    {
      badge: '04 • Patient Interactions & Call-Centre / Altruist Workflow',
      title: 'Operating Principle: Automation + Structured Human Follow-Up',
      subtitle: 'Cases requiring judgement, slot reallocation, or assistance route directly to Altruist / Hospital agents',
      points: [
        'Confirm Appointment: Updates status to CONFIRMED and shares hospital directions & first-visit preparation guide.',
        'Reschedule Request: Sets status to RESCHEDULE_REQUESTED (never auto-allocates slots) and creates a High-Priority Call-Centre task.',
        'Cancellation Request: Records CANCELLATION_REQUESTED and creates a review task; booking is only marked officially CANCELLED once confirmed by the hospital/HIS.',
        'Talk to Us & Delivery Failures: Creates actionable tasks in the Altruist Agent Worklist (with one-click CSV export and REST adapter support).',
      ],
    },
    {
      badge: '05 • Hospital Dashboard, Pilot Holdout & Security Safeguards',
      title: 'Real-Time Analytics, Attendance Reconciliation & Data Protection',
      subtitle: 'Transparent operational metrics with documented denominators',
      points: [
        'Distinguishes API Submission (SENT), Meta Delivery Receipt (DELIVERED/READ), Patient Confirmation (CONFIRMED), and HIS Attendance (REGISTERED/COMPLETED).',
        'Unmatched HIS visit records are isolated as UNMATCHED and never falsely classified as arrived or no-show.',
        'Verified No-Show Rebooking Prompt triggers only when the HIS outcome feed confirms NO_SHOW.',
        'New Town Pilot Holdout Module supports deterministic 80/20 Treatment vs Control group comparison.',
        'Instant STOP / Opt-Out processing with pre-queue and pre-send suppression checks and full RBAC audit logging.',
      ],
    },
  ];

  const current = slides[activeSlide];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#062646] via-[#0B4F8A] to-[#041A30] text-white rounded-2xl p-8 shadow-xl border border-[#0D68AF]/40 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, #F39200 0%, #FFB74D 40%, #0D68AF 40%, #38bdf8 100%)' }}
        />
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <NeotiaBrandLogo size="sm" />
            <span className="px-3 py-1 rounded-full bg-[#F39200]/20 border border-[#F39200]/40 text-[#FFB74D] text-xs font-bold">
              {current.badge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`w-8 h-2 rounded-full transition-all ${
                  activeSlide === i ? 'bg-[#F39200] w-12' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          {current.title}
        </h1>
        <p className="text-sm text-[#FFB74D] mb-6">{current.subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {current.points.map((pt) => (
            <div
              key={pt}
              className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3 text-xs leading-relaxed text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>{pt}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
              disabled={activeSlide === 0}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold"
            >
              ← Previous Topic
            </button>
            <button
              onClick={() => setActiveSlide((s) => Math.min(slides.length - 1, s + 1))}
              disabled={activeSlide === slides.length - 1}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold"
            >
              Next Topic →
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/architecture')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
            >
              <Layers className="w-4 h-4 text-teal-400" />
              View Architecture Diagram
            </button>
            <button
              onClick={() => navigate('/simulator')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg"
            >
              Launch Interactive Synthetic Simulator
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

