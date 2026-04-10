/**
 * SVG building illustrations for the village scene.
 * Each building is a detailed inline SVG inspired by medieval pixel-art MMOs.
 * viewBox is 64x64 for consistent sizing.
 */

const SVG_PROPS = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 64 64", className: "building-art" } as const;

export function KeepArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main castle body */}
      <rect x="14" y="24" width="36" height="28" rx="1" fill="#5a5a6a" stroke="#3a3a4a" strokeWidth="1"/>
      {/* Gate */}
      <rect x="25" y="38" width="14" height="14" rx="2" fill="#2a1a0a"/>
      <rect x="27" y="40" width="10" height="12" rx="1" fill="#1a0f05"/>
      {/* Gate bars */}
      <line x1="29" y1="40" x2="29" y2="52" stroke="#4a3a2a" strokeWidth="0.8"/>
      <line x1="32" y1="40" x2="32" y2="52" stroke="#4a3a2a" strokeWidth="0.8"/>
      <line x1="35" y1="40" x2="35" y2="52" stroke="#4a3a2a" strokeWidth="0.8"/>
      {/* Left tower */}
      <rect x="8" y="14" width="14" height="38" rx="1" fill="#6a6a7a" stroke="#3a3a4a" strokeWidth="1"/>
      <polygon points="8,14 15,4 22,14" fill="#8a3030" stroke="#6a2020" strokeWidth="0.8"/>
      {/* Right tower */}
      <rect x="42" y="14" width="14" height="38" rx="1" fill="#6a6a7a" stroke="#3a3a4a" strokeWidth="1"/>
      <polygon points="42,14 49,4 56,14" fill="#8a3030" stroke="#6a2020" strokeWidth="0.8"/>
      {/* Battlements left */}
      {[8,12,16].map(x => <rect key={x} x={x} y="11" width="3" height="5" fill="#6a6a7a" stroke="#3a3a4a" strokeWidth="0.5"/>)}
      {/* Battlements right */}
      {[42,46,50].map(x => <rect key={x} x={x} y="11" width="3" height="5" fill="#6a6a7a" stroke="#3a3a4a" strokeWidth="0.5"/>)}
      {/* Battlements center */}
      {[16,20,24,28,32,36,40,44].map(x => <rect key={x} x={x} y="21" width="2.5" height="4" fill="#5a5a6a" stroke="#3a3a4a" strokeWidth="0.4"/>)}
      {/* Flags */}
      <line x1="15" y1="4" x2="15" y2="0" stroke="#4a3a2a" strokeWidth="0.8"/>
      <polygon points="15,0 22,2 15,4" fill="#d4a020" opacity="0.9"/>
      <line x1="49" y1="4" x2="49" y2="0" stroke="#4a3a2a" strokeWidth="0.8"/>
      <polygon points="49,0 56,2 49,4" fill="#d4a020" opacity="0.9"/>
      {/* Windows */}
      <rect x="11" y="22" width="3" height="4" rx="0.5" fill="#1a1a2a"/>
      <rect x="17" y="22" width="3" height="4" rx="0.5" fill="#1a1a2a"/>
      <rect x="45" y="22" width="3" height="4" rx="0.5" fill="#1a1a2a"/>
      <rect x="51" y="22" width="3" height="4" rx="0.5" fill="#1a1a2a"/>
    </svg>
  );
}

