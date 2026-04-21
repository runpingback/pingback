const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function getAccessToken(): string | undefined {
  return getCookie("pingback_access_token");
}

export function setTokens(accessToken: string, refreshToken: string) {
  setCookie("pingback_access_token", accessToken, 60 * 15); // 15 min
  setCookie("pingback_refresh_token", refreshToken, 60 * 60 * 24 * 7); // 7 days
}

export function clearTokens() {
  deleteCookie("pingback_access_token");
  deleteCookie("pingback_refresh_token");
  window.location.href = "/login";
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCookie("pingback_refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getAccessToken();

  const makeRequest = (authToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${authToken}`,
      },
    });

  // If no token, try refreshing first
  if (!token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return makeRequest(newToken);
    }
    clearTokens();
    return new Response(JSON.stringify({ message: "Session expired. Please sign in again." }), { status: 401 });
  }

  let res = await makeRequest(token);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      clearTokens();
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
