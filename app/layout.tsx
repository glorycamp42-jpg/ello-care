import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ello Care - 소연이와 함께",
  description: "한국계 미국인 어르신을 위한 AI 말벗 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-korean antialiased">{children}</body>
    </html>
  );
}
