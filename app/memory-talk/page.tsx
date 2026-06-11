"use client";

import { useState, useRef } from "react";

export default function MemoryTalk() {
  const [preview, setPreview] = useState<string>("");
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function speak(text: string) {
    try {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = 0.88;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis?.speak(u);
    } catch {}
  }

  function stopSpeak() {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    setSpeaking(false);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setStory("");
    setError("");
    stopSpeak();

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setImageData({
        base64: dataUrl.split(",")[1],
        mediaType: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleTalk() {
    if (!imageData) {
      setError("추억이 담긴 사진을 먼저 올려주세요");
      return;
    }
    setLoading(true);
    setError("");
    setStory("");
    try {
      const res = await fetch("/api/memory-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType: imageData.mediaType,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStory(data.text);
      speak(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문제가 생겼어요. 다시 해보세요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white border-b border-warm-gray-light/15 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => (window.location.href = "/")}
          className="flex items-center gap-1.5 text-coral font-bold text-[16px] active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          돌아가기
        </button>
        <h1 className="text-[20px] font-bold text-warm-gray flex-1 text-center pr-16">
          📷 추억 이야기
        </h1>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg w-full mx-auto">
        <p className="text-[15px] text-warm-gray-light text-center mb-5 leading-relaxed">
          옛날 사진을 올려주시면
          <br />
          함께 추억 이야기를 나눠드려요.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-4 border-dashed border-coral/30 rounded-2xl p-12 bg-white active:scale-[0.99] transition-transform"
          >
            <div className="text-6xl mb-3">🖼️</div>
            <p className="text-[20px] font-bold text-warm-gray">옛날 사진 올리기</p>
            <p className="text-[14px] text-warm-gray-light mt-1">눌러서 사진 선택</p>
          </button>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="추억 사진" className="w-full max-h-80 object-contain bg-gray-50" />
            <div className="p-3 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl text-[15px] font-bold bg-warm-gray-light/15 text-warm-gray"
              >
                다른 사진
              </button>
              {!story && (
                <button
                  onClick={handleTalk}
                  disabled={loading}
                  className={`flex-[2] py-3 rounded-xl text-[17px] font-bold transition ${
                    loading ? "bg-gray-300 text-gray-500" : "bg-coral text-white active:scale-95"
                  }`}
                >
                  {loading ? "💭 사진 보는 중..." : "💬 이야기 나누기"}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-red-500 font-semibold text-[15px]">{error}</p>
        )}

        {story && (
          <div className="mt-5 bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[18px] text-warm-gray leading-relaxed whitespace-pre-line">{story}</p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => (speaking ? stopSpeak() : speak(story))}
                className="flex-1 py-3.5 rounded-xl bg-coral text-white text-[16px] font-bold active:scale-95 transition-transform"
              >
                {speaking ? "⏹ 멈추기" : "🔊 다시 듣기"}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 py-3.5 rounded-xl bg-coral/10 text-coral text-[16px] font-bold active:scale-95 transition-transform"
              >
                💬 소연이와 더 얘기하기
              </button>
            </div>
            <p className="text-[13px] text-warm-gray-light text-center mt-3">
              질문에 대한 답을 소연이에게 말씀해주시면 더 깊은 이야기를 나눌 수 있어요
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
