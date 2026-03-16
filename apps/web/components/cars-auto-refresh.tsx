"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const REFRESH_GUARD_MS = 1_500;

type RouteAutoRefreshProps = {
  intervalMs?: number | null;
};

export function RouteAutoRefresh({
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS
}: RouteAutoRefreshProps) {
  const router = useRouter();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_GUARD_MS) {
        return;
      }

      lastRefreshRef.current = now;
      startTransition(() => {
        router.refresh();
      });
    };

    const intervalId = intervalMs ? window.setInterval(refresh, intervalMs) : null;
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [intervalMs, router]);

  return null;
}

export function CarsAutoRefresh() {
  return <RouteAutoRefresh />;
}
