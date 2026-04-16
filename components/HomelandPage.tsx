"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ── i18n ── */
const I18N: Record<string, Record<string, string>> = {
  ko: { title: "고향", back: "← 돌아가기", radio: "라디오", music: "옛날 가요", video: "영상",
    trot: "트로트", pop7080: "7080", ballad: "발라드", hymn: "찬송가",
    nostalgia: "추억", hometown: "고향풍경", exercise: "건강체조",
    playing: "재생 중", stopped: "정지됨", loading: "로딩 중...", tapToPlay: "터치하면 재생" },
  en: { title: "Homeland", back: "← Back", radio: "Radio", music: "Songs", video: "Videos",
    trot: "Trot", pop7080: "7080", ballad: "Ballad", hymn: "Hymns",
    nostalgia: "Nostalgia", hometown: "Hometown", exercise: "Exercise",
    playing: "Playing", stopped: "Stopped", loading: "Loading...", tapToPlay: "Tap to play" },
  es: { title: "Hogar", back: "← Volver", radio: "Radio", music: "Canciones", video: "Videos",
    trot: "Trot", pop7080: "7080", ballad: "Balada", hymn: "Himnos",
    nostalgia: "Nostalgia", hometown: "Paisajes", exercise: "Ejercicio",
    playing: "Reproduciendo", stopped: "Detenido", loading: "Cargando...", tapToPlay: "Toca para reproducir" },
  zh: { title: "故乡", back: "← 返回", radio: "广播", music: "老歌", video: "视频",
    trot: "Trot", pop7080: "7080", ballad: "抒情", hymn: "赞美诗",
    nostalgia: "怀旧", hometown: "故乡", exercise: "健康操",
    playing: "播放中", stopped: "已停止", loading: "加载中...", tapToPlay: "点击播放" },
  vi: { title: "Quê hương", back: "← Quay lại", radio: "Radio", music: "Nhạc cũ", video: "Video",
    trot: "Trot", pop7080: "7080", ballad: "Ballad", hymn: "Thánh ca",
    nostalgia: "Hoài niệm", hometown: "Quê hương", exercise: "Thể dục",
    playing: "Đang phát", stopped: "Đã dừng", loading: "Đang tải...", tapToPlay: "Nhấn để phát" },
  ja: { title: "故郷", back: "← 戻る", radio: "ラジオ", music: "懐メロ", video: "映像",
    trot: "トロット", pop7080: "7080", ballad: "バラード", hymn: "讃美歌",
    nostalgia: "思い出", hometown: "故郷", exercise: "体操",
    playing: "再生中", stopped: "停止", loading: "読み込み中...", tapToPlay: "タップして再生" },
};

/* ── Radio stations (using our proxy) ── */
interface RadioStation {
  id: string;
  nameKo: string;
  emoji: string;
}
const RADIO_STATIONS: RadioStation[] = [
  { id: "kbs1", nameKo: "KBS 1라디오", emoji: "📻" },
  { id: "kbsclassic", nameKo: "KBS 클래식FM", emoji: "🎻" },
  { id: "kbscool", nameKo: "KBS 쿨FM", emoji: "😎" },
  { id: "kbshappy", nameKo: "KBS 해피FM", emoji: "😊" },
  { id: "mbcsfm", nameKo: "MBC 표준FM", emoji: "📻" },
  { id: "mbcfm4u", nameKo: "MBC FM4U", emoji: "🎵" },
  { id: "sbslove", nameKo: "SBS 러브FM", emoji: "❤️" },
  { id: "sbspower", nameKo: "SBS 파워FM", emoji: "⚡" },
  { id: "cbsfm", nameKo: "CBS 표준FM", emoji: "✝️" },
  { id: "cbsmusic", nameKo: "CBS 음악FM", emoji: "🎶" },
];

/* ── Music / Video items ── */
interface MediaItem { title: string; query: string; }
interface MediaCategory { id: string; items: MediaItem[]; }

