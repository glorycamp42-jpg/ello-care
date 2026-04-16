"use client";

import { useState, useRef, useEffect } from "react";

/* ── i18n ── */
const I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "고향",
    back: "← 돌아가기",
    radio: "라디오",
    music: "옛날 가요",
    video: "영상",
    nowPlaying: "재생 중",
    stopped: "정지",
    play: "재생",
    stop: "정지",
    loading: "로딩 중...",
    trot: "트로트 명곡",
    pop7080: "7080 가요",
    ballad: "발라드",
    hymn: "찬송가",
    nostalgia: "추억 영상",
    hometown: "고향 풍경",
    exercise: "건강 체조",
  },
  en: {
    title: "Homeland",
    back: "← Back",
    radio: "Radio",
    music: "Old Songs",
    video: "Videos",
    nowPlaying: "Now Playing",
    stopped: "Stopped",
    play: "Play",
    stop: "Stop",
    loading: "Loading...",
    trot: "Trot Classics",
    pop7080: "70s-80s K-Pop",
    ballad: "Ballads",
    hymn: "Hymns",
    nostalgia: "Nostalgic Clips",
    hometown: "Hometown Views",
    exercise: "Health Exercise",
  },
  es: {
    title: "Hogar",
    back: "← Volver",
    radio: "Radio",
    music: "Canciones",
    video: "Videos",
    nowPlaying: "Reproduciendo",
    stopped: "Detenido",
    play: "Reproducir",
    stop: "Detener",
    loading: "Cargando...",
    trot: "Trot Clásico",
    pop7080: "K-Pop 70s-80s",
    ballad: "Baladas",
    hymn: "Himnos",
    nostalgia: "Clips Nostálgicos",
    hometown: "Paisajes del Hogar",
    exercise: "Ejercicio Saludable",
  },
  zh: {
    title: "故乡",
    back: "← 返回",
    radio: "广播",
    music: "老歌",
    video: "视频",
    nowPlaying: "正在播放",
    stopped: "已停止",
    play: "播放",
    stop: "停止",
    loading: "加载中...",
    trot: "Trot经典",
    pop7080: "7080流行",
    ballad: "抒情歌",
    hymn: "赞美诗",
    nostalgia: "怀旧视频",
    hometown: "故乡风景",
    exercise: "健康操",
  },
  vi: {
    title: "Quê hương",
    back: "← Quay lại",
    radio: "Radio",
    music: "Nhạc cũ",
    video: "Video",
    nowPlaying: "Đang phát",
    stopped: "Đã dừng",
    play: "Phát",
    stop: "Dừng",
    loading: "Đang tải...",
    trot: "Trot cổ điển",
    pop7080: "K-Pop 7080",
    ballad: "Ballad",
    hymn: "Thánh ca",
    nostalgia: "Clip hoài niệm",
    hometown: "Phong cảnh quê",
    exercise: "Thể dục sức khỏe",
  },
  ja: {
    title: "故郷",
    back: "← 戻る",
    radio: "ラジオ",
    music: "懐メロ",
    video: "映像",
    nowPlaying: "再生中",
    stopped: "停止",
    play: "再生",
    stop: "停止",
    loading: "読み込み中...",
    trot: "トロット名曲",
    pop7080: "7080歌謡",
    ballad: "バラード",
    hymn: "讃美歌",
    nostalgia: "思い出映像",
    hometown: "故郷の風景",
    exercise: "健康体操",
  },
};

/* ── Radio Stations ── */
interface RadioStation {
  name: string;
  nameKo: string;
  url: string;
  type: "hls" | "audio" | "external";
  externalUrl?: string;
}

