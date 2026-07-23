"use client";

// A self-contained, animated night scene: a boy studying under a flickering
// street lamp. Pure SVG + CSS/SMIL — no external assets, so it ships fine on
// Cloudflare Workers. Sits over the login page's dark brand panel.

const STARS = [
  { x: 40, y: 60, r: 1.4, d: "0s" },
  { x: 90, y: 30, r: 1, d: "1.1s" },
  { x: 140, y: 70, r: 1.6, d: "0.4s" },
  { x: 210, y: 40, r: 1, d: "2s" },
  { x: 260, y: 90, r: 1.3, d: "0.8s" },
  { x: 300, y: 45, r: 1, d: "1.6s" },
  { x: 360, y: 70, r: 1.5, d: "0.2s" },
  { x: 70, y: 120, r: 1, d: "2.4s" },
  { x: 240, y: 140, r: 1.2, d: "1.3s" },
  { x: 380, y: 150, r: 1, d: "0.6s" },
  { x: 20, y: 180, r: 1.1, d: "1.9s" },
  { x: 120, y: 20, r: 1, d: "0.9s" },
];

export function StudyScene() {
  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <svg
        viewBox="0 0 400 520"
        className="w-full h-auto"
        role="img"
        aria-label="A student reading a book at night under a glowing street lamp"
      >
        <defs>
          <radialGradient id="ss-moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdf6e3" />
            <stop offset="100%" stopColor="#cdd3f0" />
          </radialGradient>
          <radialGradient id="ss-moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdf6e3" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fdf6e3" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ss-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffdf9e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffdf9e" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ss-bulb" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#fff6d0" />
            <stop offset="55%" stopColor="#ffcf6b" />
            <stop offset="100%" stopColor="#e8912f" />
          </radialGradient>
          <radialGradient id="ss-pool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffdf9e" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffdf9e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* moon */}
        <circle cx="320" cy="92" r="52" fill="url(#ss-moonGlow)" className="ss-glow" />
        <circle cx="320" cy="92" r="28" fill="url(#ss-moon)" />
        <circle cx="331" cy="84" r="5" fill="#c3cbec" opacity="0.6" />
        <circle cx="312" cy="100" r="3.5" fill="#c3cbec" opacity="0.5" />
        <circle cx="326" cy="103" r="2.5" fill="#c3cbec" opacity="0.5" />

        {/* stars */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#ffffff"
            className="ss-twinkle"
            style={{ animationDelay: s.d }}
          />
        ))}

        {/* ground */}
        <path d="M0 452 L400 452 L400 520 L0 520 Z" fill="#0d0b24" opacity="0.85" />
        <line x1="0" y1="452" x2="400" y2="452" stroke="#2a2650" strokeWidth="1.5" opacity="0.6" />
        {/* warm light pool on the ground */}
        <ellipse cx="176" cy="452" rx="104" ry="16" fill="url(#ss-pool)" className="ss-flicker" />

        {/* light cone from the lamp */}
        <polygon points="188,116 118,452 258,452" fill="url(#ss-cone)" className="ss-flicker" />

        {/* lamp post */}
        <path
          d="M270 452 L270 100 C270 66 236 60 200 74 C193 77 189 82 188 90"
          fill="none"
          stroke="#2b2850"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <rect x="258" y="446" width="24" height="8" rx="2" fill="#241f45" />
        {/* lantern */}
        <path d="M176 92 L200 92 L206 116 L170 116 Z" fill="#221d40" />
        <path d="M180 84 L196 84 L200 92 L176 92 Z" fill="#2b2650" />
        <ellipse cx="188" cy="106" rx="11" ry="12" fill="url(#ss-bulb)" className="ss-flicker" />
        <path d="M170 116 L206 116 L204 121 L172 121 Z" fill="#2b2650" />

        {/* moths orbiting the lamp */}
        <g>
          <circle cx="212" cy="104" r="1.8" fill="#ffe9a8" opacity="0.9" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 188 104"
            to="360 188 104"
            dur="7s"
            repeatCount="indefinite"
          />
        </g>
        <g>
          <circle cx="166" cy="108" r="1.4" fill="#ffe9a8" opacity="0.8" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 188 104"
            to="0 188 104"
            dur="5s"
            repeatCount="indefinite"
          />
        </g>

        {/* the boy, in side profile, reading — gently bobbing.
            He faces the lamp (upper right) so face + book catch the warm light. */}
        <g className="ss-read">
          {/* soft contact shadow on the ground */}
          <ellipse cx="162" cy="449" rx="50" ry="10" fill="#0e0b24" opacity="0.8" />

          {/* far foot tucked behind the crossed legs */}
          <ellipse cx="190" cy="438" rx="9" ry="4.5" fill="#16182f" />

          {/* crossed legs / lap */}
          <path
            d="M134 420 C130 434 144 441 163 441 C186 441 200 435 196 425 C193 419 183 418 172 419 C158 421 146 417 134 420 Z"
            fill="#262a52"
          />
          <path
            d="M140 424 C155 431 178 431 190 425"
            fill="none"
            stroke="#3a3f6e"
            strokeWidth="1.5"
            opacity="0.5"
          />
          {/* near foot poking out at the front */}
          <path
            d="M130 434 C126 433 124 438 128 440 C133 442 140 440 140 437 C140 434 135 434 130 434 Z"
            fill="#16182f"
          />

          {/* torso, hunched forward over the book */}
          <path
            d="M147 383 C138 393 137 408 146 420 C157 424 173 423 177 413 C182 402 178 389 169 385 C162 382 153 382 147 383 Z"
            fill="#c26a3c"
          />
          {/* warm highlight down the lamp-facing side of the back */}
          <path
            d="M168 386 C174 391 177 399 176 408"
            fill="none"
            stroke="#e0965a"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* neck */}
          <path d="M151 373 L162 373 L163 385 L150 385 Z" fill="#e0ac7e" />

          {/* ear */}
          <circle cx="147" cy="360" r="3" fill="#d49b6a" />
          <path d="M146 358 C149 359 149 362 146 363" fill="none" stroke="#b07d54" strokeWidth="1" />

          {/* head (skin) with a profile nose */}
          <circle cx="150" cy="358" r="15" fill="#e0ac7e" />
          <path d="M164 353 C169 356 169 360 164 362 Z" fill="#e0ac7e" />

          {/* hair — caps the top and back, leaves the face exposed */}
          <path
            d="M135 359 C132 344 150 335 163 346 C166 349 165 353 162 352 C156 344 145 346 141 355 C139 361 141 368 145 372 C139 371 136 366 135 359 Z"
            fill="#201a38"
          />
          <path d="M158 348 C161 349 162 352 161 354 C159 351 156 350 154 351 C155 349 157 348 158 348 Z" fill="#201a38" />
          <path
            d="M140 351 C147 343 156 344 162 349"
            fill="none"
            stroke="#4c4576"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* face, eyes down on the page */}
          <path d="M156 354 C158 353 161 353 162 355" fill="none" stroke="#201a38" strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="159" cy="357" rx="1.6" ry="1.5" fill="#2a2033" />
          <path d="M160 365 C162 366 164 366 165 365" fill="none" stroke="#a5623c" strokeWidth="1.2" strokeLinecap="round" />

          {/* near arm reaching to hold the book */}
          <path d="M166 389 C177 391 185 397 189 405" fill="none" stroke="#c26a3c" strokeWidth="9" strokeLinecap="round" />
          <path d="M167 391 C176 393 183 398 187 405" fill="none" stroke="#e0965a" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <circle cx="190" cy="407" r="4.5" fill="#e0ac7e" />

          {/* open book, tented on the lap, tilted up to his eyes */}
          <polygon points="185,417 168,405 168,401 185,411" fill="#7c3a2c" />
          <polygon points="185,417 202,406 202,402 185,411" fill="#5f2b20" />
          <g className="ss-book">
            <polygon points="184,414 169,404 170,401 184,410" fill="#fdf3cf" />
            <polygon points="186,414 201,405 200,402 186,410" fill="#f4e7bb" />
            <line x1="185" y1="410" x2="185" y2="415" stroke="#d9c88f" strokeWidth="1.2" />
            <line x1="173" y1="406" x2="182" y2="408" stroke="#cdbb84" strokeWidth="0.8" />
            <line x1="172" y1="408" x2="181" y2="410" stroke="#cdbb84" strokeWidth="0.8" />
            <line x1="188" y1="408" x2="197" y2="406" stroke="#cdbb84" strokeWidth="0.8" />
            <line x1="188" y1="410" x2="196" y2="408" stroke="#cdbb84" strokeWidth="0.8" />
          </g>
        </g>

        {/* fireflies drifting near the boy */}
        <circle cx="120" cy="420" r="1.6" fill="#ffe9a8" className="ss-firefly" style={{ animationDelay: "0s" }} />
        <circle cx="230" cy="410" r="1.4" fill="#ffe9a8" className="ss-firefly" style={{ animationDelay: "1.5s" }} />
        <circle cx="210" cy="440" r="1.5" fill="#ffe9a8" className="ss-firefly" style={{ animationDelay: "3s" }} />
      </svg>

      <style>{`
        .ss-twinkle { animation: ss-twinkle 3s ease-in-out infinite; }
        .ss-flicker { animation: ss-flicker 4s linear infinite; }
        .ss-glow    { animation: ss-glow 5s ease-in-out infinite; }
        .ss-read    { animation: ss-read 5s ease-in-out infinite; transform-origin: 160px 441px; }
        .ss-book    { animation: ss-flicker 4s linear infinite; }
        .ss-firefly { animation: ss-firefly 6s ease-in-out infinite; }

        @keyframes ss-twinkle {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 1; }
        }
        @keyframes ss-flicker {
          0%, 100% { opacity: 0.9; }
          43%      { opacity: 1; }
          46%      { opacity: 0.6; }
          49%      { opacity: 1; }
          72%      { opacity: 0.82; }
          75%      { opacity: 1; }
        }
        @keyframes ss-glow {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 0.85; }
        }
        @keyframes ss-read {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-2px) rotate(-1deg); }
        }
        @keyframes ss-firefly {
          0%, 100% { opacity: 0; transform: translate(0, 0); }
          20%      { opacity: 1; }
          80%      { opacity: 1; }
          100%     { opacity: 0; transform: translate(-10px, -26px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ss-twinkle, .ss-flicker, .ss-glow, .ss-read, .ss-book, .ss-firefly {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
