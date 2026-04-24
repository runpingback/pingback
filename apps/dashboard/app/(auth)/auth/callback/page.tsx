"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens, apiClient } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);

      const pendingPlan = localStorage.getItem("pingback_pending_plan");
      if (pendingPlan === "pro" || pendingPlan === "team") {
        localStorage.removeItem("pingback_pending_plan");
        apiClient
          .post<{ url: string }>("/api/v1/subscription/checkout", { plan: pendingPlan })
          .then((result) => {
            window.location.href = result.url;
          })
          .catch(() => {
            router.push("/projects");
          });
        return;
      }

      router.push("/projects");
    } else {
      router.push("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Signing you in...</p></div>}>
      <CallbackHandler />
    </Suspense>
  );
}
