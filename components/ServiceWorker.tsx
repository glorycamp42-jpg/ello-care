"use client";

import { useEffect } from "react";

/** Registers /sw.js so the PWA is installable and static assets survive flaky connections. */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller; // first install: no reload needed
    navigator.serviceWorker.register("/sw.js").then((reg) => { reg.update().catch(() => {}); }).catch((e) => console.warn("[sw] register failed:", e));
    // a new worker took over (new deploy) → reload once so the page and its chunks match
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloaded || !hadController) return; reloaded = true; window.location.reload(); });
  }, []);
  return null;
}
