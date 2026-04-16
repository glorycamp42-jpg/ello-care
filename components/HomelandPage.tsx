"use client";

import { useState } from "react";

/* ── i18n ── */
const I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "고향",
    back: "← 돌아가기",
    radio: "라디오",
    music: "옛날 가요",
    video: "영상",
    trot: "트로트 명곡",
    pop7080: "7080 가요",
    ballad: "발라드",
    hymn: "찬송가",
    nostalgia: "추억 영상",
    hometown: "고향 풍경",
    exercise: "건강 체조",
    openPlayer: "듣기",
    watchOn: "보기",
  },
  en: {
    title: "Homeland",
    back: "← Back",
    radio: "Radio",
    music: "Old Songs",
    video: "Videos",
    trot: "Trot Classics",
    pop7080: "70s-80s K-Pop",
    ballad: "Ballads",
    hymn: "Hymns",
    nostalgia: "Nostalgic Clips",
    hometown: "Hometown Views",
    exercise: "Health Exercise",
    openPlayer: "Listen",
    watchOn: "Watch",
  },
  es: {
    title: "Hogar",
    back: "← Volver",
    radio: "Radio",
    music: "Canciones",
    video: "Videos",
    trot: "Trot Clásico",
    pop7080: "K-Pop 70s-80s",
    ballad: "Baladas",
    hymn: "Himnos",
    nostalgia: "Clips Nostálgicos",
    hometown: "Paisajes del Hogar",
    exercise: "Ejercicio",
    openPlayer: "Escuchar",
    watchOn: "Ver",
  },
  zh: {
    title: "故乡",
    back: "← 返回",
    radio: "广播",
    music: "老歌",
    video: "视频",
    trot: "Trot经典",
    pop7080: "7080流行",
    ballad: "抒情歌",
    hymn: "赞美诗",
    nostalgia: "怀旧视频",
    hometown: "故乡风景",
    exercise: "健康操",
    openPlayer: "收听",
    watchOn: "观看",
  },
  vi: {
    title: "Quê hương",
    back: "← Quay lại",
    radio: "Radio",
    music: "Nhạc cũ",
    video: "Video",
    trot: "Trot cổ điển",
    pop7080: "K-Pop 7080",
    ballad: "Ballad",
    hymn: "Thánh ca",
    nostalgia: "Clip hoài niệm",
    hometown: "Phong cảnh quê",
    exercise: "Thể dục",
    openPlayer: "Nghe",
    watchOn: "Xem",
  },
  ja: {
    title: "故郷",
    back: "← 戻る",
    radio: "ラジオ",
    music: "懐メロ",
    video: "映像",
    trot: "トロット名曲",
    pop7080: "7080歌謡",
    ballad: "バラード",
    hymn: "讃美歌",
    nostalgia: "思い出映像",
    hometown: "故郷の風景",
    exercise: "健康体操",
    openPlayer: "聴く",
    watchOn: "見る",
  },
};

/* ── Radio Stations (all open official web players) ── */
interface RadioStation {
  nameKo: string;
  nameEn: string;
  playerUrl: string;
  emoji: string;
}

const RADIO_STATIONS: RadioStation[] = [
  {
    nameKo: "KBS 1라디오",
    nameEn: "KBS 1Radio",
    playerUrl: "https://kong.kbs.co.kr/live/radio?id=21",
    emoji: "📻",
  },
  {
    nameKo: "KBS 클래식FM",
    nameEn: "KBS Classic FM",
    playerUrl: "https://kong.kbs.co.kr/live/radio?id=24",
    emoji: "🎻",
  },
  {
    nameKo: "KBS 쿨FM",
    nameEn: "KBS Cool FM",
    playerUrl: "https://kong.kbs.co.kr/live/radio?id=22",
    emoji: "😎",
  },
  {
    nameKo: "MBC 표준FM",
    nameEn: "MBC Standard FM",
    playerUrl: "https://mini.imbc.com/",
    emoji: "📻",
  },
  {
    nameKo: "MBC FM4U",
    nameEn: "MBC FM4U",
    playerUrl: "https://mini.imbc.com/",
    emoji: "🎵",
  },
  {
    nameKo: "SBS 러브FM",
    nameEn: "SBS Love FM",
    playerUrl: "https://www.sbs.co.kr/radio/lovefm",
    emoji: "❤️",
  },
  {
    nameKo: "SBS 파워FM",
    nameEn: "SBS Power FM",
    playerUrl: "https://www.sbs.co.kr/radio/powerfm",
    emoji: "⚡",
  },
  {
    nameKo: "CBS 표준FM",
    nameEn: "CBS Standard FM",
    playerUrl: "https://www.cbs.co.kr/radio",
    emoji: "✝️",
  },
  {
    nameKo: "CBS 음악FM",
    nameEn: "CBS Music FM",
    playerUrl: "https://www.cbs.co.kr/radio/programList?media=radio001",
    emoji: "🎶",
  },
  {
    nameKo: "라디오 코리아 AM1540",
    nameEn: "Radio Korea AM1540",
    playerUrl: "https://www.radiokorea.com",
    emoji: "🇺🇸",
  },
];

