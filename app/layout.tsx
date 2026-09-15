import type { Metadata } from "next";
import "./globals.css";
import MedicationAlarm from "@/components/MedicationAlarm";
import ServiceWorker from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Ello Care - 엘로와 함께",
  description: "어르신의 하루를 챙기는 AI 비서 엘로",
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFF8EE" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ello Care" />
      </head>
      <body className="font-korean antialiased">
        <ServiceWorker />
        <MedicationAlarm />
        {children}
      </body>
    </html>
  );
}