export function LumbermillArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Log pile */}
      <ellipse cx="12" cy="50" rx="8" ry="4" fill="#5a3a1a"/>
      <ellipse cx="12" cy="47" rx="7" ry="3.5" fill="#6a4a2a"/>
      <ellipse cx="12" cy="44" rx="6" ry="3" fill="#7a5a3a"/>
      {/* Main building */}
      <rect x="20" y="28" width="30" height="24" rx="1" fill="#8a6a3a" stroke="#5a4a2a" strokeWidth="1"/>
      {/* Roof */}
      <polygon points="16,28 35,12 54,28" fill="#6a3020" stroke="#4a2010" strokeWidth="0.8"/>
      {/* Door */}
      <rect x="31" y="40" width="8" height="12" rx="1" fill="#3a2a1a"/>
      {/* Window */}
      <rect x="24" y="34" width="5" height="5" rx="0.5" fill="#c0d8f0" stroke="#5a4a2a" strokeWidth="0.8"/>
      <line x1="26.5" y1="34" x2="26.5" y2="39" stroke="#5a4a2a" strokeWidth="0.5"/>
      <line x1="24" y1="36.5" x2="29" y2="36.5" stroke="#5a4a2a" strokeWidth="0.5"/>
      {/* Saw blade */}
      <circle cx="46" cy="34" r="5" fill="none" stroke="#888" strokeWidth="1.5"/>
      <circle cx="46" cy="34" r="2" fill="#666"/>
      {/* Chimney */}
      <rect x="40" y="14" width="4" height="10" fill="#5a4a3a"/>
      {/* Smoke */}
      <circle cx="42" cy="10" r="2" fill="#888" opacity="0.3"/>
      <circle cx="44" cy="7" r="2.5" fill="#888" opacity="0.2"/>
      {/* Water wheel */}
      <circle cx="54" cy="42" r="7" fill="none" stroke="#6a5a3a" strokeWidth="2"/>
      <circle cx="54" cy="42" r="2" fill="#6a5a3a"/>
      {[0,45,90,135,180,225,270,315].map((a,i) => (
        <line key={i} x1={54+Math.cos(a*Math.PI/180)*2} y1={42+Math.sin(a*Math.PI/180)*2} x2={54+Math.cos(a*Math.PI/180)*7} y2={42+Math.sin(a*Math.PI/180)*7} stroke="#6a5a3a" strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

export function FarmArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Fields */}
      <rect x="2" y="42" width="60" height="20" rx="2" fill="#3a5a2a" opacity="0.5"/>
      {[6,14,22,30,38,46,54].map(x => (
        <line key={x} x1={x} y1="44" x2={x} y2="60" stroke="#2a4a1a" strokeWidth="0.8" opacity="0.5"/>
      ))}
      {/* Crop rows */}
      {[46,50,54,58].map(y => (
        <line key={y} x1="4" y1={y} x2="60" y2={y} stroke="#4a7a3a" strokeWidth="1" opacity="0.4"/>
      ))}
      {/* Barn */}
      <rect x="18" y="22" width="28" height="22" rx="1" fill="#8a5a2a" stroke="#5a3a1a" strokeWidth="1"/>
      {/* Roof */}
      <polygon points="14,22 32,8 50,22" fill="#9a4020" stroke="#6a3010" strokeWidth="0.8"/>
      {/* Barn door */}
      <rect x="27" y="32" width="10" height="12" rx="1" fill="#5a3a1a"/>
      <line x1="32" y1="32" x2="32" y2="44" stroke="#3a2a0a" strokeWidth="0.5"/>
      {/* Hay bale on top */}
      <rect x="22" y="24" width="6" height="4" rx="1" fill="#c8a830"/>
      {/* Window */}
      <rect x="38" y="28" width="4" height="4" rx="0.5" fill="#c0d8f0" stroke="#5a3a1a" strokeWidth="0.5"/>
      {/* Wheat stalks */}
      {[8,11,14,50,53,56].map(x => (
        <g key={x}>
          <line x1={x} y1="42" x2={x} y2="34" stroke="#b8a030" strokeWidth="0.8"/>
          <circle cx={x} cy="33" r="1.2" fill="#d4b830"/>
        </g>
      ))}
      {/* Fence */}
      <line x1="2" y1="42" x2="16" y2="42" stroke="#6a5a3a" strokeWidth="1"/>
      <line x1="48" y1="42" x2="62" y2="42" stroke="#6a5a3a" strokeWidth="1"/>
      {[4,8,12,50,54,58].map(x => <line key={x} x1={x} y1="38" x2={x} y2="44" stroke="#6a5a3a" strokeWidth="1"/>)}
    </svg>
  );
}

