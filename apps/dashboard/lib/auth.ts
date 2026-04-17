const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function loginWithCredentials(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Login failed" }));
    throw new Error(error.message || "Invalid credentials");
  }

  return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

export async function registerWithCredentials(email: string, password: string, name?: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(error.message || "Registration failed");
  }

  return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

export function getGithubAuthUrl() {
  return `${API_URL}/auth/github`;
}