/* ── Music: YouTube search queries (always works, no video ID needed) ── */
interface MusicItem {
  title: string;
  searchQuery: string;
}

interface MusicCategory {
  id: string;
  items: MusicItem[];
}

const MUSIC_DATA: MusicCategory[] = [
  {
    id: "trot",
    items: [
      { title: "나훈아 - 테스형", searchQuery: "나훈아 테스형 공식" },
      { title: "나훈아 - 잡초", searchQuery: "나훈아 잡초" },
      { title: "이미자 - 동백아가씨", searchQuery: "이미자 동백아가씨" },
      { title: "패티김 - 사랑하는 마리아", searchQuery: "패티김 사랑하는 마리아" },
      { title: "남진 - 님과 함께", searchQuery: "남진 님과 함께" },
      { title: "송대관 - 네 박자", searchQuery: "송대관 네박자" },
      { title: "태진아 - 사랑은 아무나 하나", searchQuery: "태진아 사랑은 아무나 하나" },
      { title: "주현미 - 짝사랑", searchQuery: "주현미 짝사랑" },
      { title: "설운도 - 보릿고개", searchQuery: "설운도 보릿고개" },
      { title: "진성 - 안동역에서", searchQuery: "진성 안동역에서" },
      { title: "트로트 명곡 메들리 1시간", searchQuery: "트로트 명곡 모음 메들리 1시간" },
    ],
  },
  {
    id: "pop7080",
    items: [
      { title: "이문세 - 소녀", searchQuery: "이문세 소녀" },
      { title: "이문세 - 광화문 연가", searchQuery: "이문세 광화문연가" },
      { title: "조용필 - 킬리만자로의 표범", searchQuery: "조용필 킬리만자로의 표범" },
      { title: "조용필 - 바운스", searchQuery: "조용필 바운스" },
      { title: "이선희 - 알고 싶어요", searchQuery: "이선희 알고싶어요" },
      { title: "변진섭 - 너에게로 또 다시", searchQuery: "변진섭 너에게로 또다시" },
      { title: "신승훈 - 보이지 않는 사랑", searchQuery: "신승훈 보이지않는 사랑" },
      { title: "김광석 - 서른 즈음에", searchQuery: "김광석 서른즈음에" },
      { title: "들국화 - 그것만이 내 세상", searchQuery: "들국화 그것만이 내세상" },
      { title: "산울림 - 아니 벌써", searchQuery: "산울림 아니벌써" },
      { title: "7080 가요 메들리 1시간", searchQuery: "7080 추억의 가요 모음 1시간" },
    ],
  },
  {
    id: "ballad",
    items: [
      { title: "이소라 - 바람이 분다", searchQuery: "이소라 바람이 분다" },
      { title: "김동률 - 감사", searchQuery: "김동률 감사" },
      { title: "박효신 - 숨", searchQuery: "박효신 숨" },
      { title: "성시경 - 거리에서", searchQuery: "성시경 거리에서" },
      { title: "이적 - 하늘을 달리다", searchQuery: "이적 하늘을 달리다" },
      { title: "양희은 - 아침이슬", searchQuery: "양희은 아침이슬" },
      { title: "유재하 - 사랑하기 때문에", searchQuery: "유재하 사랑하기 때문에" },
      { title: "발라드 명곡 메들리 1시간", searchQuery: "한국 발라드 명곡 모음 1시간" },
    ],
  },
  {
    id: "hymn",
    items: [
      { title: "주 하나님 지으신 모든 세계", searchQuery: "찬송가 주 하나님 지으신 모든 세계" },
      { title: "나 같은 죄인 살리신 (Amazing Grace)", searchQuery: "찬송가 나같은 죄인 살리신" },
      { title: "예수 사랑하심은", searchQuery: "찬송가 예수 사랑하심은" },
      { title: "내 주를 가까이 하게 함은", searchQuery: "찬송가 내주를 가까이 하게 함은" },
      { title: "저 높은 곳을 향하여", searchQuery: "찬송가 저 높은곳을 향하여" },
      { title: "찬송가 연속 듣기 1시간", searchQuery: "찬송가 모음 연속듣기 1시간" },
    ],
  },
];