const RADIO_STATIONS: RadioStation[] = [
  // KBS
  {
    name: "KBS 1Radio",
    nameKo: "KBS 1라디오",
    url: "https://kong.kbs.co.kr/listener?channel=21&client=codec_ABR&type=HLS",
    type: "hls",
  },
  {
    name: "KBS Classic FM",
    nameKo: "KBS 클래식FM",
    url: "https://kong.kbs.co.kr/listener?channel=24&client=codec_ABR&type=HLS",
    type: "hls",
  },
  {
    name: "KBS Cool FM",
    nameKo: "KBS 쿨FM",
    url: "https://kong.kbs.co.kr/listener?channel=22&client=codec_ABR&type=HLS",
    type: "hls",
  },
  {
    name: "KBS Happy FM",
    nameKo: "KBS 해피FM",
    url: "https://kong.kbs.co.kr/listener?channel=23&client=codec_ABR&type=HLS",
    type: "hls",
  },
  // MBC
  {
    name: "MBC Standard FM",
    nameKo: "MBC 표준FM",
    url: "https://sminiplay.imbc.com/aacplay.ashx?agent=webapp&channel=sfm",
    type: "audio",
  },
  {
    name: "MBC FM4U",
    nameKo: "MBC FM4U",
    url: "https://sminiplay.imbc.com/aacplay.ashx?agent=webapp&channel=mfm",
    type: "audio",
  },
  // SBS
  {
    name: "SBS Love FM",
    nameKo: "SBS 러브FM",
    url: "https://apis.sbs.co.kr/play-api/1.0/livestream/lovefm/lovefm?protocol=hls&ssl=Y",
    type: "hls",
  },
  {
    name: "SBS Power FM",
    nameKo: "SBS 파워FM",
    url: "https://apis.sbs.co.kr/play-api/1.0/livestream/powerfm/powerfm?protocol=hls&ssl=Y",
    type: "hls",
  },
  // CBS
  {
    name: "CBS Standard FM",
    nameKo: "CBS 표준FM",
    url: "https://aac.cbs.co.kr/cbs939/cbs939.stream/playlist.m3u8",
    type: "hls",
  },
  {
    name: "CBS Music FM",
    nameKo: "CBS 음악FM",
    url: "https://aac.cbs.co.kr/mfm981/mfm981.stream/playlist.m3u8",
    type: "hls",
  },
  // US Korean Radio
  {
    name: "Radio Korea",
    nameKo: "라디오 코리아 AM1540",
    url: "",
    type: "external",
    externalUrl: "https://www.radiokorea.com",
  },
];

/* ── YouTube Playlists ── */
interface YouTubeItem {
  title: string;
  videoId: string;
}

interface MusicCategory {
  id: string;
  items: YouTubeItem[];
}

const MUSIC_DATA: MusicCategory[] = [
  {
    id: "trot",
    items: [
      { title: "나훈아 - 테스형", videoId: "FrdUFJLfEIA" },
      { title: "나훈아 - 잡초", videoId: "vhd5gUoRE_w" },
      { title: "이미자 - 동백아가씨", videoId: "2P4Q7LkqxcY" },
      { title: "패티김 - 사랑하는 마리아", videoId: "7_6G6PuNE9I" },
      { title: "남진 - 님과 함께", videoId: "dKkRnUxjNXs" },
      { title: "송대관 - 네 박자", videoId: "UqKo3J-CSWY" },
      { title: "태진아 - 사랑은 아무나 하나", videoId: "kDNmCjiLMfE" },
      { title: "주현미 - 짝사랑", videoId: "gThm9mFnN-Q" },
      { title: "설운도 - 보릿고개", videoId: "RK5OM6WLlNk" },
      { title: "진성 - 안동역에서", videoId: "Z3-KZ3d-Xhc" },
    ],
  },
  {
    id: "pop7080",
    items: [
      { title: "이문세 - 소녀", videoId: "7-BZhQIcEOA" },
      { title: "이문세 - 광화문 연가", videoId: "qeNqfJ5YXOA" },
      { title: "조용필 - 킬리만자로의 표범", videoId: "9KiSO4OXxPk" },
      { title: "조용필 - 바운스", videoId: "fT_sZOkBviM" },
      { title: "이선희 - 알고 싶어요", videoId: "lHBxkmHEnDI" },
      { title: "변진섭 - 너에게로 또 다시", videoId: "CZcPxo8-rsk" },
      { title: "신승훈 - 보이지 않는 사랑", videoId: "P3lJdFfGZE8" },
      { title: "김광석 - 서른 즈음에", videoId: "mmPb0k5GFBU" },
      { title: "들국화 - 그것만이 내 세상", videoId: "UO-2PDGQ8vE" },
      { title: "산울림 - 아니 벌써", videoId: "FndKtbVOMSc" },
    ],
  },
  {
    id: "ballad",
    items: [
      { title: "이소라 - 바람이 분다", videoId: "uCEaIMKcD6E" },
      { title: "김동률 - 감사", videoId: "6pOxYFNsl7s" },
      { title: "박효신 - 숨", videoId: "U-8DGBbf48g" },
      { title: "성시경 - 거리에서", videoId: "wSAqH7a3mOk" },
      { title: "이적 - 하늘을 달리다", videoId: "IN2mml1mYkI" },
      { title: "김범수 - 보고싶다", videoId: "bYGCjFBvPR0" },
      { title: "임재범 - 고해", videoId: "W_kOGC5eMjk" },
      { title: "양희은 - 아침이슬", videoId: "x9Mk-w4dcHQ" },
      { title: "유재하 - 사랑하기 때문에", videoId: "OdKMZeah-Qs" },
      { title: "정수라 - 환희", videoId: "dF2_RCZP7Mo" },
    ],
  },
  {
    id: "hymn",
    items: [
      { title: "찬송가 - 주 하나님 지으신 모든 세계", videoId: "e0IKaYfNzaA" },
      { title: "찬송가 - 나 같은 죄인 살리신", videoId: "CDdvReNKKuk" },
      { title: "찬송가 - 예수 사랑하심은", videoId: "GBUA2AaCj1E" },
      { title: "찬송가 - 이 세상 험하고", videoId: "2d-Mn8KjKmo" },
      { title: "찬송가 - 내 주를 가까이 하게 함은", videoId: "dDo6QGah4dc" },
      { title: "찬송가 - 저 높은 곳을 향하여", videoId: "3gVUyIp60iU" },
    ],
  },
];