export function BarracksArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main building */}
      <rect x="10" y="24" width="44" height="28" rx="1" fill="#6a5a4a" stroke="#4a3a2a" strokeWidth="1"/>
      {/* Roof */}
      <polygon points="6,24 32,10 58,24" fill="#5a3a2a" stroke="#3a2a1a" strokeWidth="0.8"/>
      {/* Door */}
      <rect x="27" y="38" width="10" height="14" rx="1" fill="#3a2010"/>
      {/* Windows */}
      <rect x="14" y="30" width="5" height="6" rx="0.5" fill="#c0d8f0" stroke="#4a3a2a" strokeWidth="0.5"/>
      <rect x="45" y="30" width="5" height="6" rx="0.5" fill="#c0d8f0" stroke="#4a3a2a" strokeWidth="0.5"/>
      {/* Weapon rack */}
      <line x1="4" y1="30" x2="4" y2="52" stroke="#5a4a3a" strokeWidth="1.5"/>
      <line x1="2" y1="32" x2="6" y2="32" stroke="#5a4a3a" strokeWidth="1"/>
      {/* Sword */}
      <line x1="3" y1="33" x2="3" y2="42" stroke="#aaa" strokeWidth="1"/>
      <line x1="1.5" y1="35" x2="4.5" y2="35" stroke="#aaa" strokeWidth="1"/>
      {/* Shield */}
      <ellipse cx="60" cy="36" rx="3.5" ry="4.5" fill="#8a3030" stroke="#5a2020" strokeWidth="0.8"/>
      <line x1="60" y1="32" x2="60" y2="40" stroke="#d4a020" strokeWidth="0.6"/>
      <line x1="56.5" y1="36" x2="63.5" y2="36" stroke="#d4a020" strokeWidth="0.6"/>
      {/* Banner */}
      <line x1="32" y1="10" x2="32" y2="2" stroke="#4a3a2a" strokeWidth="1"/>
      <rect x="32" y="2" width="8" height="6" rx="0.5" fill="#8a3030"/>
      <line x1="34" y1="4" x2="38" y2="4" stroke="#d4a020" strokeWidth="0.5"/>
      <line x1="34" y1="6" x2="38" y2="6" stroke="#d4a020" strokeWidth="0.5"/>
      {/* Training dummy */}
      <line x1="56" y1="44" x2="56" y2="52" stroke="#6a5a3a" strokeWidth="1.5"/>
      <line x1="53" y1="46" x2="59" y2="46" stroke="#6a5a3a" strokeWidth="1.5"/>
      <circle cx="56" cy="42" r="2" fill="#c8a870" stroke="#6a5a3a" strokeWidth="0.8"/>
    </svg>
  );
}

export function MarketArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Market stalls */}
      {/* Left stall */}
      <rect x="4" y="32" width="18" height="20" rx="1" fill="#8a6a3a" stroke="#5a4a2a" strokeWidth="0.8"/>
      <polygon points="2,32 13,22 24,32" fill="#c83030" stroke="#8a2020" strokeWidth="0.6" opacity="0.9"/>
      {/* Striped awning left */}
      <polygon points="2,32 13,22 24,32" fill="url(#stripes)" opacity="0.3"/>
      {/* Right stall */}
      <rect x="42" y="32" width="18" height="20" rx="1" fill="#8a6a3a" stroke="#5a4a2a" strokeWidth="0.8"/>
      <polygon points="40,32 51,22 62,32" fill="#2050a0" stroke="#103070" strokeWidth="0.6" opacity="0.9"/>
      {/* Center stall (main) */}
      <rect x="22" y="28" width="20" height="24" rx="1" fill="#9a7a4a" stroke="#5a4a2a" strokeWidth="1"/>
      <polygon points="18,28 32,16 46,28" fill="#d4a020" stroke="#9a7a10" strokeWidth="0.8"/>
      {/* Goods on display */}
      <rect x="25" y="34" width="4" height="3" rx="0.5" fill="#c83030"/> {/* Red cloth */}
      <rect x="30" y="34" width="4" height="3" rx="0.5" fill="#d4a020"/> {/* Gold */}
      <rect x="35" y="34" width="4" height="3" rx="0.5" fill="#4080c0"/> {/* Blue cloth */}
      {/* Barrels */}
      <ellipse cx="8" cy="48" rx="3" ry="3.5" fill="#6a4a2a" stroke="#4a3a1a" strokeWidth="0.6"/>
      <ellipse cx="14" cy="49" rx="2.5" ry="3" fill="#7a5a3a" stroke="#4a3a1a" strokeWidth="0.6"/>
      {/* Scale/balance */}
      <line x1="32" y1="40" x2="32" y2="44" stroke="#888" strokeWidth="0.8"/>
      <line x1="28" y1="44" x2="36" y2="44" stroke="#888" strokeWidth="0.8"/>
      <path d="M28,44 L27,47 L30,47 Z" fill="#d4a020" opacity="0.6"/>
      <path d="M36,44 L35,47 L38,47 Z" fill="#d4a020" opacity="0.6"/>
      {/* Crates */}
      <rect x="46" y="44" width="5" height="5" fill="#7a6a4a" stroke="#4a3a2a" strokeWidth="0.5"/>
      <rect x="52" y="46" width="4" height="4" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.5"/>
      <defs>
        <pattern id="stripes" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="2" height="4" fill="white" opacity="0.3"/>
        </pattern>
      </defs>
    </svg>
  );
}

