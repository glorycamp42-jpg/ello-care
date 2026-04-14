"use client";

interface GardenSceneProps {
  stage: number; // 1-5
  size?: number;
}

/**
 * Animated garden scene SVG that reflects the user's happiness garden progress.
 * Stage 1: seed · 2: sprout · 3: bud · 4: full bloom · 5: fruit harvest
 */
export default function GardenScene({ stage, size = 280 }: GardenSceneProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse at 50% 30%, #FFF8DC 0%, #FFE5B4 40%, #FFCAB1 80%, #FFB380 100%)",
        boxShadow:
          "0 20px 50px rgba(109, 76, 65, 0.25), 0 10px 20px rgba(255, 112, 67, 0.15), inset 0 -15px 30px rgba(255, 183, 77, 0.2)",
        position: "relative",
        overflow: "hidden",
        margin: "0 auto",
      }}
    >
      <style jsx>{`
        .stage-group { opacity: 0; transition: opacity 1s ease; }
        .stage-group.active { opacity: 1; }

        .seed-group {
          transform-origin: 210px 330px;
          animation: seedWobble 3s ease-in-out infinite;
        }
        @keyframes seedWobble {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(-2px); }
        }

        .stem-path {
          fill: none;
          stroke-linecap: round;
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
        }
        .active .stem-path {
          animation: grow 2.2s ease-out forwards;
        }
        @keyframes grow { to { stroke-dashoffset: 0; } }

        .leaf-animated {
          opacity: 0;
          transform-origin: var(--ox) var(--oy);
        }
        .active .leaf-animated {
          animation: leafGrow 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: var(--delay, 1s);
        }
        @keyframes leafGrow {
          0% { opacity: 0; transform: scale(0) rotate(var(--rot, 0deg)); }
          100% { opacity: 1; transform: scale(1) rotate(var(--rot, 0deg)); }
        }

        .leaf-sway {
          transform-origin: var(--ox, 210px) var(--oy, 280px);
          animation: leafSway 4s ease-in-out infinite;
        }
        @keyframes leafSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }

        .bud-group {
          opacity: 0;
          transform-origin: 210px 130px;
        }
        .active .bud-group {
          animation: budAppear 1s ease-out 1.5s forwards, budPulse 2.5s ease-in-out 2.5s infinite;
        }
        @keyframes budAppear {
          from { opacity: 0; transform: scale(0) rotate(-30deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes budPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        .petal-group {
          opacity: 0;
          transform-origin: 210px 140px;
        }
        .active .petal-group.pet1 { animation: bloomPetal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards; }
        .active .petal-group.pet2 { animation: bloomPetal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards; }
        .active .petal-group.pet3 { animation: bloomPetal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s forwards; }
        .active .petal-group.pet4 { animation: bloomPetal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s forwards; }
        .active .petal-group.pet5 { animation: bloomPetal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 1.1s forwards; }
        .active .petal-group.pet6 { animation: bloomPetal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 1.3s forwards; }
        @keyframes bloomPetal {
          0% { opacity: 0; transform: scale(0) rotate(-180deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .flower-wrapper {
          transform-origin: 210px 140px;
          animation: flowerSway 5s ease-in-out infinite;
        }
        @keyframes flowerSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }

        .flower-center-group {
          opacity: 0;
          transform-origin: 210px 140px;
        }
        .active .flower-center-group {
          animation: centerAppear 0.8s ease-out 1.8s forwards;
        }
        @keyframes centerAppear {
          0% { opacity: 0; transform: scale(0); }
          100% { opacity: 1; transform: scale(1); }
        }

        .fruit-item {
          opacity: 0;
          transform-origin: center;
        }
        .active .fruit-item.f1 { animation: fruitDrop 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards, fruitSway 4s ease-in-out 2s infinite; }
        .active .fruit-item.f2 { animation: fruitDrop 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s forwards, fruitSway 4.5s ease-in-out 2s infinite; }
        .active .fruit-item.f3 { animation: fruitDrop 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 1.1s forwards, fruitSway 3.8s ease-in-out 2s infinite; }
        @keyframes fruitDrop {
          0% { opacity: 0; transform: translateY(-30px) scale(0) rotate(-30deg); }
          70% { opacity: 1; transform: translateY(5px) scale(1.15) rotate(5deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes fruitSway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }

        .butterfly { opacity: 0; }
        .active .butterfly {
          opacity: 1;
          animation: flyAround 8s linear infinite;
        }
        @keyframes flyAround {
          0% { transform: translate(-50px, 0) rotate(0); }
          25% { transform: translate(100px, -80px) rotate(20deg); }
          50% { transform: translate(200px, 20px) rotate(-10deg); }
          75% { transform: translate(100px, 100px) rotate(15deg); }
          100% { transform: translate(-50px, 0) rotate(0); }
        }
        .wing-left, .wing-right {
          transform-origin: center;
          animation: wingFlap 0.2s ease-in-out infinite alternate;
        }
        @keyframes wingFlap {
          from { transform: scaleX(1); }
          to { transform: scaleX(0.6); }
        }

        .sparkle-star {
          opacity: 0;
          transform-origin: center;
        }
        .active .sparkle-star {
          animation: twinkle 2s ease-in-out infinite;
        }
        .active .sparkle-star.s2 { animation-delay: 0.4s; }
        .active .sparkle-star.s3 { animation-delay: 0.8s; }
        .active .sparkle-star.s4 { animation-delay: 1.2s; }
        .active .sparkle-star.s5 { animation-delay: 1.6s; }
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }

        .pollen {
          fill: #FFD54F;
          opacity: 0;
        }
        .active .pollen {
          animation: pollenFloat 3s ease-in-out infinite;
        }
        .active .pollen.p2 { animation-delay: 0.8s; }
        .active .pollen.p3 { animation-delay: 1.6s; }
        @keyframes pollenFloat {
          0% { opacity: 0; transform: translate(0, 0); }
          50% { opacity: 1; transform: translate(10px, -40px); }
          100% { opacity: 0; transform: translate(20px, -80px); }
        }

        .sun-rays {
          transform-origin: 340px 90px;
          animation: sunRotate 30s linear infinite;
        }
        @keyframes sunRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sun-glow {
          animation: sunPulse 4s ease-in-out infinite;
          transform-origin: 340px 90px;
        }
        @keyframes sunPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }

        .cloud {
          animation: cloudDrift 20s linear infinite;
        }
        @keyframes cloudDrift {
          0% { transform: translateX(-50px); }
          100% { transform: translateX(50px); }
        }
      `}</style>

      <svg
        viewBox="0 0 420 420"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <radialGradient id="gs-sunGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFF59D" />
            <stop offset="60%" stopColor="#FFD54F" />
            <stop offset="100%" stopColor="#FFA726" />
          </radialGradient>
          <linearGradient id="gs-soilGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5D4037" />
            <stop offset="60%" stopColor="#3E2723" />
            <stop offset="100%" stopColor="#2D1B14" />
          </linearGradient>
          <radialGradient id="gs-stemGradient" cx="50%" cy="0">
            <stop offset="0%" stopColor="#9CCC65" />
            <stop offset="100%" stopColor="#558B2F" />
          </radialGradient>
          <radialGradient id="gs-leafGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#AED581" />
            <stop offset="50%" stopColor="#81C784" />
            <stop offset="100%" stopColor="#388E3C" />
          </radialGradient>
          <radialGradient id="gs-petalPink" cx="40%" cy="20%">
            <stop offset="0%" stopColor="#FFE4F1" />
            <stop offset="40%" stopColor="#F8BBD0" />
            <stop offset="80%" stopColor="#F06292" />
            <stop offset="100%" stopColor="#C2185B" />
          </radialGradient>
          <radialGradient id="gs-budGradient" cx="40%" cy="30%">
            <stop offset="0%" stopColor="#FCE4EC" />
            <stop offset="50%" stopColor="#F48FB1" />
            <stop offset="100%" stopColor="#C2185B" />
          </radialGradient>
          <radialGradient id="gs-centerGradient" cx="40%" cy="30%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="70%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#F57C00" />
          </radialGradient>
          <radialGradient id="gs-appleGradient" cx="30%" cy="25%">
            <stop offset="0%" stopColor="#FFCDD2" />
            <stop offset="30%" stopColor="#EF5350" />
            <stop offset="80%" stopColor="#C62828" />
            <stop offset="100%" stopColor="#7F0000" />
          </radialGradient>
          <radialGradient id="gs-seedGradient" cx="40%" cy="30%">
            <stop offset="0%" stopColor="#6D4C41" />
            <stop offset="80%" stopColor="#3E2723" />
            <stop offset="100%" stopColor="#1B0000" />
          </radialGradient>

          <filter id="gs-softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="3" result="offsetBlur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="gs-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="glowBlur" />
            <feMerge>
              <feMergeNode in="glowBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sun */}
        <g className="sun-glow">
          <circle cx="340" cy="90" r="55" fill="url(#gs-sunGradient)" opacity="0.3" />
        </g>
        <g className="sun-rays">
          <g stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" opacity="0.6">
            <line x1="340" y1="30" x2="340" y2="45" />
            <line x1="340" y1="135" x2="340" y2="150" />
            <line x1="280" y1="90" x2="295" y2="90" />
            <line x1="385" y1="90" x2="400" y2="90" />
            <line x1="298" y1="48" x2="308" y2="58" />
            <line x1="372" y1="122" x2="382" y2="132" />
            <line x1="298" y1="132" x2="308" y2="122" />
            <line x1="372" y1="58" x2="382" y2="48" />
          </g>
        </g>
        <circle cx="340" cy="90" r="28" fill="url(#gs-sunGradient)" filter="url(#gs-glow)" />

        {/* Clouds */}
        <g className="cloud" opacity="0.7">
          <ellipse cx="100" cy="70" rx="35" ry="12" fill="white" />
          <ellipse cx="115" cy="65" rx="25" ry="15" fill="white" />
          <ellipse cx="85" cy="65" rx="22" ry="13" fill="white" />
        </g>
        <g className="cloud" style={{ animationDelay: "-10s", animationDuration: "30s" }} opacity="0.5">
          <ellipse cx="260" cy="45" rx="28" ry="10" fill="white" />
          <ellipse cx="275" cy="42" rx="20" ry="11" fill="white" />
        </g>

        {/* Ground */}
        <ellipse cx="210" cy="380" rx="220" ry="40" fill="url(#gs-soilGradient)" />
        <ellipse cx="210" cy="340" rx="90" ry="18" fill="#4E342E" opacity="0.8" />
        <circle cx="180" cy="345" r="2" fill="#2D1B14" />
        <circle cx="240" cy="342" r="1.5" fill="#2D1B14" />
        <circle cx="200" cy="348" r="1.5" fill="#1B0000" />
        <circle cx="225" cy="340" r="1" fill="#2D1B14" />

        {/* Grass tufts */}
        <g opacity="0.6">
          <path d="M 60 340 Q 58 330 55 325 M 63 340 Q 65 332 68 328" stroke="#558B2F" strokeWidth="1.5" fill="none" />
          <path d="M 360 345 Q 358 335 355 330 M 363 345 Q 365 337 368 333" stroke="#558B2F" strokeWidth="1.5" fill="none" />
          <path d="M 100 350 Q 98 342 95 338" stroke="#558B2F" strokeWidth="1.5" fill="none" />
          <path d="M 320 350 Q 322 342 325 338" stroke="#558B2F" strokeWidth="1.5" fill="none" />
        </g>

        {/* STAGE 1: SEED */}
        <g className={`stage-group ${stage === 1 ? "active" : ""}`}>
          <g className="seed-group" filter="url(#gs-softShadow)">
            <ellipse cx="210" cy="330" rx="16" ry="22" fill="url(#gs-seedGradient)" />
            <ellipse cx="205" cy="322" rx="5" ry="8" fill="#8D6E63" opacity="0.6" />
            <path d="M 210 308 Q 210 302 212 300" stroke="#8D6E63" strokeWidth="1" fill="none" />
          </g>
          <path d="M 210 310 Q 212 306 211 302" stroke="#9CCC65" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* STAGE 2: SPROUT */}
        <g className={`stage-group ${stage === 2 ? "active" : ""}`}>
          <ellipse cx="210" cy="335" rx="10" ry="8" fill="url(#gs-seedGradient)" opacity="0.7" />
          <path className="stem-path" d="M 210 335 Q 208 290 210 260" stroke="url(#gs-stemGradient)" strokeWidth="5" />
          <g className="leaf-sway" style={{ ["--ox" as string]: "210px", ["--oy" as string]: "290px" }}>
            <g className="leaf-animated" style={{ ["--ox" as string]: "195px", ["--oy" as string]: "290px", ["--rot" as string]: "-25deg", ["--delay" as string]: "1s" }}>
              <path d="M 210 290 Q 175 285 170 270 Q 175 285 195 295 Q 210 295 210 290" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <path d="M 210 290 Q 190 288 178 278" stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6" />
            </g>
            <g className="leaf-animated" style={{ ["--ox" as string]: "225px", ["--oy" as string]: "290px", ["--rot" as string]: "25deg", ["--delay" as string]: "1.3s" }}>
              <path d="M 210 290 Q 245 285 250 270 Q 245 285 225 295 Q 210 295 210 290" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <path d="M 210 290 Q 230 288 242 278" stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6" />
            </g>
            <ellipse cx="210" cy="260" rx="4" ry="8" fill="url(#gs-leafGradient)" />
          </g>
        </g>

        {/* STAGE 3: BUD */}
        <g className={`stage-group ${stage === 3 ? "active" : ""}`}>
          <ellipse cx="210" cy="335" rx="8" ry="6" fill="url(#gs-seedGradient)" opacity="0.6" />
          <path className="stem-path" d="M 210 335 Q 205 250 210 150" stroke="url(#gs-stemGradient)" strokeWidth="5" />
          <g className="leaf-sway" style={{ ["--ox" as string]: "210px", ["--oy" as string]: "280px", animationDuration: "5s" }}>
            <g className="leaf-animated" style={{ ["--ox" as string]: "190px", ["--oy" as string]: "280px", ["--rot" as string]: "-30deg", ["--delay" as string]: "1s" }}>
              <path d="M 210 280 Q 165 275 155 255 Q 165 275 190 288 Q 210 285 210 280" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <path d="M 210 280 Q 190 278 168 266" stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6" />
            </g>
            <g className="leaf-animated" style={{ ["--ox" as string]: "230px", ["--oy" as string]: "280px", ["--rot" as string]: "30deg", ["--delay" as string]: "1.2s" }}>
              <path d="M 210 280 Q 255 275 265 255 Q 255 275 230 288 Q 210 285 210 280" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <path d="M 210 280 Q 230 278 252 266" stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6" />
            </g>
            <g className="leaf-animated" style={{ ["--ox" as string]: "192px", ["--oy" as string]: "230px", ["--rot" as string]: "-35deg", ["--delay" as string]: "1.5s" }}>
              <path d="M 210 230 Q 178 225 172 208 Q 180 222 192 238 Q 210 235 210 230" fill="url(#gs-leafGradient)" />
            </g>
            <g className="leaf-animated" style={{ ["--ox" as string]: "228px", ["--oy" as string]: "230px", ["--rot" as string]: "35deg", ["--delay" as string]: "1.7s" }}>
              <path d="M 210 230 Q 242 225 248 208 Q 240 222 228 238 Q 210 235 210 230" fill="url(#gs-leafGradient)" />
            </g>
          </g>
          <g className="bud-group" filter="url(#gs-softShadow)">
            <path d="M 195 160 Q 200 145 210 140 Q 220 145 225 160 Q 220 155 210 158 Q 200 155 195 160 Z" fill="#66BB6A" />
            <ellipse cx="210" cy="140" rx="14" ry="22" fill="url(#gs-budGradient)" />
            <ellipse cx="206" cy="132" rx="5" ry="8" fill="rgba(255, 255, 255, 0.4)" />
            <path d="M 205 125 Q 210 130 215 125" stroke="#AD1457" strokeWidth="1" fill="none" opacity="0.5" />
            <path d="M 202 140 Q 210 142 218 140" stroke="#AD1457" strokeWidth="1" fill="none" opacity="0.5" />
          </g>
        </g>

        {/* STAGE 4: FULL BLOOM */}
        <g className={`stage-group ${stage === 4 ? "active" : ""}`}>
          <ellipse cx="210" cy="335" rx="8" ry="6" fill="url(#gs-seedGradient)" opacity="0.4" />
          <path d="M 210 335 Q 205 250 210 150" stroke="url(#gs-stemGradient)" strokeWidth="5" fill="none" />
          <g className="leaf-sway" style={{ ["--ox" as string]: "210px", ["--oy" as string]: "280px", animationDuration: "5s" }}>
            <g>
              <path d="M 210 280 Q 165 275 155 255 Q 165 275 190 288 Q 210 285 210 280" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <path d="M 210 280 Q 190 278 168 266" stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6" />
            </g>
            <g>
              <path d="M 210 280 Q 255 275 265 255 Q 255 275 230 288 Q 210 285 210 280" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <path d="M 210 280 Q 230 278 252 266" stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6" />
            </g>
            <g>
              <path d="M 210 230 Q 178 225 172 208 Q 180 222 192 238 Q 210 235 210 230" fill="url(#gs-leafGradient)" />
            </g>
            <g>
              <path d="M 210 230 Q 242 225 248 208 Q 240 222 228 238 Q 210 235 210 230" fill="url(#gs-leafGradient)" />
            </g>
          </g>
          <g className="flower-wrapper" filter="url(#gs-softShadow)">
            <g className="petal-group pet1" style={{ transformOrigin: "210px 140px" }}>
              <ellipse cx="210" cy="105" rx="22" ry="36" fill="url(#gs-petalPink)" />
            </g>
            <g className="petal-group pet2" style={{ transformOrigin: "210px 140px" }}>
              <ellipse cx="240" cy="120" rx="22" ry="36" fill="url(#gs-petalPink)" transform="rotate(60 240 120)" />
            </g>
            <g className="petal-group pet3" style={{ transformOrigin: "210px 140px" }}>
              <ellipse cx="240" cy="160" rx="22" ry="36" fill="url(#gs-petalPink)" transform="rotate(120 240 160)" />
            </g>
            <g className="petal-group pet4" style={{ transformOrigin: "210px 140px" }}>
              <ellipse cx="210" cy="175" rx="22" ry="36" fill="url(#gs-petalPink)" transform="rotate(180 210 175)" />
            </g>
            <g className="petal-group pet5" style={{ transformOrigin: "210px 140px" }}>
              <ellipse cx="180" cy="160" rx="22" ry="36" fill="url(#gs-petalPink)" transform="rotate(240 180 160)" />
            </g>
            <g className="petal-group pet6" style={{ transformOrigin: "210px 140px" }}>
              <ellipse cx="180" cy="120" rx="22" ry="36" fill="url(#gs-petalPink)" transform="rotate(300 180 120)" />
            </g>
            <g className="flower-center-group">
              <circle cx="210" cy="140" r="18" fill="url(#gs-centerGradient)" />
              <circle cx="203" cy="133" r="2" fill="#F57C00" />
              <circle cx="217" cy="135" r="2" fill="#F57C00" />
              <circle cx="210" cy="147" r="2" fill="#F57C00" />
              <circle cx="204" cy="145" r="1.5" fill="#E65100" />
              <circle cx="215" cy="143" r="1.5" fill="#E65100" />
              <circle cx="212" cy="133" r="1" fill="#FFF59D" />
            </g>
          </g>
          <circle className="pollen p1" cx="230" cy="140" r="2" />
          <circle className="pollen p2" cx="240" cy="135" r="1.5" />
          <circle className="pollen p3" cx="185" cy="145" r="2" />
          <g className="sparkle-star s1" style={{ transform: "translate(80px, 120px)" }}>
            <path d="M 0 -6 L 2 -2 L 6 0 L 2 2 L 0 6 L -2 2 L -6 0 L -2 -2 Z" fill="#FFF59D" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s2" style={{ transform: "translate(320px, 100px)" }}>
            <path d="M 0 -8 L 2.5 -2.5 L 8 0 L 2.5 2.5 L 0 8 L -2.5 2.5 L -8 0 L -2.5 -2.5 Z" fill="#FFF59D" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s3" style={{ transform: "translate(90px, 200px)" }}>
            <path d="M 0 -5 L 1.5 -1.5 L 5 0 L 1.5 1.5 L 0 5 L -1.5 1.5 L -5 0 L -1.5 -1.5 Z" fill="#FFF59D" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s4" style={{ transform: "translate(330px, 210px)" }}>
            <path d="M 0 -6 L 2 -2 L 6 0 L 2 2 L 0 6 L -2 2 L -6 0 L -2 -2 Z" fill="#FFF59D" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s5" style={{ transform: "translate(280px, 60px)" }}>
            <path d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#FFF59D" filter="url(#gs-glow)" />
          </g>
          <g className="butterfly" style={{ transform: "translate(100px, 100px)" }}>
            <g>
              <ellipse className="wing-left" cx="-8" cy="0" rx="10" ry="14" fill="#CE93D8" opacity="0.85" />
              <ellipse className="wing-left" cx="-6" cy="10" rx="7" ry="9" fill="#F48FB1" opacity="0.85" />
              <ellipse className="wing-right" cx="8" cy="0" rx="10" ry="14" fill="#CE93D8" opacity="0.85" />
              <ellipse className="wing-right" cx="6" cy="10" rx="7" ry="9" fill="#F48FB1" opacity="0.85" />
              <ellipse cx="0" cy="0" rx="1.5" ry="10" fill="#4A148C" />
              <circle cx="-1" cy="-10" r="1.5" fill="#4A148C" />
              <circle cx="1" cy="-10" r="1.5" fill="#4A148C" />
            </g>
          </g>
        </g>

        {/* STAGE 5: FRUIT HARVEST */}
        <g className={`stage-group ${stage === 5 ? "active" : ""}`}>
          <ellipse cx="210" cy="335" rx="8" ry="6" fill="url(#gs-seedGradient)" opacity="0.4" />
          <path d="M 210 335 Q 205 250 210 150" stroke="url(#gs-stemGradient)" strokeWidth="5" fill="none" />
          <g className="leaf-sway" style={{ ["--ox" as string]: "210px", ["--oy" as string]: "250px" }}>
            <g>
              <path d="M 210 280 Q 165 275 155 255 Q 165 275 190 288 Q 210 285 210 280" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
            </g>
            <g>
              <path d="M 210 280 Q 255 275 265 255 Q 255 275 230 288 Q 210 285 210 280" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
            </g>
            <g>
              <path d="M 210 230 Q 178 225 172 208 Q 180 222 192 238 Q 210 235 210 230" fill="url(#gs-leafGradient)" />
            </g>
            <g>
              <path d="M 210 230 Q 242 225 248 208 Q 240 222 228 238 Q 210 235 210 230" fill="url(#gs-leafGradient)" />
            </g>
            <g>
              <ellipse cx="210" cy="170" rx="55" ry="30" fill="url(#gs-leafGradient)" filter="url(#gs-softShadow)" />
              <ellipse cx="185" cy="165" rx="25" ry="22" fill="url(#gs-leafGradient)" />
              <ellipse cx="235" cy="170" rx="25" ry="22" fill="url(#gs-leafGradient)" />
              <ellipse cx="210" cy="150" rx="25" ry="18" fill="url(#gs-leafGradient)" />
            </g>
          </g>
          <g className="fruit-item f1" style={{ transformOrigin: "210px 145px" }}>
            <ellipse cx="210" cy="145" rx="22" ry="24" fill="url(#gs-appleGradient)" filter="url(#gs-softShadow)" />
            <ellipse cx="200" cy="135" rx="7" ry="10" fill="rgba(255, 255, 255, 0.5)" />
            <path d="M 210 125 Q 212 118 216 120" stroke="#4E342E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <ellipse cx="218" cy="122" rx="7" ry="4" fill="#66BB6A" transform="rotate(40 218 122)" />
            <path d="M 218 121 Q 221 119 222 123" stroke="#388E3C" strokeWidth="1" fill="none" opacity="0.8" />
          </g>
          <g className="fruit-item f2" style={{ transformOrigin: "170px 175px" }}>
            <ellipse cx="170" cy="175" rx="18" ry="20" fill="url(#gs-appleGradient)" filter="url(#gs-softShadow)" />
            <ellipse cx="162" cy="167" rx="5" ry="8" fill="rgba(255, 255, 255, 0.5)" />
            <path d="M 170 158 Q 172 152 175 154" stroke="#4E342E" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
          <g className="fruit-item f3" style={{ transformOrigin: "250px 175px" }}>
            <ellipse cx="250" cy="175" rx="18" ry="20" fill="url(#gs-appleGradient)" filter="url(#gs-softShadow)" />
            <ellipse cx="242" cy="167" rx="5" ry="8" fill="rgba(255, 255, 255, 0.5)" />
            <path d="M 250 158 Q 252 152 255 154" stroke="#4E342E" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
          <g className="sparkle-star s1" style={{ transform: "translate(70px, 130px)" }}>
            <path d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill="#FFD700" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s2" style={{ transform: "translate(340px, 110px)" }}>
            <path d="M 0 -9 L 3 -3 L 9 0 L 3 3 L 0 9 L -3 3 L -9 0 L -3 -3 Z" fill="#FFD700" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s3" style={{ transform: "translate(85px, 220px)" }}>
            <path d="M 0 -5 L 1.5 -1.5 L 5 0 L 1.5 1.5 L 0 5 L -1.5 1.5 L -5 0 L -1.5 -1.5 Z" fill="#FFD700" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s4" style={{ transform: "translate(340px, 220px)" }}>
            <path d="M 0 -6 L 2 -2 L 6 0 L 2 2 L 0 6 L -2 2 L -6 0 L -2 -2 Z" fill="#FFD700" filter="url(#gs-glow)" />
          </g>
          <g className="sparkle-star s5" style={{ transform: "translate(210px, 80px)" }}>
            <path d="M 0 -8 L 2.5 -2.5 L 8 0 L 2.5 2.5 L 0 8 L -2.5 2.5 L -8 0 L -2.5 -2.5 Z" fill="#FFD700" filter="url(#gs-glow)" />
          </g>
          <g className="butterfly" style={{ transform: "translate(120px, 80px)", animationDuration: "10s" }}>
            <g>
              <ellipse className="wing-left" cx="-8" cy="0" rx="10" ry="14" fill="#FFAB91" opacity="0.9" />
              <ellipse className="wing-left" cx="-6" cy="10" rx="7" ry="9" fill="#FFCC80" opacity="0.9" />
              <ellipse className="wing-right" cx="8" cy="0" rx="10" ry="14" fill="#FFAB91" opacity="0.9" />
              <ellipse className="wing-right" cx="6" cy="10" rx="7" ry="9" fill="#FFCC80" opacity="0.9" />
              <ellipse cx="0" cy="0" rx="1.5" ry="10" fill="#4A148C" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
