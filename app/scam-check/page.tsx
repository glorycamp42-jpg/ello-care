"use client";

import { useState, useRef } from "react";

interface Result {
  verdict: "danger" | "caution" | "safe";
  title: string;
  explanation: string;
  advice: string;
}

export default function ScamCheck() {
  const [preview, setPreview] = useState<string>("");
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function speak(r: Result) {
    try {
      window.speechSynthesis?.cancel();
      const intro =
        r.verdict === "danger" ? "위험해요! " : r.verdict === "caution" ? "조심하세요. " : "안심하세요. ";
      const u = new SpeechSynthesisUtterance(`${intro}${r.title}. ${r.explanation} ${r.advice}`);
      u.lang = "ko-KR";
      u.rate = 0.9;
      window.speechSynthesis?.speak(u);
    } catch {}
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setResult(null);
    setError("");

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

  async function handleCheck() {
    if (!imageData) {
      setError("문자 화면을 찍은 사진을 먼저 올려주세요");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mediaType: imageData.mediaType,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      speak(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 문제가 생겼어요");
    } finally {
      setLoading(false);
    }
  }

  const verdictStyle =
    result?.verdict === "danger"
      ? { bg: "bg-red-50 border-red-300", icon: "🚨", color: "text-red-700", label: "위험해요!" }
      : result?.verdict === "caution"
      ? { bg: "bg-amber-50 border-amber-300", icon: "⚠️", color: "text-amber-700", label: "조심하세요" }
      : { bg: "bg-green-50 border-green-300", icon: "✅", color: "text-green-700", label: "안심하세요" };

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
          🛡️ 사기 문자 확인
        </h1>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg w-full mx-auto">
        <p className="text-[15px] text-warm-gray-light text-center mb-5 leading-relaxed">
          의심스러운 문자나 카톡 화면을 찍어서 올려주세요.
          <br />
          사기인지 아닌지 알려드려요.
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
            <div className="text-6xl mb-3">📱</div>
            <p className="text-[20px] font-bold text-warm-gray">문자 사진 올리기</p>
            <p className="text-[14px] text-warm-gray-light mt-1">눌러서 사진 선택</p>
          </button>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="문자 화면" className="w-full max-h-72 object-contain bg-gray-50" />
            <div className="p-3 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl text-[15px] font-bold bg-warm-gray-light/15 text-warm-gray"
              >
                다른 사진
              </button>
              {!result && (
                <button
                  onClick={handleCheck}
                  disabled={loading}
                  className={`flex-[2] py-3 rounded-xl text-[17px] font-bold transition ${
                    loading
                      ? "bg-gray-300 text-gray-500"
                      : "bg-coral text-white active:scale-95"
                  }`}
                >
                  {loading ? "🔍 확인하는 중..." : "🔍 사기인지 확인하기"}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-red-500 font-semibold text-[15px]">{error}</p>
        )}

        {result && (
          <div className={`mt-5 rounded-2xl border-2 p-6 text-center ${verdictStyle.bg}`}>
            <div className="text-6xl mb-3">{verdictStyle.icon}</div>
            <p className={`text-[26px] font-bold mb-2 ${verdictStyle.color}`}>{verdictStyle.label}</p>
            <p className="text-[19px] font-bold text-warm-gray mb-3">{result.title}</p>
            <p className="text-[16px] text-warm-gray leading-relaxed mb-4">{result.explanation}</p>
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-[15px] font-bold text-warm-gray">📌 이렇게 하세요</p>
              <p className="text-[16px] text-warm-gray mt-1 leading-relaxed">{result.advice}</p>
            </div>
            <button
              onClick={() => speak(result)}
              className="mt-4 px-6 py-3 rounded-full bg-coral text-white text-[16px] font-bold active:scale-95 transition-transform"
            >
              🔊 다시 듣기
            </button>
          </div>
        )}

        <div className="mt-6 bg-white rounded-2xl p-5">
          <p className="text-[15px] font-bold text-warm-gray mb-2">💡 이런 문자는 조심하세요</p>
          <ul className="text-[14px] text-warm-gray-light space-y-1.5 leading-relaxed">
            <li>• &quot;엄마, 나 폰 고장났어&quot; 하며 다른 번호로 연락</li>
            <li>• 검찰/경찰/은행이라며 돈이나 정보 요구</li>
            <li>• 택배 주소 확인하라며 링크 클릭 유도</li>
            <li>• 환급금/지원금 받으라며 계좌 요구</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