/* ── Video Playlists ── */
interface VideoCategory {
  id: string;
  items: YouTubeItem[];
}

const VIDEO_DATA: VideoCategory[] = [
  {
    id: "nostalgia",
    items: [
      { title: "1980년대 서울 거리 풍경", videoId: "1bBYGp2j9RI" },
      { title: "추억의 TV 광고 모음", videoId: "1d4RKhZ8XSM" },
      { title: "옛날 시장 구경", videoId: "2XYAK05SdKU" },
    ],
  },
  {
    id: "hometown",
    items: [
      { title: "한국의 아름다운 사계절", videoId: "3M3UmLMccxU" },
      { title: "시골 풍경 힐링 영상", videoId: "r4B67mhOiHk" },
      { title: "전통시장 이모저모", videoId: "VdpwSKpRJsg" },
    ],
  },
  {
    id: "exercise",
    items: [
      { title: "어르신 아침 체조", videoId: "L_A_HjHZxfI" },
      { title: "치매 예방 손가락 운동", videoId: "kFfQ3Cdrbx4" },
      { title: "앉아서 하는 스트레칭", videoId: "Ev6yE55kYGw" },
    ],
  },
];

/* ── Component ── */
interface HomelandPageProps {
  onClose: () => void;
  langCode?: string;
}

