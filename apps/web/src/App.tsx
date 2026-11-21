import React, { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest, getStoredToken, getStoredUser, setAuthSession } from './services/api';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ExecutiveOverviewPage } from './pages/ExecutiveOverviewPage';
import {
  AppointmentManagementPage,
  AppointmentDetailsPage,
  PatientProfilesPage,
} from './pages/AppointmentsPages';
import {
  WhatsAppCommCentrePage,
  TemplateManagementPage,
  ReminderSchedulerPage,
  PatientResponsesPage,
} from './pages/MessagingPages';
import {
  FollowUpWorklistPage,
  AgentManagementPage,
  NoShowManagementPage,
  ConsentManagementPage,
  AttendanceReconciliationPage,
} from './pages/OperationsPages';
import {
  HisIntegrationMonitorPage,
  WhatsAppIntegrationSettingsPage,
  AltruistIntegrationSettingsPage,
  PilotControlGroupPage,
  ReportsAnalyticsPage,
} from './pages/IntegrationsPages';
import {
  HospitalConfigurationPage,
  UserRoleManagementPage,
  AuditLogsPage,
  SystemSettingsPage,
  ArchitectureViewPage,
} from './pages/AdministrationPages';
import {
  LiveDemoSimulatorPage,
  ClientPresentationModePage,
} from './pages/SimulatorAndPresentationPages';
import {
  DoctorDisruptionPage,
  RetargetingConsolePage,
} from './pages/CampaignsPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoutes() {
  const [user, setUser] = useState<any>(() => getStoredUser());
  const [hospitalId, setHospitalId] = useState<string>(() => {
    const storedUser = getStoredUser();
    return storedUser?.hospitalId || '';
  });
  const [bootstrapping, setBootstrapping] = useState<boolean>(() => {
    return !getStoredToken() && !sessionStorage.getItem('anhvl_explicit_logout');
  });
  const location = useLocation();
  const token = getStoredToken();

  useEffect(() => {
    if (!getStoredToken() && !sessionStorage.getItem('anhvl_explicit_logout')) {
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'superadmin@anhvl-demo.in',
          password: 'AnhvlDemo@2026',
        }),
      })
        .then((res) => {
          const { accessToken, refreshToken, user: loggedInUser } = res.data;
          setAuthSession(accessToken, refreshToken, loggedInUser);
          setUser(loggedInUser);
          if (loggedInUser?.hospitalId) {
            setHospitalId(loggedInUser.hospitalId);
          }
        })
        .catch(() => {
          // Fallback to login screen if auto-bootstrap fails
        })
        .finally(() => {
          setBootstrapping(false);
        });
    } else {
      const u = getStoredUser();
      setUser(u);
      if (u?.hospitalId && hospitalId !== u.hospitalId) {
        setHospitalId(u.hospitalId);
      }
      setBootstrapping(false);
    }
  }, [location.pathname]);

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-200">
          Loading ANHVL WhatsApp Patient Engagement Platform...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Connecting to New Town (Kolkata) & Raipur Operations Engine
        </p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <DashboardLayout
      selectedHospitalId={hospitalId}
      onSelectHospital={setHospitalId}
      user={user}
    >
      <Routes>
        <Route path="/" element={<ExecutiveOverviewPage hospitalId={hospitalId} />} />
        <Route path="/appointments" element={<AppointmentManagementPage hospitalId={hospitalId} />} />
        <Route path="/appointments/:id" element={<AppointmentDetailsPage />} />
        <Route path="/patients" element={<PatientProfilesPage hospitalId={hospitalId} />} />
        <Route path="/messages" element={<WhatsAppCommCentrePage hospitalId={hospitalId} />} />
        <Route path="/templates" element={<TemplateManagementPage hospitalId={hospitalId} />} />
        <Route path="/scheduler" element={<ReminderSchedulerPage hospitalId={hospitalId} />} />
        <Route path="/responses" element={<PatientResponsesPage hospitalId={hospitalId} />} />
        <Route path="/followups" element={<FollowUpWorklistPage hospitalId={hospitalId} />} />
        <Route path="/agents" element={<AgentManagementPage hospitalId={hospitalId} />} />
        <Route path="/no-shows" element={<NoShowManagementPage hospitalId={hospitalId} />} />
        <Route path="/consent" element={<ConsentManagementPage hospitalId={hospitalId} />} />
        <Route path="/attendance" element={<AttendanceReconciliationPage hospitalId={hospitalId} />} />
        <Route path="/integrations/his" element={<HisIntegrationMonitorPage hospitalId={hospitalId} />} />
        <Route path="/integrations/whatsapp" element={<WhatsAppIntegrationSettingsPage hospitalId={hospitalId} />} />
        <Route path="/integrations/altruist" element={<AltruistIntegrationSettingsPage hospitalId={hospitalId} />} />
        <Route path="/pilot" element={<PilotControlGroupPage />} />
        <Route path="/reports" element={<ReportsAnalyticsPage hospitalId={hospitalId} />} />
        <Route path="/hospitals" element={<HospitalConfigurationPage />} />
        <Route path="/users" element={<UserRoleManagementPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage hospitalId={hospitalId} />} />
        <Route path="/settings" element={<SystemSettingsPage />} />
        <Route path="/architecture" element={<ArchitectureViewPage />} />
        <Route path="/simulator" element={<LiveDemoSimulatorPage />} />
        <Route path="/presentation" element={<ClientPresentationModePage />} />
        <Route path="/doctor-disruptions" element={<DoctorDisruptionPage />} />
        <Route path="/retargeting" element={<RetargetingConsolePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export function App() {
  const isGitHubPages =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const RouterComponent = isGitHubPages ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterComponent>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </RouterComponent>
    </QueryClientProvider>
  );
}

export default App;
