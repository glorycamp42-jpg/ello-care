export type LangCode = "ko" | "en" | "es" | "zh" | "vi" | "ja";

export interface Language {
  code: LangCode;
  name: string;
  flag: string;
  speechLang: string;
  charName: string;
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
    camera: string;
    mic: string;
    speaker: string;
  };
}

export const LANGUAGES: Language[] = [
  {
    code: "ko",
    name: "한국어",
    flag: "🇰🇷",
    speechLang: "ko-KR",
    charName: "소연",
    systemPrompt: "너는 반드시 한국어로만 대화해야 해. 다른 언어는 절대 사용하지 마.",
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
      camera: "카메라",
      mic: "말하기",
      speaker: "듣기",
    },
  },
  {
    code: "en",
    name: "English",
    flag: "🇺🇸",
    speechLang: "en-US",
    charName: "Sophie",
    systemPrompt: "You MUST respond ONLY in English. Never use Korean or any other language. Always speak English. Be warm and friendly like a caring granddaughter.",
    ui: {
      placeholder: "Talk to Sophie...",
      quickButtons: ["How are you feeling today?", "Did you eat lunch?", "Are you doing okay?"],
      wordGame: "🎮 Word Game",
      bible: "📖 Bible",
      schedule: "📅 Schedule",
      speaking: "Speaking...",
      thinking: "Thinking...",
      listening: "Listening... please speak",
      aiCompanion: "AI Granddaughter",
      start: "Start",
      back: "Back",
      send: "Send",
      home: "Home",
      chat: "Chat",
      safety: "Safety",
      camera: "Camera",
      mic: "Speak",
      speaker: "Listen",
    },
  },
  {
    code: "es",
    name: "Español",
    flag: "🇪🇸",
    speechLang: "es-ES",
    charName: "Sofía",
    systemPrompt: "DEBES responder SOLO en español. Nunca uses coreano ni ningún otro idioma. Siempre habla en español. Sé cálida y amigable como una nieta cariñosa.",
    ui: {
      placeholder: "Habla con Sofía...",
      quickButtons: ["¿Cómo te sientes hoy?", "¿Ya almorzaste?", "¿Estás bien de salud?"],
      wordGame: "🎮 Juego de palabras",
      bible: "📖 Biblia",
      schedule: "📅 Horario",
      speaking: "Hablando...",
      thinking: "Pensando...",
      listening: "Escuchando... por favor habla",
      aiCompanion: "IA Nieta",
      start: "Empezar",
      back: "Volver",
      send: "Enviar",
      home: "Inicio",
      chat: "Chat",
      safety: "Seguridad",
      camera: "Cámara",
      mic: "Hablar",
      speaker: "Escuchar",
    },
  },
  {
    code: "zh",
    name: "中文",
    flag: "🇨🇳",
    speechLang: "zh-CN",
    charName: "小燕",
    systemPrompt: "你必须只用中文回复。绝对不要使用韩语或任何其他语言。始终说中文。像一个关心人的孙女一样温暖友好。",
    ui: {
      placeholder: "和小燕说话...",
      quickButtons: ["你今天感觉怎么样?", "午饭吃了吗?", "身体还好吗?"],
      wordGame: "🎮 文字游戏",
      bible: "📖 圣经",
      schedule: "📅 日程",
      speaking: "正在说话...",
      thinking: "思考中...",
      listening: "正在听...请说话",
      aiCompanion: "AI孙女",
      start: "开始",
      back: "返回",
      send: "发送",
      home: "首页",
      chat: "聊天",
      safety: "安全",
      camera: "拍照",
      mic: "说话",
      speaker: "听",
    },
  },
  {
    code: "vi",
    name: "Tiếng Việt",
    flag: "🇻🇳",
    speechLang: "vi-VN",
    charName: "Lan",
    systemPrompt: "Bạn PHẢI trả lời CHỈ bằng tiếng Việt. Không bao giờ dùng tiếng Hàn hay ngôn ngữ khác. Luôn nói tiếng Việt. Thân thiện và ấm áp như một cháu gái quan tâm.",
    ui: {
      placeholder: "Nói chuyện với Lan...",
      quickButtons: ["Hôm nay bạn thế nào?", "Bạn ăn trưa chưa?", "Sức khỏe có ổn không?"],
      wordGame: "🎮 Trò chơi chữ",
      bible: "📖 Kinh Thánh",
      schedule: "📅 Lịch trình",
      speaking: "Đang nói...",
      thinking: "Đang suy nghĩ...",
      listening: "Đang nghe... hãy nói",
      aiCompanion: "Cháu gái AI",
      start: "Bắt đầu",
      back: "Quay lại",
      send: "Gửi",
      home: "Trang chủ",
      chat: "Trò chuyện",
      safety: "An toàn",
      camera: "Máy ảnh",
      mic: "Nói",
      speaker: "Nghe",
    },
  },
  {
    code: "ja",
    name: "日本語",
    flag: "🇯🇵",
    speechLang: "ja-JP",
    charName: "さくら",
    systemPrompt: "必ず日本語のみで返答してください。韓国語や他の言語は絶対に使わないでください。常に日本語で話してください。温かく親切な孫娘のように接してください。",
    ui: {
      placeholder: "さくらに話しかけて...",
      quickButtons: ["今日の気分はどうですか?", "お昼ご飯は食べましたか?", "体調は大丈夫ですか?"],
      wordGame: "🎮 しりとり",
      bible: "📖 聖書",
      schedule: "📅 予定",
      speaking: "話しています...",
      thinking: "考えています...",
      listening: "聞いています...話してください",
      aiCompanion: "AI孫娘",
      start: "スタート",
      back: "戻る",
      send: "送信",
      home: "ホーム",
      chat: "チャット",
      safety: "安全",
      camera: "カメラ",
      mic: "話す",
      speaker: "聞く",
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
    console.log(`[i18n] localStorage ello-language = "${code}"`);
    if (code) {
      const lang = getLang(code);
      console.log(`[i18n] Loaded language: ${lang.name} (${lang.code}), charName=${lang.charName}`);
      return lang;
    }
  } catch {}
  console.log("[i18n] No saved language, defaulting to Korean");
  return LANGUAGES[0];
}

export function saveLang(code: LangCode) {
  try {
    localStorage.setItem("ello-language", code);
    console.log(`[i18n] Saved language: ${code}`);
  } catch {}
}
