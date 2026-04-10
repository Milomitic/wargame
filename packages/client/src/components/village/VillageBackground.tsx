/**
 * Full SVG background for the village scene.
 * Warm parchment/sandy tone with rich decorative details.
 */

interface VillageBackgroundProps {
  builtSet: Set<string>;
}

export default function VillageBackground({ builtSet }: VillageBackgroundProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 700"
      className="village-bg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="vp" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#c4a86a"/>
          <circle cx="3" cy="5" r="0.5" fill="#b89858" opacity="0.4"/>
          <circle cx="11" cy="2" r="0.4" fill="#cbb478" opacity="0.3"/>
          <circle cx="7" cy="13" r="0.6" fill="#b89050" opacity="0.3"/>
        </pattern>
        <pattern id="vg" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#5a8a3a"/>
          <line x1="2" y1="10" x2="2" y2="6" stroke="#4a7a2a" strokeWidth="0.8" opacity="0.5"/>
          <line x1="5" y1="10" x2="5.5" y2="5" stroke="#508030" strokeWidth="0.6" opacity="0.4"/>
          <line x1="8" y1="10" x2="7.5" y2="7" stroke="#4a7a2a" strokeWidth="0.7" opacity="0.4"/>
        </pattern>
        <pattern id="vd" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#a08050"/>
          <circle cx="2" cy="3" r="0.5" fill="#907040" opacity="0.3"/>
          <circle cx="6" cy="6" r="0.4" fill="#b09060" opacity="0.3"/>
        </pattern>
        <pattern id="vpe" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#b09060"/>
          <circle cx="2" cy="2" r="0.3" fill="#a08050" opacity="0.4"/>
        </pattern>
        <pattern id="vpb" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#a08048"/>
          <circle cx="3" cy="3" r="0.3" fill="#907038" opacity="0.3"/>
        </pattern>
        <radialGradient id="vv" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="transparent"/>
          <stop offset="65%" stopColor="transparent"/>
          <stop offset="100%" stopColor="#0d1117" stopOpacity="0.55"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* === Base grass === */}
      <rect width="1000" height="700" fill="url(#vg)"/>

      {/* === Settlement ground === */}
      <ellipse cx="500" cy="360" rx="440" ry="300" fill="url(#vp)"/>
      <ellipse cx="500" cy="360" rx="440" ry="300" fill="none" stroke="#6a9a4a" strokeWidth="14" opacity="0.25"/>
      <ellipse cx="500" cy="360" rx="425" ry="288" fill="none" stroke="#8aaa5a" strokeWidth="5" opacity="0.12"/>

      {/* === Paths === */}
      <path d="M500,100 L500,250" stroke="url(#vd)" strokeWidth="24" fill="none" opacity="0.65" strokeLinecap="round"/>
      <path d="M500,310 C480,370 450,390 420,420" stroke="url(#vd)" strokeWidth="16" fill="none" opacity="0.45" strokeLinecap="round"/>
      <path d="M500,310 C520,370 550,390 580,420" stroke="url(#vd)" strokeWidth="16" fill="none" opacity="0.45" strokeLinecap="round"/>
      <path d="M440,280 L350,280" stroke="url(#vd)" strokeWidth="14" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M560,280 L720,330" stroke="url(#vd)" strokeWidth="12" fill="none" opacity="0.3" strokeLinecap="round"/>
      <path d="M340,280 C280,240 220,200 180,180" stroke="#a08050" strokeWidth="8" fill="none" opacity="0.22" strokeLinecap="round"/>
      <path d="M560,280 C680,240 760,200 820,190" stroke="#a08050" strokeWidth="8" fill="none" opacity="0.22" strokeLinecap="round"/>
      <path d="M420,440 C320,460 200,460 150,440" stroke="#a08050" strokeWidth="8" fill="none" opacity="0.18" strokeLinecap="round"/>
      <path d="M580,440 C680,450 780,400 850,370" stroke="#a08050" strokeWidth="8" fill="none" opacity="0.18" strokeLinecap="round"/>
      <path d="M500,440 L500,500" stroke="url(#vd)" strokeWidth="12" fill="none" opacity="0.3" strokeLinecap="round"/>

      {/* === Building plots === */}
      <Plot cx={500} cy={280} rx={68} ry={42} built={builtSet.has("keep")} />
      <Plot cx={500} cy={130} rx={85} ry={32} built={builtSet.has("wall")} />
      <Plot cx={350} cy={280} rx={52} ry={32} built={builtSet.has("barracks")} />
      <Plot cx={220} cy={336} rx={48} ry={30} built={builtSet.has("stable")} />
      <Plot cx={780} cy={336} rx={48} ry={30} built={builtSet.has("workshop")} />
      <Plot cx={420} cy={420} rx={50} ry={32} built={builtSet.has("market")} />
      <Plot cx={580} cy={420} rx={50} ry={32} built={builtSet.has("warehouse")} />
      <Plot cx={500} cy={510} rx={48} ry={30} built={builtSet.has("granary")} />
      <Plot cx={180} cy={196} rx={52} ry={32} built={builtSet.has("lumbermill")} />
      <Plot cx={820} cy={210} rx={52} ry={32} built={builtSet.has("quarry")} />
      <Plot cx={850} cy={378} rx={50} ry={32} built={builtSet.has("mine")} />
      <Plot cx={150} cy={448} rx={56} ry={34} built={builtSet.has("farm")} />
      <Plot cx={820} cy={119} rx={38} ry={26} built={builtSet.has("watchtower")} />

      {/* === Trees (border clusters) === */}
      {[[30,40],[60,25],[15,80],[80,60],[45,100],[95,35],[20,130],[70,120],[110,80],[50,160],[130,150]].map(([x,y],i) =>
        <Tree key={`nw${i}`} x={x} y={y} s={12+i%4*2}/>
      )}
      {[[940,30],[910,55],[960,80],[925,100],[955,130],[895,40],[930,150]].map(([x,y],i) =>
        <Tree key={`ne${i}`} x={x} y={y} s={11+i%3*2}/>
      )}
      {[[30,550],[60,580],[20,620],[80,610],[50,650],[95,570],[40,490]].map(([x,y],i) =>
        <Tree key={`sw${i}`} x={x} y={y} s={12+i%3*2}/>
      )}
      {[[960,520],[935,560],[970,600],[920,590],[950,480]].map(([x,y],i) =>
        <Tree key={`se${i}`} x={x} y={y} s={11+i%3*2}/>
      )}
      {/* Scattered inner trees */}
      {[[140,120],[860,90],[130,370],[870,460],[160,560],[840,540],[250,150],[750,140]].map(([x,y],i) =>
        <Tree key={`in${i}`} x={x} y={y} s={8+i%3}/>
      )}

      {/* === Bushes (scattered) === */}
      {[[200,230],[300,180],[680,200],[770,280],[330,450],[650,480],[200,500],[800,500],[450,150],[560,150]].map(([x,y],i) =>
        <Bush key={`bu${i}`} x={x} y={y} s={5+i%3}/>
      )}

      {/* === Flower patches === */}
      {[[280,320],[420,340],[580,340],[720,320],[350,400],[650,400],[480,460],[520,460],[300,240],[700,240]].map(([x,y],i) =>
        <Flowers key={`fl${i}`} x={x} y={y} c={i%3===0?"#e06060":i%3===1?"#e0c040":"#a0a0e0"}/>
      )}

      {/* === Rocks === */}
      {[[830,250],[870,160],[90,200],[760,500],[400,520],[600,170]].map(([x,y],i) => (
        <g key={`r${i}`}>
          <ellipse cx={x} cy={y} rx={6+i*1.5} ry={4+i} fill="#8a8070" opacity="0.3"/>
          <ellipse cx={x+1.5} cy={y-1} rx={4+i} ry={2.5+i*0.5} fill="#9a9080" opacity="0.2"/>
        </g>
      ))}

      {/* === Well (center-south) === */}
      <g>
        <ellipse cx="560" cy="340" rx="10" ry="6" fill="#6a6a6a" opacity="0.5"/>
        <ellipse cx="560" cy="337" rx="7" ry="4" fill="#2a3a4a" opacity="0.6"/>
        <rect x="557" y="326" width="1.5" height="12" fill="#5a4a2a"/>
        <rect x="562" y="326" width="1.5" height="12" fill="#5a4a2a"/>
        <line x1="557" y1="327" x2="564" y2="327" stroke="#5a4a2a" strokeWidth="1.5"/>
        <rect x="558.5" y="328" width="4" height="3" rx="0.5" fill="#7a6a4a"/>
      </g>

      {/* === Pond === */}
      <ellipse cx="640" cy="490" rx="22" ry="13" fill="#4a7090" opacity="0.35"/>
      <ellipse cx="640" cy="488" rx="15" ry="8" fill="#5a80a0" opacity="0.2">
        <animate attributeName="opacity" values="0.15;0.3;0.15" dur="4s" repeatCount="indefinite"/>
      </ellipse>

      {/* === Cart on path (near market) === */}
      <g opacity="0.5">
        <rect x="370" y="400" width="14" height="8" rx="1" fill="#6a4a2a"/>
        <circle cx="372" cy="410" r="3" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.5"/>
        <circle cx="382" cy="410" r="3" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.5"/>
        <rect x="371" y="396" width="12" height="5" rx="1" fill="#8a7a5a"/>
        <line x1="368" y1="404" x2="360" y2="402" stroke="#6a5a3a" strokeWidth="1.5"/>
      </g>

      {/* === Hay bales near farm === */}
      {builtSet.has("farm") && (
        <g opacity="0.5">
          <ellipse cx="185" cy="470" rx="5" ry="4" fill="#c8a830"/>
          <ellipse cx="195" cy="472" rx="4.5" ry="3.5" fill="#b89820"/>
          <ellipse cx="175" cy="468" rx="4" ry="3" fill="#d4b840"/>
        </g>
      )}

      {/* === Smoke from lumbermill chimney === */}
      {builtSet.has("lumbermill") && (
        <g>
          <circle cx="192" cy="175" r="3" fill="#888" opacity="0.15">
            <animate attributeName="cy" values="175;160;145" dur="4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.15;0.08;0" dur="4s" repeatCount="indefinite"/>
            <animate attributeName="r" values="3;5;7" dur="4s" repeatCount="indefinite"/>
          </circle>
          <circle cx="188" cy="170" r="2.5" fill="#888" opacity="0.12">
            <animate attributeName="cy" values="170;155;140" dur="3.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.12;0.06;0" dur="3.5s" repeatCount="indefinite"/>
            <animate attributeName="r" values="2.5;4;6" dur="3.5s" repeatCount="indefinite"/>
          </circle>
        </g>
      )}

      {/* === Smoke from workshop === */}
      {builtSet.has("workshop") && (
        <g>
          <circle cx="790" cy="315" r="2.5" fill="#888" opacity="0.12">
            <animate attributeName="cy" values="315;300;285" dur="3.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.12;0.06;0" dur="3.8s" repeatCount="indefinite"/>
            <animate attributeName="r" values="2.5;4.5;6.5" dur="3.8s" repeatCount="indefinite"/>
          </circle>
        </g>
      )}

      {/* === Animated flags on keep === */}
      {builtSet.has("keep") && (
        <g>
          <line x1="490" y1="260" x2="490" y2="248" stroke="#4a3a2a" strokeWidth="1"/>
          <polygon points="490,248 498,250 490,253" fill="#d4a020" opacity="0.7">
            <animate attributeName="points" values="490,248 498,250 490,253;490,248 497,251 490,254;490,248 498,250 490,253" dur="2s" repeatCount="indefinite"/>
          </polygon>
          <line x1="510" y1="260" x2="510" y2="248" stroke="#4a3a2a" strokeWidth="1"/>
          <polygon points="510,248 518,250 510,253" fill="#8a3030" opacity="0.7">
            <animate attributeName="points" values="510,248 518,250 510,253;510,248 517,251 510,254;510,248 518,250 510,253" dur="2.3s" repeatCount="indefinite"/>
          </polygon>
        </g>
      )}

      {/* === NPC villagers (simple figures) === */}
      <Villager x={460} y={350} dir={1}/>
      <Villager x={540} y={370} dir={-1}/>
      <Villager x={380} y={310} dir={1}/>
      <Villager x={620} y={400} dir={-1}/>
      <Villager x={490} y={450} dir={1}/>

      {/* === Fence posts === */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
        const rad = deg * Math.PI / 180;
        const fx = 500 + Math.cos(rad) * 390;
        const fy = 360 + Math.sin(rad) * 260;
        if (fy < 50 || fy > 680 || fx < 30 || fx > 970) return null;
        return (
          <g key={`f${i}`} opacity="0.18">
            <line x1={fx-4} y1={fy-5} x2={fx-4} y2={fy+5} stroke="#6a5a3a" strokeWidth="1.8"/>
            <line x1={fx+4} y1={fy-5} x2={fx+4} y2={fy+5} stroke="#6a5a3a" strokeWidth="1.8"/>
            <line x1={fx-6} y1={fy-1} x2={fx+6} y2={fy-1} stroke="#6a5a3a" strokeWidth="1.2"/>
            <line x1={fx-6} y1={fy+2} x2={fx+6} y2={fy+2} stroke="#6a5a3a" strokeWidth="1.2"/>
          </g>
        );
      })}

      {/* === Vignette === */}
      <rect width="1000" height="700" fill="url(#vv)"/>
    </svg>
  );
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y+s*0.7} rx={s*0.65} ry={s*0.22} fill="#0a1a06" opacity="0.18"/>
      <rect x={x-1.5} y={y+s*0.1} width="3" height={s*0.45} fill="#5a4020" rx="1"/>
      <circle cx={x} cy={y-s*0.1} r={s*0.48} fill="#2a5a1a" opacity="0.75"/>
      <circle cx={x-s*0.14} cy={y-s*0.24} r={s*0.36} fill="#3a6a2a" opacity="0.65"/>
      <circle cx={x+s*0.1} cy={y-s*0.28} r={s*0.3} fill="#4a7a32" opacity="0.55"/>
    </g>
  );
}

