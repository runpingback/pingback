import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/app/actions/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  const accessToken = await getAccessToken();
  if (!refreshToken || !accessToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken();

  const makeRequest = (authToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${authToken}`,
      },
    });

  let res = await makeRequest(token || "");

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      await clearTokens();
    }
  }

  return res;
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const res = await fetchWithAuth(path);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `GET ${path} failed (${res.status})`);
    }
    return res.json();
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `POST ${path} failed (${res.status})`);
    }
    return res.json();
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `PATCH ${path} failed (${res.status})`);
    }
    return res.json();
  },

  async delete(path: string): Promise<void> {
    const res = await fetchWithAuth(path, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `DELETE ${path} failed (${res.status})`);
    }
  },
};
