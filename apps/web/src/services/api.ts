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
    } else {
      clearAuthSession();
      window.location.href = '/login';
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `API Error (${res.status})`);
  }

  return json as T;
}

export async function downloadAuthenticatedCsv(path: string, filename: string) {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Failed to export CSV');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

