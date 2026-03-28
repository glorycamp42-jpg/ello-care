"use client";

interface TicketToastProps {
  points: number;
  label: string;
}

export default function TicketToast({ points, label }: TicketToastProps) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="bg-white rounded-2xl shadow-lg shadow-coral/15 px-5 py-3 flex items-center gap-2.5 border border-coral/10">
        <span className="text-2xl">&#x1F31F;</span>
        <div>
          <span className="text-coral font-bold text-base">+{points} 행복티켓!</span>
          <span className="text-warm-gray-light text-[12px] ml-1.5">{label}</span>
        </div>
      </div>
    </div>
  );
}
