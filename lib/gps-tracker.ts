"use client";

import { createClient } from "./supabase/client";

let trackingInterval: ReturnType<typeof setInterval> | null = null;

const GPS_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function insertLocation(userId: string, lat: number, lng: number, accuracy: number | null): Promise<boolean> {
  try {
    const supabase = createClient(); // browser SSR client → carries the session, so RLS (user_id = auth.uid()) passes
    const { error } = await supabase.from("gps_locations").insert({ user_id: userId, lat, lng, accuracy });
    if (error) {
      console.error("[gps] insert error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[gps] insert failed:", e);
    return false;
  }
}

function captureAndSend(userId: string) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    console.warn("[gps] Geolocation not available");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const ok = await insertLocation(userId, latitude, longitude, accuracy ?? null);
      if (ok) console.log(`[gps] Saved ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
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
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
  );
}

export function startGPSTracking(userId: string) {
  if (!userId || userId === "default") return;
  if (trackingInterval) return;

  console.log(`[gps] Starting tracking for user=${userId}, every ${GPS_INTERVAL_MS / 1000}s`);
  captureAndSend(userId);
  trackingInterval = setInterval(() => captureAndSend(userId), GPS_INTERVAL_MS);
}

export function stopGPSTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

export function isTracking(): boolean {
  return trackingInterval !== null;
}
