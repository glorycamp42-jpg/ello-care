import { getSupabase } from "./supabase";

/* ── Types ── */
export interface ElderLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  elder_id: string;
  title: string;
  type: "hospital" | "adhc" | "pharmacy" | "other";
  date: string;
  time: string;
  location: string;
  notes: string;
  created_at: string;
}

export interface FamilyLink {
  id: string;
  family_id: string;
  elder_id: string;
  relationship: string;
  elder_name: string;
  created_at: string;
}

export interface ElderUser {
  id: string;
  name: string;
  last_active: string | null;
}

/* ── Queries ── */

export async function getElderLocation(elderId: string): Promise<ElderLocation | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("gps_locations")
    .select("*")
    .eq("user_id", elderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("[family-db] getElderLocation error:", error.message);
    return null;
  }
  return data;
}

export async function getLocationHistory(elderId: string, limit = 20): Promise<ElderLocation[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gps_locations")
    .select("*")
    .eq("user_id", elderId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[family-db] getLocationHistory error:", error.message);
    return [];
  }
  return data || [];
}

export async function getAppointments(elderId: string): Promise<Appointment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("elder_id", elderId)
    .order("date", { ascending: true });

  if (error) {
    console.error("[family-db] getAppointments error:", error.message);
    return [];
  }
  return data || [];
}

export async function getFamilyLinks(familyId: string): Promise<FamilyLink[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("family_links")
    .select("*")
    .eq("family_id", familyId);

  if (error) {
    console.error("[family-db] getFamilyLinks error:", error.message);
    return [];
  }
  return data || [];
}

export async function insertGPSLocation(
  userId: string,
  latitude: number,
  longitude: number,
  accuracy: number | null
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("gps_locations")
    .insert({ user_id: userId, latitude, longitude, accuracy });

  if (error) {
    console.error("[family-db] insertGPSLocation error:", error.message);
    return false;
  }
  return true;
}
