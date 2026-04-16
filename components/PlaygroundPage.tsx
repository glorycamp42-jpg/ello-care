"use client";

import { useState, useCallback } from "react";

/* ══════════════════════════════════════
   i18n
   ══════════════════════════════════════ */
const I18N: Record<string, Record<string, string>> = {
  ko: { title: "놀이터", back: "← 돌아가기", radio: "라디오", music: "음악", video: "영상", game: "게임",
    trot: "트로트", pop7080: "7080", ballad: "발라드", hymn: "찬송가",
    nostalgia: "추억", hometown: "고향풍경", exercise: "건강체조",
    loading: "찾는 중...",
    wordChain: "끝말잇기", proverb: "속담 퀴즈", brainGame: "두뇌 게임",
    yourTurn: "당신 차례!", correct: "정답!", wrong: "틀렸어요", score: "점수",
    next: "다음 문제", start: "시작하기", hint: "힌트", restart: "다시 하기",
    provQuestion: "빈칸을 채워주세요", gameOver: "게임 끝!",
    wordPlaceholder: "단어를 입력하세요...", submit: "확인",
  },
  en: { title: "Playground", back: "← Back", radio: "Radio", music: "Music", video: "Videos", game: "Games",
    trot: "Trot", pop7080: "7080", ballad: "Ballad", hymn: "Hymns",
    nostalgia: "Nostalgia", hometown: "Hometown", exercise: "Exercise",
    loading: "Searching...",
    wordChain: "Word Chain", proverb: "Proverb Quiz", brainGame: "Brain Game",
    yourTurn: "Your turn!", correct: "Correct!", wrong: "Wrong!", score: "Score",
    next: "Next", start: "Start", hint: "Hint", restart: "Play Again",
    provQuestion: "Fill in the blank", gameOver: "Game Over!",
    wordPlaceholder: "Enter a word...", submit: "Submit",
  },
  es: { title: "Recreo", back: "← Volver", radio: "Radio", music: "Música", video: "Videos", game: "Juegos",
    trot: "Trot", pop7080: "7080", ballad: "Balada", hymn: "Himnos",
    nostalgia: "Nostalgia", hometown: "Paisajes", exercise: "Ejercicio",
    loading: "Buscando...",
    wordChain: "Cadena", proverb: "Refranes", brainGame: "Mental",
    yourTurn: "¡Tu turno!", correct: "¡Correcto!", wrong: "¡Incorrecto!", score: "Puntos",
    next: "Siguiente", start: "Empezar", hint: "Pista", restart: "Reiniciar",
    provQuestion: "Completa", gameOver: "¡Fin!",
    wordPlaceholder: "Escribe...", submit: "Enviar",
  },
  zh: { title: "游乐场", back: "← 返回", radio: "广播", music: "音乐", video: "视频", game: "游戏",
    trot: "Trot", pop7080: "7080", ballad: "抒情", hymn: "赞美诗",
    nostalgia: "怀旧", hometown: "故乡", exercise: "健康操",
    loading: "搜索中...",
    wordChain: "接龙", proverb: "谚语", brainGame: "脑力",
    yourTurn: "你的回合!", correct: "正确!", wrong: "错误!", score: "分数",
    next: "下一题", start: "开始", hint: "提示", restart: "重来",
    provQuestion: "填空", gameOver: "结束!",
    wordPlaceholder: "输入...", submit: "确认",
  },
  vi: { title: "Sân chơi", back: "← Quay lại", radio: "Radio", music: "Nhạc", video: "Video", game: "Trò chơi",
    trot: "Trot", pop7080: "7080", ballad: "Ballad", hymn: "Thánh ca",
    nostalgia: "Hoài niệm", hometown: "Quê hương", exercise: "Thể dục",
    loading: "Đang tìm...",
    wordChain: "Nối chữ", proverb: "Tục ngữ", brainGame: "Trí tuệ",
    yourTurn: "Lượt bạn!", correct: "Đúng!", wrong: "Sai!", score: "Điểm",
    next: "Tiếp", start: "Bắt đầu", hint: "Gợi ý", restart: "Chơi lại",
    provQuestion: "Điền vào", gameOver: "Hết!",
    wordPlaceholder: "Nhập...", submit: "Gửi",
  },
  ja: { title: "遊び場", back: "← 戻る", radio: "ラジオ", music: "音楽", video: "映像", game: "ゲーム",
    trot: "トロット", pop7080: "7080", ballad: "バラード", hymn: "讃美歌",
    nostalgia: "思い出", hometown: "故郷", exercise: "体操",
    loading: "検索中...",
    wordChain: "しりとり", proverb: "ことわざ", brainGame: "脳トレ",
    yourTurn: "あなたの番!", correct: "正解!", wrong: "不正解!", score: "スコア",
    next: "次へ", start: "スタート", hint: "ヒント", restart: "もう一度",
    provQuestion: "穴埋め", gameOver: "終了!",
    wordPlaceholder: "入力...", submit: "送信",
  },
};

