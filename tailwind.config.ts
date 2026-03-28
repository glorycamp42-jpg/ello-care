import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: "#FF6B35",
        "coral-dark": "#E55A2B",
        "coral-light": "#FF8B5E",
        "coral-pastel": "#FFE6D9",
        cream: "#FFF8EE",
        "cream-dark": "#FFF0E0",
        "warm-white": "#FFFBF7",
        "warm-gray": "#5C4F48",
        "warm-gray-light": "#A89B94",
        "warm-brown": "#3D3530",
      },
      fontFamily: {
        korean: ['"Noto Sans KR"', "sans-serif"],
      },
      maxWidth: {
        app: "390px",
      },
    },
  },
  plugins: [],
};
export default config;
