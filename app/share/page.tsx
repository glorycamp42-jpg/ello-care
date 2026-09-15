"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

/* Android share target: Messages app → 공유 → Ello. Stores the shared text and opens the 문자 screen at home. */
function ShareInner() {
  const params = useSearchParams();
  useEffect(() => {
    const text = [params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join("\n").trim();
    try { if (text) sessionStorage.setItem("ello-share-text", text); } catch {}
    window.location.replace("/");
  }, [params]);
  return <div className="min-h-dvh bg-cream flex items-center justify-center text-[22px] font-bold text-[#2B211C]">엘로가 읽고 있어요…</div>;
}
export default function SharePage() { return <Suspense fallback={null}><ShareInner /></Suspense>; }
