'use client';
import { useState, useRef, useEffect } from 'react';

export default function ProgramAd() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [script, setScript] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const lines = script
    ? script.split(/(?<=[.!?。!?])\s+|\n+/).filter((l) => l.trim().length > 0)
    : [];

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScript('');
    setAudioUrl('');
    setPlaying(false);
    setCurrentLine(0);
    setError('');

    // 5MB 초과 시 자동 리사이즈 (Anthropic Vision 한도 우회)
    const processed = file.size > 4 * 1024 * 1024 ? await resizeImage(file) : file;
    setImage(processed);
    const reader = new FileReader();
    reader.onload = (evt) => setPreview(evt.target?.result as string);
    reader.readAsDataURL(processed);
  };

  const resizeImage = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(file);
            resolve(
              new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                type: 'image/jpeg',
              })
            );
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = url;
    });

  const handleGenerate = async () => {
    if (!image) {
      setError('이미지를 먼저 선택해주세요');
      return;
    }
    setLoading(true);
    setError('');
    setScript('');
    setAudioUrl('');
    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.readAsDataURL(image);
      });

      const r1 = await fetch('/api/explain-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: image.type || 'image/jpeg',
        }),
      });
      if (!r1.ok) {
        const e = await r1.json().catch(() => ({ error: '이미지 분석 실패' }));
        throw new Error(e.error || '이미지 분석 실패');
      }
      const { script: text } = await r1.json();
      setScript(text);

      try {
        const r2 = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (r2.ok) {
          const blob = await r2.blob();
          setAudioUrl(URL.createObjectURL(blob));
        }
      } catch {
        // 음성 실패 시 자막만으로도 동작
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!playing || lines.length === 0) return;
    const audio = audioRef.current;
    const totalMs = audio?.duration && !isNaN(audio.duration)
      ? audio.duration * 1000
      : lines.length * 3500;
    const perLine = totalMs / lines.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentLine(i), i * perLine));
    });
    timers.push(
      setTimeout(() => {
        setPlaying(false);
        setCurrentLine(0);
      }, totalMs + 200)
    );
    return () => timers.forEach(clearTimeout);
  }, [playing, lines.length]);

  const handlePlay = () => {
    if (!script) return;
    setCurrentLine(0);
    setPlaying(true);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(script);
      u.lang = 'ko-KR';
      u.rate = 0.95;
      u.onend = () => setPlaying(false);
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">
            프로그램 한눈에 보기
          </h1>
          <p className="text-amber-700">
            이미지만 올리면 광고처럼 설명해드려요
          </p>
        </div>

        {!preview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-4 border-dashed border-amber-300 rounded-2xl p-12 hover:bg-amber-50 transition bg-white"
          >
            <div className="text-6xl mb-3">📷</div>
            <p className="text-xl font-semibold text-amber-900">
              이미지 선택하기
            </p>
            <p className="text-amber-700 mt-1">탭하여 스크린샷 업로드</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </button>
        )}

        {preview && (
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="program"
              className={`w-full h-full object-cover ${
                playing ? 'animate-kenburns' : ''
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {playing && lines[currentLine] && (
              <div className="absolute bottom-8 left-6 right-6 text-center">
                <p
                  key={currentLine}
                  className="text-white text-2xl md:text-3xl font-bold drop-shadow-lg animate-fadeup leading-snug"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  {lines[currentLine]}
                </p>
              </div>
            )}

            {playing && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{
                    width: `${((currentLine + 1) / lines.length) * 100}%`,
                  }}
                />
              </div>
            )}

            {!playing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3 right-3 bg-white/80 hover:bg-white text-amber-900 px-3 py-1.5 rounded-full text-sm font-semibold"
              >
                다른 이미지
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        )}

        {preview && (
          <div className="mt-6 flex gap-3">
            {!script && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`flex-1 py-4 rounded-xl text-lg font-bold transition shadow-lg ${
                  loading
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                }`}
              >
                {loading ? '✨ 광고 만드는 중...' : '✨ 설명 만들기'}
              </button>
            )}
            {script && !playing && (
              <button
                onClick={handlePlay}
                className="flex-1 py-4 rounded-xl text-lg font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition shadow-lg"
              >
                ▶ 재생하기
              </button>
            )}
            {playing && (
              <button
                onClick={() => {
                  setPlaying(false);
                  audioRef.current?.pause();
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window)
                    window.speechSynthesis.cancel();
                }}
                className="flex-1 py-4 rounded-xl text-lg font-bol