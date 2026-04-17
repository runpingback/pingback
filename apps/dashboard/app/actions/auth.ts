"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function setTokens(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set("pingback_access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  cookieStore.set("pingback_refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearTokens() {
  const cookieStore = await cookies();
  cookieStore.delete("pingback_access_token");
  cookieStore.delete("pingback_refresh_token");
  redirect("/login");
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("pingback_access_token")?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("pingback_refresh_token")?.value;
}