const MUSIC_DATA: MediaCategory[] = [
  { id: "trot", items: [
    { title: "나훈아 - 테스형", query: "나훈아 테스형 공식" },
    { title: "나훈아 - 잡초", query: "나훈아 잡초 공식" },
    { title: "이미자 - 동백아가씨", query: "이미자 동백아가씨" },
    { title: "패티김 - 사랑하는 마리아", query: "패티김 사랑하는 마리아" },
    { title: "남진 - 님과 함께", query: "남진 님과 함께" },
    { title: "송대관 - 네 박자", query: "송대관 네박자" },
    { title: "태진아 - 사랑은 아무나 하나", query: "태진아 사랑은 아무나 하나" },
    { title: "주현미 - 짝사랑", query: "주현미 짝사랑" },
    { title: "트로트 명곡 메들리 1시간", query: "트로트 명곡 모음 메들리 1시간" },
  ]},
  { id: "pop7080", items: [
    { title: "이문세 - 소녀", query: "이문세 소녀" },
    { title: "이문세 - 광화문 연가", query: "이문세 광화문연가" },
    { title: "조용필 - 킬리만자로의 표범", query: "조용필 킬리만자로의 표범" },
    { title: "이선희 - 알고 싶어요", query: "이선희 알고싶어요" },
    { title: "변진섭 - 너에게로 또 다시", query: "변진섭 너에게로 또다시" },
    { title: "김광석 - 서른 즈음에", query: "김광석 서른즈음에" },
    { title: "7080 가요 메들리 1시간", query: "7080 추억의 가요 모음 1시간" },
  ]},
  { id: "ballad", items: [
    { title: "이소라 - 바람이 분다", query: "이소라 바람이 분다" },
    { title: "박효신 - 숨", query: "박효신 숨" },
    { title: "성시경 - 거리에서", query: "성시경 거리에서" },
    { title: "양희은 - 아침이슬", query: "양희은 아침이슬" },
    { title: "발라드 명곡 메들리 1시간", query: "한국 발라드 명곡 모음 1시간" },
  ]},
  { id: "hymn", items: [
    { title: "주 하나님 지으신 모든 세계", query: "찬송가 주 하나님 지으신 모든 세계" },
    { title: "나 같은 죄인 살리신", query: "찬송가 나같은 죄인 살리신" },
    { title: "예수 사랑하심은", query: "찬송가 예수 사랑하심은" },
    { title: "찬송가 연속 듣기 1시간", query: "찬송가 모음 연속듣기 1시간" },
  ]},
];

const VIDEO_DATA: MediaCategory[] = [
  { id: "nostalgia", items: [
    { title: "1980년대 서울 거리", query: "1980년대 서울 거리 풍경 옛날" },
    { title: "추억의 TV 광고", query: "추억의 옛날 TV 광고 모음 80년대" },
    { title: "추억의 TV 프로그램", query: "추억의 TV 프로그램 80년대 90년대" },
  ]},
  { id: "hometown", items: [
    { title: "한국의 사계절", query: "한국 아름다운 사계절 풍경 4K" },
    { title: "시골 풍경 힐링", query: "한국 시골 풍경 힐링 자연소리" },
    { title: "전통시장 구경", query: "한국 전통시장 맛집 투어" },
  ]},
  { id: "exercise", items: [
    { title: "어르신 아침 체조", query: "어르신 아침 체조 따라하기" },
    { title: "치매 예방 손가락 운동", query: "치매예방 손가락 운동 따라하기" },
    { title: "국민체조", query: "국민체조 따라하기" },
  ]},
];

/* ── Component ── */
interface HomelandPageProps {
  onClose: () => void;
  langCode?: string;
}

