import { handleFallbackRequest } from './fallback-engine';

export const API_BASE = '/api/v1';

export interface AuthSessionUser {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  hospitalId: string | null;
  hospitalName: string;
  hospitalCode: string;
  permissions: string[];
  agentProfile?: any;
}

export function getStoredToken(): string | null {
  return localStorage.getItem('anhvl_access_token');
}

export function getStoredUser(): AuthSessionUser | null {
  const raw = localStorage.getItem('anhvl_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(accessToken: string, refreshToken: string, user: AuthSessionUser) {
  localStorage.setItem('anhvl_access_token', accessToken);
  localStorage.setItem('anhvl_refresh_token', refreshToken);
  localStorage.setItem('anhvl_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('anhvl_access_token');
  localStorage.removeItem('anhvl_refresh_token');
  localStorage.setItem('anhvl_explicit_logout', '1');
  sessionStorage.setItem('anhvl_explicit_logout', '1');
  localStorage.removeItem('anhvl_user');
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && localStorage.getItem('anhvl_refresh_token') && !path.includes('/auth/')) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('anhvl_refresh_token') }),
      });
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        const newToken = refreshJson.data?.accessToken;
        if (newToken) {
          localStorage.setItem('anhvl_access_token', newToken);
          headers['Authorization'] = `Bearer ${newToken}`;
          res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        }
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return handleFallbackRequest(path, options) as T;
    }

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || `API Error (${res.status})`);
    }
    return json as T;
  } catch (err: any) {
    if (err?.message?.includes('Non-Clinical') || err?.message?.includes('Cannot switch to PRODUCTION')) {
      throw err;
    }
    return handleFallbackRequest(path, options) as T;
  }
}

export async function downloadAuthenticatedCsv(path: string, filename: string) {
  const token = getStoredToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok && (res.headers.get('content-type') || '').includes('csv')) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return;
    }
  } catch {
    // fallback to client CSV generation
  }

  const apptsRes = handleFallbackRequest('/appointments', { method: 'GET' });
  const list = apptsRes.data || [];
  const header = 'BookingID,PatientName,Mobile,Language,Hospital,Department,Doctor,Date,Time,Status,Attendance\n';
  const rows = list
    .map((a: any) =>
      [
        a.bookingId,
        `"${a.patientName}"`,
        a.mobileNumber,
        a.preferredLanguage,
        `"${a.hospital?.city || ''}"`,
        `"${a.department}"`,
        `"${a.doctorName}"`,
        new Date(a.appointmentDate).toISOString().split('T')[0],
        a.appointmentTime,
        a.status,
        a.attendanceStatus,
      ].join(',')
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
