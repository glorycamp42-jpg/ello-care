"use client";

import { insertGPSLocation } from "./family-db";

let trackingInterval: ReturnType<typeof setInterval> | null = null;

const GPS_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function captureAndSend(userId: string) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    console.warn("[gps] Geolocation not available");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      console.log(`[gps] Captured: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${accuracy?.toFixed(0)}m)`);

      const ok = await insertGPSLocation(userId, latitude, longitude, accuracy);
      if (ok) {
        console.log("[gps] Location saved to Supabase");
      }

      // Also save locally for quick access
      try {
        localStorage.setItem(
          "ello-last-gps",
          JSON.stringify({ latitude, longitude, accuracy, timestamp: new Date().toISOString() })
        );
      } catch {}
    },
    (err) => {
      console.warn(`[gps] Error: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

export function startGPSTracking(userId: string) {
  if (trackingInterval) {
    console.log("[gps] Already tracking");
    return;
  }

  console.log(`[gps] Starting tracking for user=${userId}, interval=${GPS_INTERVAL_MS / 1000}s`);

  // Capture immediately
  captureAndSend(userId);

  // Then every 5 minutes
  trackingInterval = setInterval(() => {
    captureAndSend(userId);
  }, GPS_INTERVAL_MS);
}

export function stopGPSTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    console.log("[gps] Tracking stopped");
  }
}

export function isTracking(): boolean {
  return trackingInterval !== null;
}