/* ══════════════════════════════════════
   RADIO STATIONS
   ══════════════════════════════════════ */
interface RadioStation { nameKo: string; emoji: string; searchQuery: string; }
const RADIO_STATIONS: RadioStation[] = [
  { nameKo: "KBS 1라디오", emoji: "📻", searchQuery: "KBS 1라디오 라이브 실시간" },
  { nameKo: "KBS 클래식FM", emoji: "🎻", searchQuery: "KBS 클래식FM 라이브 실시간" },
  { nameKo: "KBS 쿨FM", emoji: "😎", searchQuery: "KBS 쿨FM 라이브 실시간" },
  { nameKo: "MBC 표준FM", emoji: "📻", searchQuery: "MBC 표준FM 라이브 실시간 보이는 라디오" },
  { nameKo: "MBC FM4U", emoji: "🎵", searchQuery: "MBC FM4U 라이브 실시간 보이는 라디오" },
  { nameKo: "SBS 러브FM", emoji: "❤️", searchQuery: "SBS 러브FM 실시간 라이브" },
  { nameKo: "SBS 파워FM", emoji: "⚡", searchQuery: "SBS 파워FM 실시간 라이브 보이는 라디오" },
  { nameKo: "CBS JOY4U (24시간 CCM)", emoji: "🎵", searchQuery: "CBS JOY4U 24시간 CCM 찬양 라이브" },
  { nameKo: "FEBC 극동방송", emoji: "✝️", searchQuery: "FEBC 극동방송 라디오 실시간 라이브" },
  { nameKo: "CTS 기독교TV", emoji: "📺", searchQuery: "CTS 기독교TV 실시간 라이브" },
  { nameKo: "찬양 라이브 24시간", emoji: "🙏", searchQuery: "찬양 워십 라이브 24시간 스트리밍" },
  { nameKo: "트로트 라디오 24시간", emoji: "🎶", searchQuery: "트로트 라디오 24시간 실시간 라이브" },
  { nameKo: "7080 올드팝 라디오", emoji: "🎸", searchQuery: "7080 올드팝 24시간 라이브 스트리밍" },
];

/* ══════════════════════════════════════
   MUSIC / VIDEO DATA
   ══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   PROVERB QUIZ DATA
   ══════════════════════════════════════ */
