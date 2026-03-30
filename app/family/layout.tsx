"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const TABS = [
  { name: "홈", emoji: "🏠", href: "/family" },
  { name: "위치", emoji: "📍", href: "/family/location" },
  { name: "일정", emoji: "📅", href: "/family/appointments" },
  { name: "설정", emoji: "⚙️", href: "/family/settings" },
];

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Override manifest + theme-color for Family PWA
  useEffect(() => {
    // Swap manifest
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) existingManifest.setAttribute("href", "/manifest-family.json");

    // Swap theme-color
    const existingTheme = document.querySelector('meta[name="theme-color"]');
    if (existingTheme) existingTheme.setAttribute("content", "#1B6FE8");

    // Swap apple-touch-icon
    const existingIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (existingIcon) existingIcon.setAttribute("href", "/icon-family.svg");

    return () => {
      // Restore on unmount
      if (existingManifest) existingManifest.setAttribute("href", "/manifest.json");
      if (existingTheme) existingTheme.setAttribute("content", "#1B6FE8");
      if (existingIcon) existingIcon.setAttribute("href", "/icon-192x192.png");
    };
  }, []);

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-[#F0F7FF] relative">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
                       bg-white border-t border-blue-100 px-4 pt-2 pb-5
                       shadow-[0_-2px_16px_rgba(27,111,232,0.06)]">
        <div className="flex items-center justify-around">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 min-w-[60px] py-1 rounded-xl transition-all
                  ${isActive
                    ? "text-[#1B6FE8]"
                    : "text-gray-400 hover:text-gray-500"
                  }`}
              >
                <span className={`text-[20px] transition-transform ${isActive ? "scale-110" : ""}`}>
                  {tab.emoji}
                </span>
                <span className={`text-[10px] ${isActive ? "font-bold text-[#1B6FE8]" : "font-medium"}`}>
                  {tab.name}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#1B6FE8] -mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
