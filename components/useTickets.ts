"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Happiness Ticket (행복티켓) System ── */

export interface TicketLog {
  action: string;
  points: number;
  time: string; // ISO string
}

export interface TicketState {
  total: number;
  todayLogs: TicketLog[];
  todayTotal: number;
  lastLoginDate: string; // YYYY-MM-DD
  dailyCheckedIn: boolean;
}

const STORAGE_KEY = "ello-tickets";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): TicketState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no state");
    const s = JSON.parse(raw) as TicketState;
    // Reset daily logs if new day
    if (s.lastLoginDate !== today()) {
      s.todayLogs = [];
      s.todayTotal = 0;
      s.dailyCheckedIn = false;
      s.lastLoginDate = today();
    }
    return s;
  } catch {
    return {
      total: 0,
      todayLogs: [],
      todayTotal: 0,
      lastLoginDate: today(),
      dailyCheckedIn: false,
    };
  }
}

function persist(s: TicketState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export type TicketAction =
  | "chat"         // +1 AI와 대화
  | "checkin"      // +2 오늘 안부 체크인
  | "photo"        // +2 사진/서류 업로드
  | "daily"        // +3 매일 접속
  | "wordgame"     // +2 끝말잇기 게임 참여
  | "sing";        // +1 노래 부르기

const ACTION_POINTS: Record<TicketAction, number> = {
  chat: 1,
  checkin: 2,
  photo: 2,
  daily: 3,
  wordgame: 2,
  sing: 1,
};

const ACTION_LABELS: Record<TicketAction, string> = {
  chat: "AI와 대화",
  checkin: "안부 체크인",
  photo: "사진 업로드",
  daily: "매일 접속",
  wordgame: "끝말잇기 게임",
  sing: "노래 부르기",
};

export function useTickets() {
  const [state, setState] = useState<TicketState>({
    total: 0, todayLogs: [], todayTotal: 0,
    lastLoginDate: today(), dailyCheckedIn: false,
  });
  const [toast, setToast] = useState<{ points: number; label: string } | null>(null);

  // Load on mount + grant daily login bonus
  useEffect(() => {
    const s = loadState();
    if (!s.dailyCheckedIn) {
      const pts = ACTION_POINTS.daily;
      s.total += pts;
      s.todayTotal += pts;
      s.todayLogs.push({ action: ACTION_LABELS.daily, points: pts, time: new Date().toISOString() });
      s.dailyCheckedIn = true;
      persist(s);
      // Show toast after a short delay so UI is ready
      setTimeout(() => setToast({ points: pts, label: ACTION_LABELS.daily }), 800);
    }
    setState(s);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const earn = useCallback((action: TicketAction) => {
    setState((prev) => {
      const pts = ACTION_POINTS[action];
      const label = ACTION_LABELS[action];
      const next: TicketState = {
        ...prev,
        total: prev.total + pts,
        todayTotal: prev.todayTotal + pts,
        todayLogs: [...prev.todayLogs, { action: label, points: pts, time: new Date().toISOString() }],
      };
      persist(next);
      setToast({ points: pts, label });
      return next;
    });
  }, []);

  return { state, earn, toast, dismissToast: () => setToast(null) };
}