interface ProverbQ { proverb: string; blank: string; answer: string; hint: string; }
const PROVERBS: ProverbQ[] = [
  { proverb: "가는 말이 고와야 ___ 말이 곱다", blank: "___", answer: "오는", hint: "돌아오는" },
  { proverb: "낮말은 새가 듣고 ___은 쥐가 듣는다", blank: "___", answer: "밤말", hint: "밤에 하는 말" },
  { proverb: "소 잃고 ___ 고친다", blank: "___", answer: "외양간", hint: "소가 사는 곳" },
  { proverb: "원숭이도 ___에서 떨어진다", blank: "___", answer: "나무", hint: "원숭이가 잘 타는 것" },
  { proverb: "하늘이 무너져도 솟아날 ___이 있다", blank: "___", answer: "구멍", hint: "빠져나갈 수 있는" },
  { proverb: "콩 심은 데 ___ 나고 팥 심은 데 팥 난다", blank: "___", answer: "콩", hint: "심은 것과 같은 것" },
  { proverb: "호랑이도 ___하면 온다", blank: "___", answer: "제 말", hint: "그 사람 이야기" },
  { proverb: "백지장도 ___이 낫다", blank: "___", answer: "맞들면", hint: "함께 들면" },
  { proverb: "세 살 ___이 여든까지 간다", blank: "___", answer: "버릇", hint: "습관" },
  { proverb: "아니 땐 ___에 연기 날까", blank: "___", answer: "굴뚝", hint: "불 때는 곳 위" },
  { proverb: "뛰는 놈 위에 ___ 놈 있다", blank: "___", answer: "나는", hint: "하늘을 날다" },
  { proverb: "가재는 ___ 편이라", blank: "___", answer: "게", hint: "바다에 사는 비슷한 동물" },
  { proverb: "꿩 먹고 ___ 먹고", blank: "___", answer: "알", hint: "새가 낳는 것" },
  { proverb: "눈에서 멀어지면 ___에서도 멀어진다", blank: "___", answer: "마음", hint: "사랑하는 감정" },
  { proverb: "돌다리도 ___ 건너라", blank: "___", answer: "두드려 보고", hint: "확인하고" },
];

/* ══════════════════════════════════════
   BRAIN GAME: Simple math / color matching
   ══════════════════════════════════════ */
function generateMathQ(): { question: string; answer: number; choices: number[] } {
  const a = Math.floor(Math.random() * 30) + 10;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = ["+", "-"] as const;
  const op = ops[Math.floor(Math.random() * 2)];
  const answer = op === "+" ? a + b : a - b;
  const choices = [answer];
  while (choices.length < 4) {
    const wrong = answer + Math.floor(Math.random() * 11) - 5;
    if (wrong !== answer && !choices.includes(wrong) && wrong >= 0) choices.push(wrong);
  }
  choices.sort(() => Math.random() - 0.5);
  return { question: `${a} ${op} ${b} = ?`, answer, choices };
}

/* ══════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════ */
interface PlaygroundPageProps { onClose: () => void; langCode?: string; }