export function WallArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main wall */}
      <rect x="2" y="28" width="60" height="24" rx="1" fill="#6a6a7a" stroke="#4a4a5a" strokeWidth="1"/>
      {/* Gate arch */}
      <path d="M24,52 L24,34 Q32,26 40,34 L40,52 Z" fill="#2a1a0a"/>
      <path d="M26,52 L26,35 Q32,28 38,35 L38,52 Z" fill="#1a0f05"/>
      {/* Portcullis */}
      {[28,31,34].map(x => <line key={x} x1={x} y1="35" x2={x} y2="52" stroke="#5a5a5a" strokeWidth="0.8"/>)}
      {[40,44,48].map(y => <line key={y} x1="26" y1={y} x2="38" y2={y} stroke="#5a5a5a" strokeWidth="0.5"/>)}
      {/* Battlements */}
      {[2,7,12,17,42,47,52,57].map(x => <rect key={x} x={x} y="24" width="4" height="6" fill="#6a6a7a" stroke="#4a4a5a" strokeWidth="0.5"/>)}
      {/* Guard towers */}
      <rect x="0" y="18" width="10" height="34" rx="1" fill="#7a7a8a" stroke="#4a4a5a" strokeWidth="1"/>
      <rect x="54" y="18" width="10" height="34" rx="1" fill="#7a7a8a" stroke="#4a4a5a" strokeWidth="1"/>
      {/* Tower tops */}
      <polygon points="0,18 5,10 10,18" fill="#5a3020" stroke="#3a2010" strokeWidth="0.6"/>
      <polygon points="54,18 59,10 64,18" fill="#5a3020" stroke="#3a2010" strokeWidth="0.6"/>
      {/* Flags */}
      <line x1="5" y1="10" x2="5" y2="4" stroke="#4a3a2a" strokeWidth="0.8"/>
      <polygon points="5,4 11,6 5,8" fill="#d4a020" opacity="0.8"/>
      <line x1="59" y1="10" x2="59" y2="4" stroke="#4a3a2a" strokeWidth="0.8"/>
      <polygon points="59,4 53,6 59,8" fill="#d4a020" opacity="0.8"/>
      {/* Torch */}
      <rect x="21" y="36" width="1.5" height="6" fill="#6a5a3a"/>
      <ellipse cx="21.75" cy="35" rx="1.5" ry="2" fill="#f0a020" opacity="0.8"/>
      <rect x="41.5" y="36" width="1.5" height="6" fill="#6a5a3a"/>
      <ellipse cx="42.25" cy="35" rx="1.5" ry="2" fill="#f0a020" opacity="0.8"/>
    </svg>
  );
}

export function QuarryArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Rock face */}
      <path d="M5,52 L10,30 L20,22 L32,18 L44,22 L54,30 L59,52 Z" fill="#7a7a7a" stroke="#5a5a5a" strokeWidth="1"/>
      <path d="M10,30 L22,36 L32,28 L42,38 L54,30" fill="none" stroke="#6a6a6a" strokeWidth="0.8"/>
      <path d="M15,40 L28,44 L40,40 L50,46" fill="none" stroke="#6a6a6a" strokeWidth="0.5"/>
      {/* Shed */}
      <rect x="2" y="42" width="16" height="12" rx="1" fill="#7a5a3a" stroke="#4a3a1a" strokeWidth="0.8"/>
      <polygon points="0,42 10,36 20,42" fill="#5a3a1a"/>
      {/* Stone blocks */}
      <rect x="42" y="48" width="6" height="5" fill="#8a8a8a" stroke="#5a5a5a" strokeWidth="0.5"/>
      <rect x="50" y="47" width="5" height="6" fill="#9a9a9a" stroke="#5a5a5a" strokeWidth="0.5"/>
      <rect x="44" y="44" width="4" height="4" fill="#7a7a7a" stroke="#5a5a5a" strokeWidth="0.5"/>
      {/* Pickaxe */}
      <line x1="24" y1="38" x2="30" y2="48" stroke="#6a5a3a" strokeWidth="1.5"/>
      <path d="M22,36 L26,34 L28,38 L24,40 Z" fill="#888"/>
      {/* Cart */}
      <rect x="34" y="50" width="10" height="6" rx="1" fill="#6a4a2a"/>
      <circle cx="35" cy="58" r="2.5" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.8"/>
      <circle cx="43" cy="58" r="2.5" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.8"/>
    </svg>
  );
}