export default function HomelandPage({ onClose, langCode = "ko" }: HomelandPageProps) {
  const t = I18N[langCode] || I18N.ko;
  const [tab, setTab] = useState<"radio" | "music" | "video">("radio");
  const [playingRadio, setPlayingRadio] = useState<string | null>(null);
  const [musicCat, setMusicCat] = useState("trot");
  const [videoCat, setVideoCat] = useState("nostalgia");
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [radioLoading, setRadioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  /* ── Radio playback ── */
  async function playRadio(station: RadioStation) {
    // External links open in new tab
    if (station.type === "external" && station.externalUrl) {
      window.open(station.externalUrl, "_blank");
      return;
    }

    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    // If already playing this station, stop
    if (playingRadio === station.nameKo) {
      setPlayingRadio(null);
      return;
    }

    setRadioLoading(true);

    try {
      let streamUrl = station.url;

      // SBS returns plain text URL
      if (station.url.includes("apis.sbs.co.kr")) {
        const res = await fetch(station.url);
        streamUrl = (await res.text()).trim();
      }

      const audio = new Audio();
      audio.src = streamUrl;
      audio.crossOrigin = "anonymous";
      await audio.play();
      audioRef.current = audio;
      setPlayingRadio(station.nameKo);

      audio.onerror = () => {
        setPlayingRadio(null);
        setRadioLoading(false);
      };
    } catch {
      // Try HLS fallback
      setPlayingRadio(null);
    }
    setRadioLoading(false);
  }

  function stopRadio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlayingRadio(null);
  }

  /* ── Tab button style ── */
  const tabBtn = (id: string, active: boolean) =>
    `flex-1 py-3 text-center text-[16px] font-bold rounded-xl transition-all ${
      active
        ? "bg-coral text-white shadow-md"
        : "bg-warm-white text-warm-gray hover:bg-coral-pastel"
    }`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-warm-white border-b border-warm-gray-light/15 px-4 pt-12 pb-3 flex items-center justify-between">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium">
          {t.back}
        </button>
        <h1 className="text-lg font-bold text-warm-gray">{t.title}</h1>
        <div className="w-16" />
      </header>

      {/* Sub-tabs: 라디오 / 옛날 가요 / 영상 */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        <button className={tabBtn("radio", tab === "radio")} onClick={() => setTab("radio")}>
          📻 {t.radio}
        </button>
        <button className={tabBtn("music", tab === "music")} onClick={() => setTab("music")}>
          🎵 {t.music}
        </button>
        <button className={tabBtn("video", tab === "video")} onClick={() => setTab("video")}>
          📺 {t.video}
        </button>
      </div>

      {/* Mini player bar */}
      {playingRadio && (
        <div className="mx-4 mb-2 p-3 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">📻</span>
            <div>
              <p className="text-[14px] font-bold text-blue-700">{playingRadio}</p>
              <p className="text-[11px] text-blue-500">{t.nowPlaying}</p>
            </div>
          </div>
          <button
            onClick={stopRadio}
            className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 active:scale-95"
          >
            ⏹
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* ── RADIO TAB ── */}
        {tab === "radio" && (
          <div className="space-y-3">
            {RADIO_STATIONS.map((station) => (
              <button
                key={station.nameKo}
                onClick={() => playRadio(station)}
                disabled={radioLoading}
                className={`w-full p-4 rounded-2xl text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                  playingRadio === station.nameKo
                    ? "bg-blue-100 border-2 border-blue-400 shadow-md"
                    : "bg-warm-white border border-warm-gray-light/15 hover:border-coral/30"
                }`}
              >
                <div>
                  <p className="text-[16px] font-bold text-warm-gray">{station.nameKo}</p>
                  <p className="text-[13px] text-warm-gray-light">{station.name}</p>
                </div>
                <span className="text-2xl">
                  {station.type === "external"
                    ? "🔗"
                    : playingRadio === station.nameKo
                    ? "🔊"
                    : "▶️"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── MUSIC TAB ── */}
        {tab === "music" && (
          <div>
            {/* Category pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["trot", "pop7080", "ballad", "hymn"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setMusicCat(cat);
                    setCurrentVideo(null);
                  }}
                  className={`px-4 py-2 rounded-full text-[14px] font-bold whitespace-nowrap transition-all ${
                    musicCat === cat
                      ? "bg-coral text-white shadow-md"
                      : "bg-warm-white text-warm-gray border border-warm-gray-light/15"
                  }`}
                >
                  {t[cat]}
                </button>
              ))}
            </div>

            {/* YouTube player */}
            {currentVideo && (
              <div className="mb-4 rounded-2xl overflow-hidden shadow-lg bg-black">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1&rel=0`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Music Player"
                  />
                </div>
              </div>
            )}

            {/* Song list */}
            <div className="space-y-2">
              {MUSIC_DATA.find((c) => c.id === musicCat)?.items.map((item) => (
                <button
                  key={item.videoId}
                  onClick={() => {
                    setCurrentVideo(item.videoId);
                    // Stop radio if playing
                    if (playingRadio) stopRadio();
                  }}
                  className={`w-full p-4 rounded-2xl text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                    currentVideo === item.videoId
                      ? "bg-coral-pastel border-2 border-coral shadow-md"
                      : "bg-warm-white border border-warm-gray-light/15 hover:border-coral/30"
                  }`}
                >
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="text-xl ml-2">
                    {currentVideo === item.videoId ? "🎵" : "▶️"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── VIDEO TAB ── */}
        {tab === "video" && (
          <div>
            {/* Category pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["nostalgia", "hometown", "exercise"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setVideoCat(cat);
                    setCurrentVideo(null);
                  }}
                  className={`px-4 py-2 rounded-full text-[14px] font-bold whitespace-nowrap transition-all ${
                    videoCat === cat
                      ? "bg-coral text-white shadow-md"
                      : "bg-warm-white text-warm-gray border border-warm-gray-light/15"
                  }`}
                >
                  {t[cat]}
                </button>
              ))}
            </div>

            {/* YouTube player */}
            {currentVideo && (
              <div className="mb-4 rounded-2xl overflow-hidden shadow-lg bg-black">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1&rel=0`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title="Video Player"
                  />
                </div>
              </div>
            )}

            {/* Video list */}
            <div className="space-y-2">
              {VIDEO_DATA.find((c) => c.id === videoCat)?.items.map((item) => (
                <button
                  key={item.videoId}
                  onClick={() => {
                    setCurrentVideo(item.videoId);
                    if (playingRadio) stopRadio();
                  }}
                  className={`w-full p-4 rounded-2xl text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                    currentVideo === item.videoId
                      ? "bg-coral-pastel border-2 border-coral shadow-md"
                      : "bg-warm-white border border-warm-gray-light/15 hover:border-coral/30"
                  }`}
                >
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="text-xl ml-2">
                    {currentVideo === item.videoId ? "📺" : "▶️"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
