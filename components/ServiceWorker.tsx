"use client";

import { useEffect } from "react";

/** Registers /sw.js so the PWA is installable and static assets survive flaky connections. */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[sw] register failed:", e));
  }, []);
  return null;
}