export default function HomelandPage({ onClose, langCode = "ko" }: HomelandPageProps) {
  const t = I18N[langCode] || I18N.ko;
  const [tab, setTab] = useState<"radio" | "music" | "video">("radio");
  const [musicCat, setMusicCat] = useState("trot");
  const [videoCat, setVideoCat] = useState("nostalgia");

  // Radio state
  const [playingRadio, setPlayingRadio] = useState<string | null>(null);
  const [radioLoading, setRadioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  // YouTube state
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      if (hlsRef.current) { hlsRef.current.destroy(); }
    };
  }, []);

  /* ── Radio playback via proxy ── */
  const playRadio = useCallback(async (stationId: string) => {
    // Stop current
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    // Toggle off
    if (playingRadio === stationId) { setPlayingRadio(null); return; }

    setRadioLoading(true);
    setPlayingRadio(stationId);

    try {
      const proxyUrl = `/api/radio-proxy?station=${stationId}`;

      // Check if it's MBC (returns JSON with streamUrl)
      if (stationId.startsWith("mbc")) {
        const res = await fetch(proxyUrl);
        const data = await res.json();
        if (data.streamUrl) {
          const audio = new Audio(data.streamUrl);
          audio.onerror = () => setPlayingRadio(null);
          await audio.play();
          audioRef.current = audio;
        }
      } else {
        // HLS stream - try native first, then hls.js
        const audio = document.createElement("audio");

        if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari/iOS native HLS support
          audio.src = proxyUrl;
          await audio.play();
          audioRef.current = audio;
        } else {
          // Use hls.js for other browsers
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: false,
              lowLatencyMode: true,
            });
            hls.loadSource(proxyUrl);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, async () => {
              try { await audio.play(); } catch { setPlayingRadio(null); }
            });
            hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean }) => {
              if (data.fatal) { setPlayingRadio(null); hls.destroy(); }
            });
            audioRef.current = audio;
            hlsRef.current = hls;
          }
        }
      }
    } catch {
      setPlayingRadio(null);
    }
    setRadioLoading(false);
  }, [playingRadio]);

  const stopRadio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setPlayingRadio(null);
  }, []);

  /* ── YouTube: search and play in-app ── */
  const playYouTube = useCallback(async (query: string) => {
    setVideoLoading(true);
    setCurrentVideoId(null);
    // Stop radio if playing
    if (playingRadio) stopRadio();

    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.videoId) {
        setCurrentVideoId(data.videoId);
      }
    } catch { /* ignore */ }
    setVideoLoading(false);
  }, [playingRadio, stopRadio]);

  /* ── Styles ── */
  const tabBtn = (active: boolean) =>
    `flex-1 py-3 text-center text-[15px] font-bold rounded-xl transition-all ${
      active ? "bg-coral text-white shadow-md" : "bg-warm-white text-warm-gray hover:bg-coral-pastel"
    }`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-warm-white border-b border-warm-gray-light/15 px-4 pt-12 pb-3 flex items-center justify-between">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium">{t.back}</button>
        <h1 className="text-lg font-bold text-warm-gray">{t.title}</h1>
        <div className="w-16" />
      </header>

      {/* Sub-tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <button className={tabBtn(tab === "radio")} onClick={() => setTab("radio")}>📻 {t.radio}</button>
        <button className={tabBtn(tab === "music")} onClick={() => setTab("music")}>🎵 {t.music}</button>
        <button className={tabBtn(tab === "video")} onClick={() => setTab("video")}>📺 {t.video}</button>
      </div>

      {/* Mini player bar for radio */}
      {playingRadio && (
        <div className="mx-4 mb-2 p-3 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-200 animate-pulse-slow">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📻</span>
            <div>
              <p className="text-[14px] font-bold text-blue-700">
                {RADIO_STATIONS.find(s => s.id === playingRadio)?.nameKo}
              </p>
              <p className="text-[11px] text-blue-500">{t.playing}</p>
            </div>
          </div>
          <button onClick={stopRadio}
            className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl active:scale-95">
            ⏹
          </button>
        </div>
      )}

      {/* YouTube player (shows when video is loaded) */}
      {currentVideoId && (tab === "music" || tab === "video") && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden shadow-lg bg-black">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&playsinline=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="Player"
            />
          </div>
        </div>
      )}

      {videoLoading && (
        <div className="mx-4 mb-3 p-6 bg-warm-white rounded-2xl text-center">
          <p className="text-warm-gray text-[15px] animate-pulse">{t.loading}</p>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">

        {/* ── RADIO TAB ── */}
        {tab === "radio" && (
          <div className="space-y-3 pt-1">
            {RADIO_STATIONS.map((station) => (
              <button
                key={station.id}
                onClick={() => playRadio(station.id)}
                disabled={radioLoading}
                className={`w-full p-4 rounded-2xl text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                  playingRadio === station.id
                    ? "bg-blue-100 border-2 border-blue-400 shadow-md"
                    : "bg-warm-white border border-warm-gray-light/15"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{station.emoji}</span>
                  <p className="text-[16px] font-bold text-warm-gray">{station.nameKo}</p>
                </div>
                <span className="text-2xl">
                  {playingRadio === station.id ? "🔊" : "▶️"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── MUSIC TAB ── */}
        {tab === "music" && (
          <div>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {(["trot", "pop7080", "ballad", "hymn"] as const).map((cat) => (
                <button key={cat} onClick={() => { setMusicCat(cat); setCurrentVideoId(null); }}
                  className={`px-4 py-2 rounded-full text-[14px] font-bold whitespace-nowrap ${
                    musicCat === cat ? "bg-coral text-white shadow-md" : "bg-warm-white text-warm-gray border border-warm-gray-light/15"
                  }`}>
                  {t[cat]}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {MUSIC_DATA.find(c => c.id === musicCat)?.items.map((item) => (
                <button key={item.query} onClick={() => playYouTube(item.query)}
                  className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 active:scale-[0.98] transition-all">
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="text-xl ml-2">▶️</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── VIDEO TAB ── */}
        {tab === "video" && (
          <div>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {(["nostalgia", "hometown", "exercise"] as const).map((cat) => (
                <button key={cat} onClick={() => { setVideoCat(cat); setCurrentVideoId(null); }}
                  className={`px-4 py-2 rounded-full text-[14px] font-bold whitespace-nowrap ${
                    videoCat === cat ? "bg-coral text-white shadow-md" : "bg-warm-white text-warm-gray border border-warm-gray-light/15"
                  }`}>
                  {t[cat]}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {VIDEO_DATA.find(c => c.id === videoCat)?.items.map((item) => (
                <button key={item.query} onClick={() => playYouTube(item.query)}
                  className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 active:scale-[0.98] transition-all">
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="text-xl ml-2">▶️</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
