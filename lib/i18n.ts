export type LangCode = "ko" | "en" | "es" | "zh" | "vi" | "ja";

export interface Language {
  code: LangCode;
  name: string;
  flag: string;
  speechLang: string; // BCP-47 for Web Speech API
  systemPrompt: string;
  ui: {
    placeholder: string;
    quickButtons: string[];
    wordGame: string;
    bible: string;
    schedule: string;
    speaking: string;
    thinking: string;
    listening: string;
    aiCompanion: string;
    start: string;
    back: string;
    send: string;
    home: string;
    chat: string;
    safety: string;
  };
}

export const LANGUAGES: Language[] = [
  {
    code: "ko",
    name: "한국어",
    flag: "🇰🇷",
    speechLang: "ko-KR",
    systemPrompt: "항상 한국어로 대화해.",
    ui: {
      placeholder: "소연이에게 말씀해주세요...",
      quickButtons: ["오늘 기분은 어떠세요?", "점심은 드셨어요?", "몸은 괜찮으세요?"],
      wordGame: "🎮 끝말잇기",
      bible: "📖 성경",
      schedule: "📅 일정",
      speaking: "말하고 있어요...",
      thinking: "생각 중...",
      listening: "듣고 있어요... 말씀해주세요",
      aiCompanion: "AI 손녀",
      start: "시작하기",
      back: "돌아가기",
      send: "보내기",
      home: "홈",
      chat: "대화",
      safety: "안전",
    },
  },
  {
    code: "en",
    name: "English",
    flag: "🇺🇸",
    speechLang: "en-US",
    systemPrompt: "Always respond in English. Be warm and friendly like a caring granddaughter.",
    ui: {
      placeholder: "Talk to Soyeon...",
      quickButtons: ["How are you feeling?", "Did you eat lunch?", "Are you doing okay?"],
      wordGame: "🎮 Word Game",
      bible: "📖 Bible",
      schedule: "📅 Schedule",
      speaking: "Speaking...",
      thinking: "Thinking...",
      listening: "Listening... please speak",
      aiCompanion: "AI Companion",
      start: "Start",
      back: "Back",
      send: "Send",
      home: "Home",
      chat: "Chat",
      safety: "Safety",
    },
  },
  {
    code: "es",
    name: "Español",
    flag: "🇪🇸",
    speechLang: "es-ES",
    systemPrompt: "Siempre responde en español. Sé cálida y amigable como una nieta cariñosa.",
    ui: {
      placeholder: "Habla con Soyeon...",
      quickButtons: ["¿Cómo te sientes?", "¿Ya almorzaste?", "¿Estás bien?"],
      wordGame: "🎮 Juego",
      bible: "📖 Biblia",
      schedule: "📅 Horario",
      speaking: "Hablando...",
      thinking: "Pensando...",
      listening: "Escuchando... por favor habla",
      aiCompanion: "IA Compañera",
      start: "Empezar",
      back: "Volver",
      send: "Enviar",
      home: "Inicio",
      chat: "Chat",
      safety: "Seguridad",
    },
  },
  {
    code: "zh",
    name: "中文",
    flag: "🇨🇳",
    speechLang: "zh-CN",
    systemPrompt: "始终用中文回复。像一个关心人的孙女一样温暖友好。",
    ui: {
      placeholder: "和素妍说话...",
      quickButtons: ["你今天感觉怎么样?", "午饭吃了吗?", "身体还好吗?"],
      wordGame: "🎮 文字游戏",
      bible: "📖 圣经",
      schedule: "📅 日程",
      speaking: "正在说话...",
      thinking: "思考中...",
      listening: "正在听...请说话",
      aiCompanion: "AI伙伴",
      start: "开始",
      back: "返回",
      send: "发送",
      home: "首页",
      chat: "聊天",
      safety: "安全",
    },
  },
  {
    code: "vi",
    name: "Tiếng Việt",
    flag: "🇻🇳",
    speechLang: "vi-VN",
    systemPrompt: "Luôn trả lời bằng tiếng Việt. Thân thiện và ấm áp như một cháu gái quan tâm.",
    ui: {
      placeholder: "Nói chuyện với Soyeon...",
      quickButtons: ["Hôm nay bạn thế nào?", "Bạn ăn trưa chưa?", "Bạn có khỏe không?"],
      wordGame: "🎮 Trò chơi",
      bible: "📖 Kinh Thánh",
      schedule: "📅 Lịch trình",
      speaking: "Đang nói...",
      thinking: "Đang suy nghĩ...",
      listening: "Đang nghe... hãy nói",
      aiCompanion: "Bạn AI",
      start: "Bắt đầu",
      back: "Quay lại",
      send: "Gửi",
      home: "Trang chủ",
      chat: "Trò chuyện",
      safety: "An toàn",
    },
  },
  {
    code: "ja",
    name: "日本語",
    flag: "🇯🇵",
    speechLang: "ja-JP",
    systemPrompt: "常に日本語で返答してください。温かく親切な孫娘のように接してください。",
    ui: {
      placeholder: "ソヨンに話しかけて...",
      quickButtons: ["今日の気分はどう?", "お昼ご飯食べた?", "体調は大丈夫?"],
      wordGame: "🎮 しりとり",
      bible: "📖 聖書",
      schedule: "📅 予定",
      speaking: "話しています...",
      thinking: "考えています...",
      listening: "聞いています...話してください",
      aiCompanion: "AI仲間",
      start: "スタート",
      back: "戻る",
      send: "送信",
      home: "ホーム",
      chat: "チャット",
      safety: "安全",
    },
  },
];

export function getLang(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

export function getSavedLang(): Language {
  if (typeof window === "undefined") return LANGUAGES[0];
  try {
    const code = localStorage.getItem("ello-language");
    if (code) return getLang(code);
  } catch {}
  return LANGUAGES[0]; // default Korean
}

export function saveLang(code: LangCode) {
  try { localStorage.setItem("ello-language", code); } catch {}
}