export function MineArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Mountain/cliff */}
      <path d="M8,52 L16,24 L32,14 L48,24 L56,52 Z" fill="#5a5060" stroke="#3a3040" strokeWidth="1"/>
      {/* Mine entrance */}
      <path d="M22,52 L24,38 Q32,32 40,38 L42,52 Z" fill="#1a0f05"/>
      {/* Wooden supports */}
      <line x1="24" y1="38" x2="24" y2="52" stroke="#6a4a2a" strokeWidth="2"/>
      <line x1="40" y1="38" x2="40" y2="52" stroke="#6a4a2a" strokeWidth="2"/>
      <path d="M24,38 Q32,34 40,38" fill="none" stroke="#6a4a2a" strokeWidth="2"/>
      {/* Rail tracks */}
      <line x1="26" y1="52" x2="34" y2="44" stroke="#888" strokeWidth="0.8"/>
      <line x1="38" y1="52" x2="30" y2="44" stroke="#888" strokeWidth="0.8"/>
      {/* Minecart */}
      <rect x="28" y="46" width="8" height="5" rx="1" fill="#6a5a4a" stroke="#4a3a2a" strokeWidth="0.8"/>
      <rect x="29" y="44" width="6" height="3" rx="0.5" fill="#5a7a8a"/> {/* Iron ore */}
      <circle cx="29" cy="53" r="1.5" fill="#4a4a4a"/>
      <circle cx="35" cy="53" r="1.5" fill="#4a4a4a"/>
      {/* Lantern */}
      <rect x="20" y="35" width="2" height="3" fill="#d4a020" opacity="0.8"/>
      <ellipse cx="21" cy="34" rx="2" ry="1.5" fill="#f0c040" opacity="0.5"/>
      {/* Ore deposits */}
      <circle cx="14" cy="38" r="1.5" fill="#5a7a8a"/>
      <circle cx="18" cy="32" r="1" fill="#5a7a8a"/>
      <circle cx="46" cy="34" r="1.5" fill="#5a7a8a"/>
    </svg>
  );
}

export function StableArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main building */}
      <rect x="8" y="26" width="48" height="26" rx="1" fill="#8a6a3a" stroke="#5a4a2a" strokeWidth="1"/>
      {/* Roof */}
      <polygon points="4,26 32,12 60,26" fill="#7a4a20" stroke="#5a3a10" strokeWidth="0.8"/>
      {/* Stall doors */}
      <rect x="12" y="38" width="10" height="14" rx="1" fill="#5a3a1a" stroke="#3a2a0a" strokeWidth="0.5"/>
      <rect x="27" y="38" width="10" height="14" rx="1" fill="#5a3a1a" stroke="#3a2a0a" strokeWidth="0.5"/>
      <rect x="42" y="38" width="10" height="14" rx="1" fill="#5a3a1a" stroke="#3a2a0a" strokeWidth="0.5"/>
      {/* Hay window */}
      <rect x="28" y="28" width="8" height="6" rx="0.5" fill="#c0d8f0" stroke="#5a4a2a" strokeWidth="0.5"/>
      {/* Hay bale visible */}
      <rect x="29" y="29" width="6" height="4" rx="0.5" fill="#c8a830" opacity="0.6"/>
      {/* Horseshoe */}
      <path d="M15,30 Q17,28 19,30 Q19,34 17,36 Q15,34 15,30" fill="none" stroke="#888" strokeWidth="1"/>
      {/* Horse silhouette in stall */}
      <ellipse cx="17" cy="46" rx="3" ry="2" fill="#5a3a1a" opacity="0.3"/>
      {/* Fence */}
      <line x1="2" y1="48" x2="8" y2="48" stroke="#6a5a3a" strokeWidth="1.5"/>
      <line x1="56" y1="48" x2="62" y2="48" stroke="#6a5a3a" strokeWidth="1.5"/>
      {[3,6,57,60].map(x => <line key={x} x1={x} y1="44" x2={x} y2="52" stroke="#6a5a3a" strokeWidth="1"/>)}
    </svg>
  );
}