export default function PlaygroundPage({ onClose, langCode = "ko" }: PlaygroundPageProps) {
  const t = I18N[langCode] || I18N.ko;
  const [tab, setTab] = useState<"radio" | "music" | "video" | "game">("game");
  const [musicCat, setMusicCat] = useState("trot");
  const [videoCat, setVideoCat] = useState("nostalgia");

  // YouTube state
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [nowPlayingLabel, setNowPlayingLabel] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);

  // Game state
  const [gameSub, setGameSub] = useState<"menu" | "wordchain" | "proverb" | "brain">("menu");
  const [gameScore, setGameScore] = useState(0);
  const [gameMsg, setGameMsg] = useState("");

  // Word Chain state
  const [wcHistory, setWcHistory] = useState<string[]>([]);
  const [wcInput, setWcInput] = useState("");
  const [wcLastChar, setWcLastChar] = useState("");
  const [wcGameOver, setWcGameOver] = useState(false);

  // Proverb Quiz state
  const [provIdx, setProvIdx] = useState(0);
  const [provInput, setProvInput] = useState("");
  const [provShowHint, setProvShowHint] = useState(false);
  const [provResult, setProvResult] = useState<"correct" | "wrong" | null>(null);

  // Brain Game state
  const [mathQ, setMathQ] = useState(() => generateMathQ());
  const [mathResult, setMathResult] = useState<"correct" | "wrong" | null>(null);
  const [mathCount, setMathCount] = useState(0);

  /* ── YouTube search → embed ── */
  const playYouTube = useCallback(async (query: string, label?: string) => {
    setVideoLoading(true);
    setCurrentVideoId(null);
    setSearchError(false);
    setNowPlayingLabel(label || null);
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.videoId) setCurrentVideoId(data.videoId);
      else setSearchError(true);
    } catch { setSearchError(true); }
    setVideoLoading(false);
  }, []);

  /* ── Word Chain game ── */
  function startWordChain() {
    setGameSub("wordchain");
    setWcHistory(["사과"]);
    setWcLastChar("과");
    setWcInput("");
    setWcGameOver(false);
    setGameScore(0);
    setGameMsg("");
  }

  function submitWordChain() {
    const word = wcInput.trim();
    if (!word) return;
    if (word[0] !== wcLastChar) {
      setGameMsg(`"${wcLastChar}"(으)로 시작하는 단어를 입력하세요!`);
      return;
    }
    if (wcHistory.includes(word)) {
      setGameMsg("이미 사용한 단어입니다!");
      return;
    }
    if (word.length < 2) {
      setGameMsg("두 글자 이상 입력하세요!");
      return;
    }

    const newHistory = [...wcHistory, word];
    setWcHistory(newHistory);
    setGameScore(s => s + 10);
    setWcInput("");
    setGameMsg("");

    // Ello's turn (simple AI response)
    const lastChar = word[word.length - 1];
    const elloWords: Record<string, string> = {
      "과": "과자", "자": "자동차", "차": "차가운", "운": "운동",
      "동": "동물", "물": "물고기", "기": "기차", "리": "리본",
      "본": "본능", "능": "능력", "력": "력사", "사": "사랑",
      "랑": "랑데뷰", "뷰": "뷰티", "티": "티셔츠", "츠": "츠나미",
      "미": "미소", "소": "소나무", "무": "무지개", "개": "개나리",
      "나": "나비", "비": "비행기", "행": "행복", "복": "복숭아",
      "아": "아이스크림", "림": "림프", "프": "프랑스", "스": "스타",
      "타": "타조", "조": "조개", "화": "화분", "분": "분수",
      "수": "수박", "박": "박수", "인": "인사", "구": "구름",
      "름": "름치", "마": "마음", "음": "음악", "악": "악기",
      "산": "산책", "책": "책상", "상": "상자", "장": "장미",
      "감": "감자", "전": "전화", "국": "국수", "밥": "밥상",
      "달": "달님", "님": "님프", "강": "강아지", "지": "지구",
      "하": "하늘", "늘": "늘보", "보": "보물", "꽃": "꽃잎",
      "잎": "잎사귀", "귀": "귀뚜라미", "눈": "눈사람", "람": "람보",
    };
    const elloWord = elloWords[lastChar];
    if (elloWord && !newHistory.includes(elloWord)) {
      const elloHistory = [...newHistory, elloWord];
      setWcHistory(elloHistory);
      setWcLastChar(elloWord[elloWord.length - 1]);
    } else {
      // Ello gives up
      setWcGameOver(true);
      setGameMsg("엘로가 단어를 못 찾겠대요! 당신이 이겼어요! 🎉");
    }
  }

  /* ── Proverb Quiz ── */
  function startProverb() {
    setGameSub("proverb");
    setProvIdx(0);
    setProvInput("");
    setProvShowHint(false);
    setProvResult(null);
    setGameScore(0);
  }

  function checkProverb() {
    const q = PROVERBS[provIdx];
    if (provInput.trim() === q.answer) {
      setProvResult("correct");
      setGameScore(s => s + 10);
    } else {
      setProvResult("wrong");
    }
  }

  function nextProverb() {
    if (provIdx + 1 >= PROVERBS.length) {
      setGameSub("menu");
      return;
    }
    setProvIdx(i => i + 1);
    setProvInput("");
    setProvShowHint(false);
    setProvResult(null);
  }

  /* ── Brain (Math) Game ── */
  function startBrain() {
    setGameSub("brain");
    setMathQ(generateMathQ());
    setMathResult(null);
    setGameScore(0);
    setMathCount(0);
  }

  function answerMath(choice: number) {
    if (choice === mathQ.answer) {
      setMathResult("correct");
      setGameScore(s => s + 10);
    } else {
      setMathResult("wrong");
    }
    setTimeout(() => {
      setMathResult(null);
      setMathCount(c => c + 1);
      if (mathCount + 1 >= 10) {
        setGameSub("menu");
      } else {
        setMathQ(generateMathQ());
      }
    }, 1000);
  }

  /* ── Styles ── */
  const tabBtn = (active: boolean) =>
    `flex-1 py-2.5 text-center text-[14px] font-bold rounded-xl transition-all ${
      active ? "bg-coral text-white shadow-md" : "bg-warm-white text-warm-gray"
    }`;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-warm-white border-b border-warm-gray-light/15 px-4 pt-12 pb-3 flex items-center justify-between">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium">{t.back}</button>
        <h1 className="text-lg font-bold text-warm-gray">{t.title}</h1>
        <div className="w-16" />
      </header>

      {/* Sub-tabs: 4 tabs */}
      <div className="px-3 pt-3 pb-2 flex gap-1.5">
        <button className={tabBtn(tab === "game")} onClick={() => { setTab("game"); setGameSub("menu"); }}>🎮 {t.game}</button>
        <button className={tabBtn(tab === "radio")} onClick={() => setTab("radio")}>📻 {t.radio}</button>
        <button className={tabBtn(tab === "music")} onClick={() => setTab("music")}>🎵 {t.music}</button>
        <button className={tabBtn(tab === "video")} onClick={() => setTab("video")}>📺 {t.video}</button>
      </div>

      {/* YouTube player */}
      {currentVideoId && tab !== "game" && (
        <div className="mx-4 mb-3">
          {nowPlayingLabel && (
            <div className="bg-blue-50 border border-blue-200 rounded-t-2xl px-4 py-2 flex items-center justify-between">
              <p className="text-[14px] font-bold text-blue-700">📻 {nowPlayingLabel}</p>
              <button onClick={() => { setCurrentVideoId(null); setNowPlayingLabel(null); }}
                className="text-[12px] text-red-500 font-bold">⏹ 정지</button>
            </div>
          )}
          <div className={`${nowPlayingLabel ? "rounded-b-2xl" : "rounded-2xl"} overflow-hidden shadow-lg bg-black`}>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&playsinline=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen title="Player" />
            </div>
          </div>
        </div>
      )}
      {videoLoading && tab !== "game" && (
        <div className="mx-4 mb-3 p-8 bg-warm-white rounded-2xl text-center">
          <p className="text-warm-gray text-[16px] animate-pulse">{t.loading}</p>
        </div>
      )}
      {searchError && !videoLoading && tab !== "game" && (
        <div className="mx-4 mb-3 p-4 bg-red-50 rounded-2xl text-center border border-red-200">
          <p className="text-red-600 text-[14px]">검색에 실패했습니다. 다시 시도해 주세요.</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">

        {/* ══ GAME TAB ══ */}
        {tab === "game" && gameSub === "menu" && (
          <div className="space-y-4 pt-2">
            {gameScore > 0 && (
              <div className="p-4 bg-yellow-50 rounded-2xl text-center border border-yellow-200">
                <p className="text-[18px] font-bold text-yellow-700">🏆 {t.score}: {gameScore}점</p>
              </div>
            )}
            <button onClick={startWordChain}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 text-left active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🔤</span>
                <div>
                  <p className="text-[18px] font-bold text-blue-800">{t.wordChain}</p>
                  <p className="text-[13px] text-blue-600 mt-1">끝 글자로 시작하는 단어 대기!</p>
                </div>
              </div>
            </button>
            <button onClick={startProverb}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-green-100 to-green-50 border border-green-200 text-left active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <span className="text-4xl">📜</span>
                <div>
                  <p className="text-[18px] font-bold text-green-800">{t.proverb}</p>
                  <p className="text-[13px] text-green-600 mt-1">빈칸에 들어갈 말은?</p>
                </div>
              </div>
            </button>
            <button onClick={startBrain}
              className="w-full p-6 rounded-2xl bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-200 text-left active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <span className="text-4xl">🧠</span>
                <div>
                  <p className="text-[18px] font-bold text-purple-800">{t.brainGame}</p>
                  <p className="text-[13px] text-purple-600 mt-1">간단한 계산 문제 10개!</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── WORD CHAIN ── */}
        {tab === "game" && gameSub === "wordchain" && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setGameSub("menu")} className="text-coral text-[14px] font-bold">← {t.back}</button>
              <p className="text-[15px] font-bold text-warm-gray">🏆 {gameScore}점</p>
            </div>
            {/* History */}
            <div className="bg-warm-white rounded-2xl p-4 mb-3 max-h-[250px] overflow-y-auto border border-warm-gray-light/15">
              {wcHistory.map((w, i) => (
                <span key={i} className={`inline-block px-3 py-1.5 m-1 rounded-full text-[15px] font-semibold ${
                  i % 2 === 0 ? "bg-blue-100 text-blue-700" : "bg-coral-pastel text-coral-dark"
                }`}>
                  {i % 2 === 0 ? "🤖 " : "👤 "}{w}
                </span>
              ))}
            </div>
            {gameMsg && (
              <p className={`text-center text-[14px] font-bold mb-2 ${wcGameOver ? "text-green-600" : "text-red-500"}`}>{gameMsg}</p>
            )}
            {!wcGameOver ? (
              <div className="flex gap-2">
                <input value={wcInput} onChange={e => setWcInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitWordChain()}
                  placeholder={`"${wcLastChar}"(으)로 시작하는 단어`}
                  className="flex-1 px-4 py-3 bg-warm-white rounded-2xl border border-warm-gray-light/15 text-[16px] focus:outline-none focus:border-coral/30" />
                <button onClick={submitWordChain}
                  className="px-5 py-3 bg-coral text-white rounded-2xl font-bold text-[15px] active:scale-95">{t.submit}</button>
              </div>
            ) : (
              <button onClick={startWordChain}
                className="w-full py-4 bg-coral text-white rounded-2xl font-bold text-[16px] active:scale-95">{t.restart}</button>
            )}
          </div>
        )}

        {/* ── PROVERB QUIZ ── */}
        {tab === "game" && gameSub === "proverb" && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setGameSub("menu")} className="text-coral text-[14px] font-bold">← {t.back}</button>
              <p className="text-[15px] font-bold text-warm-gray">🏆 {gameScore}점  ({provIdx + 1}/{PROVERBS.length})</p>
            </div>
            <div className="bg-warm-white rounded-2xl p-6 mb-4 border border-warm-gray-light/15 text-center">
              <p className="text-[12px] text-warm-gray-light mb-2">{t.provQuestion}</p>
              <p className="text-[20px] font-bold text-warm-gray leading-relaxed">
                {PROVERBS[provIdx].proverb}
              </p>
            </div>
            {provShowHint && (
              <p className="text-center text-[14px] text-blue-600 mb-3">💡 {t.hint}: {PROVERBS[provIdx].hint}</p>
            )}
            {provResult && (
              <p className={`text-center text-[18px] font-bold mb-3 ${provResult === "correct" ? "text-green-600" : "text-red-500"}`}>
                {provResult === "correct" ? `✅ ${t.correct}` : `❌ ${t.wrong} 정답: ${PROVERBS[provIdx].answer}`}
              </p>
            )}
            {!provResult ? (
              <>
                <div className="flex gap-2 mb-3">
                  <input value={provInput} onChange={e => setProvInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && checkProverb()}
                    placeholder="정답 입력..."
                    className="flex-1 px-4 py-3 bg-warm-white rounded-2xl border border-warm-gray-light/15 text-[16px] text-center focus:outline-none focus:border-coral/30" />
                  <button onClick={checkProverb}
                    className="px-5 py-3 bg-coral text-white rounded-2xl font-bold text-[15px] active:scale-95">{t.submit}</button>
                </div>
                {!provShowHint && (
                  <button onClick={() => setProvShowHint(true)}
                    className="w-full py-2 text-blue-500 text-[14px] font-bold">💡 {t.hint}</button>
                )}
              </>
            ) : (
              <button onClick={nextProverb}
                className="w-full py-4 bg-coral text-white rounded-2xl font-bold text-[16px] active:scale-95">
                {provIdx + 1 >= PROVERBS.length ? t.gameOver : t.next}
              </button>
            )}
          </div>
        )}

        {/* ── BRAIN (MATH) GAME ── */}
        {tab === "game" && gameSub === "brain" && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setGameSub("menu")} className="text-coral text-[14px] font-bold">← {t.back}</button>
              <p className="text-[15px] font-bold text-warm-gray">🏆 {gameScore}점  ({mathCount + 1}/10)</p>
            </div>
            <div className="bg-warm-white rounded-2xl p-8 mb-4 border border-warm-gray-light/15 text-center">
              <p className="text-[36px] font-bold text-warm-gray">{mathQ.question}</p>
            </div>
            {mathResult && (
              <p className={`text-center text-[20px] font-bold mb-3 ${mathResult === "correct" ? "text-green-600" : "text-red-500"}`}>
                {mathResult === "correct" ? `✅ ${t.correct}` : `❌ ${t.wrong}`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {mathQ.choices.map((c) => (
                <button key={c} onClick={() => !mathResult && answerMath(c)}
                  disabled={!!mathResult}
                  className="py-5 bg-warm-white rounded-2xl border border-warm-gray-light/15 text-[22px] font-bold text-warm-gray active:scale-95 active:bg-coral-pastel transition-all disabled:opacity-50">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ RADIO TAB ══ */}
        {tab === "radio" && (
          <div className="space-y-3 pt-1">
            {RADIO_STATIONS.map((station) => (
              <button key={station.nameKo}
                onClick={() => playYouTube(station.searchQuery, station.nameKo)}
                disabled={videoLoading}
                className={`w-full p-5 rounded-2xl text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                  nowPlayingLabel === station.nameKo ? "bg-blue-100 border-2 border-blue-400 shadow-md" : "bg-warm-white border border-warm-gray-light/15"
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{station.emoji}</span>
                  <p className="text-[17px] font-bold text-warm-gray">{station.nameKo}</p>
                </div>
                <span className="text-2xl">{nowPlayingLabel === station.nameKo ? "🔊" : "▶️"}</span>
              </button>
            ))}
          </div>
        )}

        {/* ══ MUSIC TAB ══ */}
        {tab === "music" && (
          <div>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {(["trot", "pop7080", "ballad", "hymn"] as const).map((cat) => (
                <button key={cat} onClick={() => { setMusicCat(cat); setCurrentVideoId(null); }}
                  className={`px-4 py-2.5 rounded-full text-[14px] font-bold whitespace-nowrap ${
                    musicCat === cat ? "bg-coral text-white shadow-md" : "bg-warm-white text-warm-gray border border-warm-gray-light/15"
                  }`}>{t[cat]}</button>
              ))}
            </div>
            <div className="space-y-2">
              {MUSIC_DATA.find(c => c.id === musicCat)?.items.map((item) => (
                <button key={item.query} onClick={() => playYouTube(item.query)}
                  className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 active:scale-[0.98]">
                  <p className="text-[15px] font-semibold text-warm-gray flex-1">{item.title}</p>
                  <span className="text-xl ml-2">▶️</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ VIDEO TAB ══ */}
        {tab === "video" && (
          <div>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {(["nostalgia", "hometown", "exercise"] as const).map((cat) => (
                <button key={cat} onClick={() => { setVideoCat(cat); setCurrentVideoId(null); }}
                  className={`px-4 py-2.5 rounded-full text-[14px] font-bold whitespace-nowrap ${
                    videoCat === cat ? "bg-coral text-white shadow-md" : "bg-warm-white text-warm-gray border border-warm-gray-light/15"
                  }`}>{t[cat]}</button>
              ))}
            </div>
            <div className="space-y-2">
              {VIDEO_DATA.find(c => c.id === videoCat)?.items.map((item) => (
                <button key={item.query} onClick={() => playYouTube(item.query)}
                  className="w-full p-4 rounded-2xl text-left flex items-center justify-between bg-warm-white border border-warm-gray-light/15 active:scale-[0.98]">
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
