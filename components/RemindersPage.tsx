"use client";

import { useState, useEffect, useCallback } from "react";
import { Memory } from "@/lib/supabase";

interface RemindersPageProps {
  onClose: () => void;
}

export default function RemindersPage({ onClose }: RemindersPageProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error("[reminders] Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  async function handleDelete(id: string) {
    try {
      await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("[reminders] Delete failed:", err);
    }
  }

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          돌아가기
        </button>
        <span className="text-warm-brown font-bold text-base">일정</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Title */}
        <div className="flex items-center gap-2 pt-4 pb-4">
          <span className="text-[28px]">&#x1F4C5;</span>
          <h1 className="text-xl font-bold text-warm-brown">예약 / 일정</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-warm-gray-light">불러오는 중...</div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-[48px]">&#x1F4AD;</span>
            <p className="text-warm-gray-light text-sm mt-3">
              아직 저장된 일정이 없어요
            </p>
            <p className="text-warm-gray-light text-xs mt-1">
              소연이와 대화하면서 약속이나 예약을 말씀해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((m) => (
              <div key={m.id} className="bg-warm-white rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-coral font-bold text-sm">{m.date}</span>
                    {m.time && (
                      <span className="text-warm-gray-light text-[12px] bg-coral-pastel px-2 py-0.5 rounded-full">
                        {m.time}
                      </span>
                    )}
                  </div>
                  <p className="text-warm-gray text-[14px] leading-snug">{m.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="shrink-0 w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center
                             hover:bg-red-100 transition-colors"
                  aria-label="삭제"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 bg-coral-pastel rounded-2xl p-4 text-center">
          <p className="text-coral-dark text-[13px] leading-relaxed">
            소연이에게 &ldquo;병원 예약&rdquo;이나 &ldquo;약속&rdquo; 얘기를 하면 자동으로 일정이 저장돼요
          </p>
        </div>
      </div>
    </div>
  );
}