export function WorkshopArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main building */}
      <rect x="10" y="24" width="36" height="28" rx="1" fill="#6a5a4a" stroke="#4a3a2a" strokeWidth="1"/>
      {/* Roof */}
      <polygon points="6,24 28,10 50,24" fill="#4a3a2a" stroke="#3a2a1a" strokeWidth="0.8"/>
      {/* Chimney with smoke */}
      <rect x="38" y="12" width="5" height="14" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.5"/>
      <circle cx="40.5" cy="9" r="2.5" fill="#888" opacity="0.25"/>
      <circle cx="42" cy="6" r="3" fill="#888" opacity="0.15"/>
      {/* Anvil area */}
      <rect x="50" y="38" width="10" height="8" rx="1" fill="#4a4a4a"/>
      <rect x="52" y="36" width="6" height="3" rx="0.5" fill="#3a3a3a"/>
      {/* Door */}
      <rect x="22" y="38" width="10" height="14" rx="1" fill="#3a2010"/>
      {/* Window */}
      <rect x="14" y="30" width="5" height="5" rx="0.5" fill="#f0a020" stroke="#4a3a2a" strokeWidth="0.5" opacity="0.8"/>
      {/* Catapult parts */}
      <line x1="52" y1="50" x2="60" y2="50" stroke="#6a5a3a" strokeWidth="2"/>
      <line x1="56" y1="44" x2="56" y2="52" stroke="#6a5a3a" strokeWidth="2"/>
      <circle cx="53" cy="52" r="2" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.5"/>
      <circle cx="59" cy="52" r="2" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.5"/>
      {/* Gear */}
      <circle cx="4" cy="44" r="4" fill="none" stroke="#666" strokeWidth="1.5"/>
      <circle cx="4" cy="44" r="1.5" fill="#555"/>
    </svg>
  );
}

export function WatchtowerArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Tower base */}
      <rect x="20" y="32" width="24" height="22" rx="1" fill="#7a7a8a" stroke="#4a4a5a" strokeWidth="1"/>
      {/* Upper tower */}
      <rect x="18" y="16" width="28" height="18" rx="1" fill="#8a8a9a" stroke="#4a4a5a" strokeWidth="1"/>
      {/* Pointed roof */}
      <polygon points="16,16 32,2 48,16" fill="#5a3020" stroke="#3a2010" strokeWidth="0.8"/>
      {/* Flag */}
      <line x1="32" y1="2" x2="32" y2="-4" stroke="#4a3a2a" strokeWidth="0.8"/>
      <polygon points="32,-4 40,-2 32,0" fill="#d4a020" opacity="0.9"/>
      {/* Windows/lookout */}
      <rect x="26" y="20" width="4" height="6" rx="0.5" fill="#c0d8f0" stroke="#4a4a5a" strokeWidth="0.5"/>
      <rect x="34" y="20" width="4" height="6" rx="0.5" fill="#c0d8f0" stroke="#4a4a5a" strokeWidth="0.5"/>
      {/* Battlements */}
      {[18,23,28,33,38,43].map(x => <rect key={x} x={x} y="13" width="3" height="4" fill="#8a8a9a" stroke="#4a4a5a" strokeWidth="0.4"/>)}
      {/* Door */}
      <rect x="28" y="44" width="8" height="10" rx="1" fill="#3a2010"/>
      {/* Torch */}
      <rect x="16" y="28" width="1.5" height="5" fill="#6a5a3a"/>
      <ellipse cx="16.75" cy="27" rx="1.5" ry="2" fill="#f0a020" opacity="0.7"/>
    </svg>
  );
}

