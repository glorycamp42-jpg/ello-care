"use client";

/**
 * Medication reminders live in the health wallet (health_medications.times) on the server,
 * so the elder, their family, and the care center all edit the same list and 엘로 always knows it.
 * The phone keeps a localStorage copy (MEDS_KEY) only as a cache for the alarm loop / offline.
 */
import { loadMeds, saveMeds, type Medication } from "@/components/MedicationPage";

type Row = {
  id: string; name: string; dosage?: string; frequency?: string; purpose?: string;
  times?: string[] | null; reminder_enabled?: boolean | null; is_active?: boolean | null;
};

const TIME_RE = /^\d{2}:\d{2}$/;

function rowToMed(r: Row): Medication {
  return {
    id: r.id,
    name: r.name,
    times: (r.times || []).filter(t => TIME_RE.test(t)).sort(),
    enabled: r.reminder_enabled !== false,
    dosage: r.dosage || "",
  };
}

function q(userId?: string) {
  return `/api/health-wallet?table=health_medications${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`;
}

async function fetchRows(userId?: string): Promise<Row[] | null> {
  try {
    const res = await fetch(q(userId), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const rows = (data.health_medications || []) as Row[];
    return rows.filter(r => r.is_active !== false);
  } catch { return null; }
}

/** Pull the server list into the phone cache. First run on a phone that still has local-only reminders uploads them once. */
export async function syncMedsFromServer(userId?: string): Promise<Medication[] | null> {
  let rows = await fetchRows(userId);
  if (!rows) return null; // offline → keep cache
  if (rows.length === 0 && !userId) {
    // upload the phone's legacy reminders once — but only if they were saved by this same account
    let owner = "";
    try { owner = localStorage.getItem("ello-meds-owner") || ""; } catch {}
    let me = "";
    try { me = localStorage.getItem("ello-userId") || ""; } catch {}
    const local = (!owner || owner === me) ? loadMeds().filter(m => m.name && m.times.length) : [];
    if (local.length) {
      for (const m of local) await addMedOnServer({ name: m.name, times: m.times, enabled: m.enabled });
      rows = (await fetchRows()) || [];
    }
  }
  const meds = rows.map(rowToMed);
  if (!userId) {
    saveMeds(meds);
    try { const me = localStorage.getItem("ello-userId"); if (me) localStorage.setItem("ello-meds-owner", me); } catch {}
  }
  return meds;
}

/** Add a reminder. If a medication with the same name already exists (e.g. entered in the health wallet), attach the times to it. */
export async function addMedOnServer(input: { name: string; times: string[]; enabled?: boolean; userId?: string }): Promise<boolean> {
  const name = input.name.trim();
  const times = Array.from(new Set(input.times.filter(t => TIME_RE.test(t)))).sort();
  if (!name) return false;
  const rows = (await fetchRows(input.userId)) || [];
  const same = rows.find(r => r.name.trim().toLowerCase() === name.toLowerCase());
  try {
    if (same) {
      const merged = Array.from(new Set([...(same.times || []), ...times])).sort();
      const res = await fetch("/api/health-wallet", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "health_medications", id: same.id, times: merged, reminder_enabled: input.enabled !== false, is_active: true }) });
      return res.ok;
    }
    const res = await fetch("/api/health-wallet", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "health_medications", user_id: input.userId, name, times, reminder_enabled: input.enabled !== false, frequency: times.length ? `하루 ${times.length}번` : "" }) });
    return res.ok;
  } catch { return false; }
}

export async function updateMedOnServer(id: string, patch: { times?: string[]; enabled?: boolean; name?: string }): Promise<boolean> {
  try {
    const body: Record<string, unknown> = { table: "health_medications", id };
    if (patch.times) body.times = patch.times.filter(t => TIME_RE.test(t)).sort();
    if (patch.enabled !== undefined) body.reminder_enabled = patch.enabled;
    if (patch.name) body.name = patch.name.trim();
    const res = await fetch("/api/health-wallet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch { return false; }
}

/** Remove a reminder. A medication that also carries health-wallet details (dosage/purpose) keeps its row and just loses its times. */
export async function removeMedOnServer(id: string, userId?: string): Promise<boolean> {
  const rows = (await fetchRows(userId)) || [];
  const row = rows.find(r => r.id === id);
  try {
    if (row && (row.dosage || row.purpose)) {
      const res = await fetch("/api/health-wallet", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "health_medications", id, times: [], reminder_enabled: false }) });
      return res.ok;
    }
    const res = await fetch("/api/health-wallet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "health_medications", id }) });
    return res.ok;
  } catch { return false; }
}

/** Remove by (partial) name — used when 엘로 is told "혈압약 알림 지워". */
export async function removeMedByNameOnServer(name: string, userId?: string): Promise<number> {
  const n = name.trim().toLowerCase();
  if (!n) return 0;
  const rows = (await fetchRows(userId)) || [];
  const hits = rows.filter(r => { const rn = r.name.toLowerCase(); return rn.includes(n) || n.includes(rn); });
  let count = 0;
  for (const h of hits) if (await removeMedOnServer(h.id, userId)) count++;
  return count;
}