function Bush({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y+s*0.3} rx={s*0.8} ry={s*0.25} fill="#0a1a06" opacity="0.1"/>
      <ellipse cx={x} cy={y} rx={s} ry={s*0.6} fill="#3a6828" opacity="0.45"/>
      <ellipse cx={x+s*0.3} cy={y-s*0.15} rx={s*0.65} ry={s*0.4} fill="#4a7830" opacity="0.35"/>
    </g>
  );
}

function Flowers({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g opacity="0.5">
      <circle cx={x} cy={y} r="1.5" fill={c}/>
      <circle cx={x+4} cy={y-2} r="1.2" fill={c}/>
      <circle cx={x-3} cy={y+1} r="1.3" fill={c}/>
      <circle cx={x+2} cy={y+3} r="1" fill={c}/>
      <circle cx={x-1} cy={y-3} r="1.1" fill={c}/>
    </g>
  );
}

function Villager({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <g opacity="0.35">
      {/* Shadow */}
      <ellipse cx={x} cy={y+6} rx="3" ry="1.2" fill="#000" opacity="0.15"/>
      {/* Body */}
      <rect x={x-1.5} y={y-1} width="3" height="6" rx="1" fill={dir>0?"#6a4a3a":"#4a5a6a"}/>
      {/* Head */}
      <circle cx={x} cy={y-3} r="2.2" fill="#c8a880"/>
      {/* Simple walking animation via transform */}
      <animateTransform attributeName="transform" type="translate"
        values={`0,0;${dir*8},0;${dir*16},0;${dir*8},0;0,0`}
        dur="12s" repeatCount="indefinite"/>
    </g>
  );
}

function Plot({ cx, cy, rx, ry, built }: { cx: number; cy: number; rx: number; ry: number; built: boolean }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx+4} ry={ry+3}
        fill={built ? "url(#vpb)" : "url(#vpe)"}
        opacity={built ? 0.75 : 0.4}
      />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="none"
        stroke={built ? "#7a6a40" : "#8a7a5a"}
        strokeWidth={built ? "1.2" : "0.8"}
        strokeDasharray={built ? "none" : "6,6"}
        opacity={built ? 0.35 : 0.25}
      />
      {built && <ellipse cx={cx} cy={cy-2} rx={rx*0.55} ry={ry*0.45} fill="#b8a060" opacity="0.06"/>}
      {!built && (
        <>
          <circle cx={cx-rx+4} cy={cy} r="1.5" fill="#7a6a4a" opacity="0.25"/>
          <circle cx={cx+rx-4} cy={cy} r="1.5" fill="#7a6a4a" opacity="0.25"/>
        </>
      )}
    </g>
  );
}