export function GranaryArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main silo */}
      <rect x="16" y="20" width="20" height="32" rx="3" fill="#9a7a4a" stroke="#6a5a3a" strokeWidth="1"/>
      {/* Roof */}
      <path d="M14,20 Q26,8 38,20" fill="#6a4a20" stroke="#4a3a10" strokeWidth="0.8"/>
      {/* Bands */}
      <line x1="16" y1="28" x2="36" y2="28" stroke="#5a4a2a" strokeWidth="1"/>
      <line x1="16" y1="36" x2="36" y2="36" stroke="#5a4a2a" strokeWidth="1"/>
      <line x1="16" y1="44" x2="36" y2="44" stroke="#5a4a2a" strokeWidth="1"/>
      {/* Door */}
      <rect x="23" y="42" width="6" height="10" rx="1" fill="#5a3a1a"/>
      {/* Second silo (smaller) */}
      <rect x="40" y="28" width="14" height="24" rx="2" fill="#8a6a3a" stroke="#5a4a2a" strokeWidth="0.8"/>
      <path d="M39,28 Q47,20 55,28" fill="#5a3a10" stroke="#3a2a0a" strokeWidth="0.6"/>
      <line x1="40" y1="36" x2="54" y2="36" stroke="#4a3a1a" strokeWidth="0.8"/>
      {/* Grain sacks */}
      <ellipse cx="8" cy="48" rx="4" ry="5" fill="#c8a850" stroke="#8a7a3a" strokeWidth="0.6"/>
      <ellipse cx="10" cy="44" rx="3" ry="4" fill="#b89840" stroke="#8a7a3a" strokeWidth="0.6"/>
      {/* Wheat */}
      {[5,7,9].map(x => (
        <g key={x}>
          <line x1={x} y1="40" x2={x} y2="34" stroke="#b8a030" strokeWidth="0.6"/>
          <circle cx={x} cy="33" r="1" fill="#d4b830"/>
        </g>
      ))}
    </svg>
  );
}

export function WarehouseArt() {
  return (
    <svg {...SVG_PROPS}>
      {/* Main building */}
      <rect x="6" y="24" width="44" height="28" rx="1" fill="#7a6a5a" stroke="#4a3a2a" strokeWidth="1"/>
      {/* Roof */}
      <polygon points="2,24 28,10 54,24" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.8"/>
      {/* Large door */}
      <rect x="18" y="34" width="16" height="18" rx="1" fill="#4a3020"/>
      <line x1="26" y1="34" x2="26" y2="52" stroke="#3a2010" strokeWidth="0.5"/>
      {/* Crates stacked outside */}
      <rect x="52" y="40" width="7" height="7" fill="#7a6a4a" stroke="#4a3a2a" strokeWidth="0.5"/>
      <rect x="54" y="34" width="6" height="6" fill="#8a7a5a" stroke="#4a3a2a" strokeWidth="0.5"/>
      <rect x="52" y="48" width="8" height="5" fill="#6a5a3a" stroke="#4a3a2a" strokeWidth="0.5"/>
      {/* Barrel */}
      <ellipse cx="4" cy="44" rx="3" ry="4.5" fill="#6a4a2a" stroke="#4a3a1a" strokeWidth="0.6"/>
      <line x1="1" y1="42" x2="7" y2="42" stroke="#4a3a1a" strokeWidth="0.5"/>
      <line x1="1" y1="46" x2="7" y2="46" stroke="#4a3a1a" strokeWidth="0.5"/>
      {/* Window */}
      <rect x="38" y="28" width="6" height="5" rx="0.5" fill="#c0d8f0" stroke="#4a3a2a" strokeWidth="0.5"/>
      {/* Pulley */}
      <line x1="28" y1="10" x2="28" y2="18" stroke="#5a4a3a" strokeWidth="1"/>
      <circle cx="28" cy="18" r="2" fill="none" stroke="#666" strokeWidth="1"/>
      <line x1="28" y1="20" x2="28" y2="32" stroke="#888" strokeWidth="0.5" strokeDasharray="1,1"/>
    </svg>
  );
}

/** Map building type to its art component */
export const BUILDING_ART: Record<string, () => JSX.Element> = {
  keep: KeepArt,
  lumbermill: LumbermillArt,
  quarry: QuarryArt,
  mine: MineArt,
  farm: FarmArt,
  market: MarketArt,
  barracks: BarracksArt,
  wall: WallArt,
  stable: StableArt,
  workshop: WorkshopArt,
  watchtower: WatchtowerArt,
  granary: GranaryArt,
  warehouse: WarehouseArt,
};