/* ── Video Categories ── */
const VIDEO_DATA: MusicCategory[] = [
  {
    id: "nostalgia",
    items: [
      { title: "1980년대 서울 거리 풍경", searchQuery: "1980년대 서울 거리 풍경 옛날" },
      { title: "추억의 TV 광고 모음", searchQuery: "추억의 옛날 TV 광고 모음 80년대 90년대" },
      { title: "옛날 시장 구경", searchQuery: "한국 옛날 전통시장 풍경" },
      { title: "추억의 TV 프로그램", searchQuery: "추억의 TV 프로그램 80년대 90년대 모음" },
    ],
  },
  {
    id: "hometown",
    items: [
      { title: "한국의 아름다운 사계절", searchQuery: "한국 아름다운 사계절 풍경 4K" },
      { title: "시골 풍경 힐링 영상", searchQuery: "한국 시골 풍경 힐링 자연 소리" },
      { title: "전통시장 이모저모", searchQuery: "한국 전통시장 맛집 투어" },
      { title: "제주도 풍경", searchQuery: "제주도 아름다운 풍경 4K 힐링" },
    ],
  },
  {
    id: "exercise",
    items: [
      { title: "어르신 아침 체조", searchQuery: "어르신 아침 체조 따라하기" },
      { title: "치매 예방 손가락 운동", searchQuery: "치매예방 손가락 운동 따라하기" },
      { title: "앉아서 하는 스트레칭", searchQuery: "앉아서 하는 스트레칭 어르신" },
      { title: "국민체조", searchQuery: "국민체조 따라하기" },
    ],
  },
];

/* ── Helper: open YouTube search ── */
function openYouTube(query: string) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  window.open(url, "_blank");
}

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

  /* ── Tab button style ── */
  const tabBtn = (active: boolean) =>
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

      {/* Sub-tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        <button className={tabBtn(tab === "radio")} onClick={() => setTab("radio")}>
          📻 {t.radio}
        </button>
        <button className={tabBtn(tab === "music")} onClick={() => setTab("music")}>
          🎵 {t.music}
        </button>
        <button className={tabBtn(tab === "video")} onClick={() => setTab("video")}>
          📺 {t.video}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* ── RADIO TAB ── */}
        {tab === "radio" && (
          <div className="space-y-3 pt-2">
            {RADIO_STATIONS.map((station) => (
              <button
                key={station.nameKo}
                onClick={() => window.open(station.playerUrl, "_blank")}
                className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 hover:border-coral/30 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{station.emoji}</span>
                  <div>
                    <p className="text-[16px] font-bold text-warm-gray">{station.nameKo}</p>
                    <p className="text-[12px] text-warm-gray-light">{station.nameEn}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[13px] font-bold">
                  {t.openPlayer} ▶
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── MUSIC TAB ── */}
        {tab === "music" && (
          <div className="pt-2">
            {/* Category pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["trot", "pop7080", "ballad", "hymn"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMusicCat(cat)}
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

            {/* Song list */}
            <div className="space-y-2">
              {MUSIC_DATA.find((c) => c.id === musicCat)?.items.map((item) => (
                <button
                  key={item.searchQuery}
                  onClick={() => openYouTube(item.searchQuery)}
                  className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 hover:border-coral/30 active:scale-[0.98] transition-all"
                >
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-[12px] font-bold ml-2 whitespace-nowrap">
                    ▶ YouTube
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── VIDEO TAB ── */}
        {tab === "video" && (
          <div className="pt-2">
            {/* Category pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["nostalgia", "hometown", "exercise"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setVideoCat(cat)}
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

            {/* Video list */}
            <div className="space-y-2">
              {VIDEO_DATA.find((c) => c.id === videoCat)?.items.map((item) => (
                <button
                  key={item.searchQuery}
                  onClick={() => openYouTube(item.searchQuery)}
                  className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 hover:border-coral/30 active:scale-[0.98] transition-all"
                >
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-[12px] font-bold ml-2 whitespace-nowrap">
                    ▶ YouTube
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
