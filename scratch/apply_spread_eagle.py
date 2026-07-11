import os

# Read current file to get top and bottom sections
with open("src/components/ReceptorBodyPanel.jsx", "r", encoding="utf-8") as f:
    orig_lines = f.readlines()

# The top section goes up to the start of BodySvg
# We find where const BodySvg begins
body_svg_start = -1
for i, line in enumerate(orig_lines):
    if "const BodySvg = " in line:
        body_svg_start = i
        break

top_section = "".join(orig_lines[:body_svg_start])

# The bottom section starts from ANS BALANCE PANEL
bottom_start = -1
for i, line in enumerate(orig_lines):
    if "ANS BALANCE PANEL" in line and "// ──" in orig_lines[i-1]:
        bottom_start = i - 1
        break

if bottom_start == -1:
    for i, line in enumerate(orig_lines):
        if "const ANSPanel =" in line:
            bottom_start = i
            break

bottom_section = "".join(orig_lines[bottom_start:])

# The new BodySvg component for the spread-eagle outline
new_body_svg = """const BodySvg = ({ activity, hoveredSite, onSiteEnter, onSiteLeave }) => {
  const sg = useMemo(() => {
    const compute = (site) => {
      const occ = siteMaxOcc(activity[site]);
      if (occ < 0.03) return { occ: 0, color: "#1e3a5f", bar: "#1e3a5f" };
      const receptors = Object.values(activity[site] || {});
      const dominant = receptors.reduce((a, b) => (a.occ > b.occ ? a : b), { occ: 0, color: "blue" });
      const col = getColor(dominant);
      return { occ, color: col.bar, bar: col.bar };
    };
    return {
      brain: compute("brain"), cardiac: compute("cardiac"), arterial: compute("arterial"),
      venous: compute("venous"), pulmonary: compute("pulmonary"), nmj: compute("nmj"),
      gi: compute("gi"), spinal: compute("spinal"),
    };
  }, [activity]);

  const vis = (site) => {
    const { occ, color } = sg[site];
    const active = hoveredSite === site;
    return {
      pointerEvents: "none",
      fill: color,
      fillOpacity: active ? Math.min(0.9, 0.26 + occ * 0.62 + 0.14) : Math.max(0.07, 0.09 + occ * 0.55),
      stroke: color,
      strokeOpacity: active ? 0.95 : (occ > 0.05 ? 0.70 : 0.22),
      strokeWidth: active ? 1.9 : 1.1,
      filter: (active || occ > 0.25) ? "url(#gbody)" : undefined,
      transition: "fill 0.3s,stroke 0.3s,fill-opacity 0.3s,stroke-opacity 0.3s",
    };
  };

  const line = (site, sw = 1.8, dash) => ({
    ...vis(site), fill: "none", strokeWidth: sw,
    strokeDasharray: dash || undefined,
  });

  const region = (site) => {
    const { occ, color } = sg[site];
    const active = hoveredSite === site;
    return {
      pointerEvents: "none", stroke: "none",
      fill: color,
      fillOpacity: active ? Math.max(0.14, 0.06 + occ * 0.22) : Math.max(0.03, 0.02 + occ * 0.13),
      transition: "fill-opacity 0.35s,fill 0.35s",
    };
  };

  const vessel = (site, dashed = false) => {
    const { occ, color } = sg[site];
    const active = hoveredSite === site;
    return {
      pointerEvents: "none", fill: "none", stroke: color,
      strokeOpacity: active ? 0.95 : (occ > 0.08 ? 0.70 : 0.22),
      strokeWidth: active ? 2.6 : 1.9,
      strokeDasharray: dashed ? "5,3.5" : undefined,
      filter: (active || occ > 0.22) ? "url(#gbody)" : undefined,
      transition: "stroke 0.3s,stroke-opacity 0.3s",
    };
  };

  const hit = () => ({ fill: "transparent", stroke: "none", cursor: "pointer" });

  return (
    <svg viewBox="0 0 360 510" className="w-full select-none" style={{ height: "auto", display: "block" }}>
      <defs>
        <filter id="gbody" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ═══ BODY SILHOUETTE — sleek medical wireframe, spread-eagle contour ══════ */}
      {/* Head - perfect circle */}
      <circle cx="180" cy="105" r="38" fill="#050a15" stroke="#11223e" strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {/* Continuous Body Path (Neck, Arms, Torso, Legs) */}
      <path d="M 162,143 C 140,132 90,112 60,105 C 48,102 44,118 52,125 C 85,150 120,165 144,175 C 144,210 150,235 148,260 C 146,285 138,295 136,310 C 130,350 115,410 105,470 C 100,485 125,485 130,470 C 145,430 165,375 180,330 C 195,375 215,430 230,470 C 235,485 260,485 255,470 C 245,370 230,350 224,310 C 222,295 214,285 212,260 C 210,235 216,210 216,175 C 240,165 275,150 308,125 C 316,118 312,102 300,105 C 270,112 220,132 198,143 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.2" style={{pointerEvents:'none'}}/>

      {/* ═══ REGION OVERLAYS — glow fills per pharmacological site ════════════ */}
      <circle cx="180" cy="105" r="32" {...region('brain')}/>
      <ellipse cx="202" cy="208" rx="16" ry="18" {...region('cardiac')}/>
      <ellipse cx="158" cy="205" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="202" cy="205" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="180" cy="275" rx="22" ry="24" {...region('gi')}/>
      <rect x="177" y="145" width="6" height="170" rx="3" {...region('arterial')}/>
      <rect x="177" y="145" width="6" height="170" rx="3" {...region('venous')}/>

      {/* ═══ VASCULAR LINES ═════════════════════════════════════════════════ */}
      {/* Aortic arch + descending */}
      <path d="M 198,198 L 198,175 C 198,165 186,164 186,175 L 186,310" {...line('arterial', 2.0)}/>
      {/* SVC */}
      <path d="M 174,155 L 174,190 C 174,196 182,196 182,196" {...line('venous', 1.6, '3,2.5')}/>
      {/* IVC */}
      <path d="M 182,215 C 176,215 176,223 176,223 L 176,310" {...line('venous', 1.6, '3,2.5')}/>
      {/* Arm vessels */}
      <path d="M 172,170 C 136,155 104,135 60,113" {...vessel('arterial')}/>
      <path d="M 188,170 C 224,155 256,135 300,113" {...vessel('arterial')}/>
      <path d="M 168,174 C 132,159 100,139 56,117" {...vessel('venous', true)}/>
      <path d="M 192,174 C 228,159 260,139 304,117" {...vessel('venous', true)}/>
      {/* Leg vessels */}
      <path d="M 176,310 C 168,336 147,385 115,460" {...vessel('arterial')}/>
      <path d="M 184,310 C 192,336 213,385 245,460" {...vessel('arterial')}/>
      <path d="M 173,310 C 165,338 144,387 112,462" {...vessel('venous', true)}/>
      <path d="M 187,310 C 195,338 216,387 248,462" {...vessel('venous', true)}/>

      {/* ═══ SPINE BACKGROUND — vertebral column running down midline ══════ */}
      <path d="M 180,143 L 180,315" stroke={sg.spinal.color} strokeOpacity={sg.spinal.occ < 0.03 ? 0.08 : 0.15} strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {[145, 160, 175, 190, 205, 220, 235, 250, 265, 280, 295, 310].map((y,i)=>(
        <rect key={`vert-group-${i}`} x="175" y={y-2.5} width="10" height="5" rx="1.5"
              fill={sg.spinal.color}
              fillOpacity={sg.spinal.occ < 0.03 ? 0.08 : 0.13 + sg.spinal.occ * 0.50}
              stroke={sg.spinal.color}
              strokeOpacity={sg.spinal.occ > 0.05 ? 0.55 : 0.17}
              strokeWidth="0.8"
              style={{
                pointerEvents: 'none',
                filter: (hoveredSite === 'spinal' || sg.spinal.occ > 0.22) ? 'url(#gbody)' : undefined,
                transition: 'all 0.25s'
              }}
        />
      ))}

      {/* ═══ ORGANS — minimal iconic representations ════════════════════════ */}
      {/* Brain: two clean symmetric lobes + midline */}
      <path d="M 180,85 C 165,85 160,95 160,106 C 160,117 168,122 180,122 Z" {...vis('brain')}/>
      <path d="M 180,85 C 195,85 200,95 200,106 C 200,117 192,122 180,122 Z" {...vis('brain')}/>
      <line x1="180" y1="85" x2="180" y2="122" style={{pointerEvents:'none'}} stroke={sg.brain.color}
            strokeWidth="0.7" strokeDasharray="2.5,2" strokeOpacity={sg.brain.occ > 0.05 ? 0.6 : 0.2}/>

      {/* Heart: clean stylized vector heart (anatomically left = viewer right) */}
      <path d="M 202,198 C 198,192 193,192 193,201 C 193,211 202,224 202,224 C 202,224 211,211 211,201 C 211,192 206,192 202,198 Z"
            {...vis('cardiac')}/>

      {/* Lungs: bilateral simple arches */}
      <path d="M 158,185 C 150,187 147,202 147,220 C 147,232 152,234 159,227 C 164,220 167,202 165,187 Z" {...vis('pulmonary')}/>
      <path d="M 201,185 C 210,187 213,202 213,220 C 213,232 208,234 201,227 C 196,220 193,202 195,187 Z" {...vis('pulmonary')}/>
      {/* Trachea + main bronchi */}
      <line x1="180" y1="155" x2="180" y2="185" {...line('pulmonary', 1.6)}/>
      <path d="M 180,185 C 172,191 162,203" fill="none" {...line('pulmonary', 1.3)}/>
      <path d="M 180,185 C 188,191 198,203" fill="none" {...line('pulmonary', 1.3)}/>

      {/* GI: single clean stomach + intestinal loop */}
      <path d="M 172,261 C 172,253 194,251 194,263 C 194,273 184,279 174,275 C 168,272 172,265 172,261 Z" {...vis('gi')}/>
      <path d="M 170,279 C 170,287 190,287 190,281 C 190,275 170,275 170,283 C 170,291 190,291 190,285 C 190,281 180,281 180,281" {...line('gi', 0.9)}/>

      {/* ═══ NMJ TARGET NODES — placed anatomically on muscle monitoring sites ══════ */}
      {[
        { cx: 194, cy: 100, label: "facial" },
        { cx: 58,  cy: 113, label: "left-wrist" },
        { cx: 302, cy: 113, label: "right-wrist" },
        { cx: 128, cy: 380, label: "left-knee" },
        { cx: 232, cy: 380, label: "right-knee" }
      ].map((pt) => (
        <g key={`nmj-${pt.label}`} style={{ pointerEvents: 'none' }}>
          <circle cx={pt.cx} cy={pt.cy} r="2.5" fill={sg.nmj.color}
                  fillOpacity={sg.nmj.occ > 0.05 ? 0.90 : 0.30}
                  stroke={sg.nmj.color} strokeWidth="0.5" />
          <circle cx={pt.cx} cy={pt.cy} r="6.5" fill="none" stroke={sg.nmj.color}
                  strokeWidth="0.6" strokeDasharray="2,1.5"
                  strokeOpacity={sg.nmj.occ > 0.05 ? 0.70 : 0.22}
                  style={{
                    filter: (hoveredSite === 'nmj' || sg.nmj.occ > 0.25) ? 'url(#gbody)' : undefined,
                    transition: 'stroke-opacity 0.3s'
                  }} />
        </g>
      ))}

      {/* ═══ CALLOUT GROUPS — symmetrical lines & text labels (clipping fixed) ═══ */}
      {/* CNS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('brain')} onMouseLeave={onSiteLeave}>
        <path d="M 172,105 L 115,30 L 70,30" fill="none" stroke={sg.brain.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="172" cy="105" r="2" fill={sg.brain.color} style={{pointerEvents:'none'}} />
        <text x="65" y="26" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.brain.color} style={{pointerEvents:'none'}}>CNS</text>
        <text x="65" y="37" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.brain.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.brain.occ * 100)}%</text>
        <rect x="35" y="40" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="40" width={30 * sg.brain.occ} height="2" fill={sg.brain.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="16" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* LUNGS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}>
        <path d="M 158,205 L 115,110 L 70,110" fill="none" stroke={sg.pulmonary.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="158" cy="205" r="2" fill={sg.pulmonary.color} style={{pointerEvents:'none'}} />
        <text x="65" y="106" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.pulmonary.color} style={{pointerEvents:'none'}}>LUNGS</text>
        <text x="65" y="117" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.pulmonary.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.pulmonary.occ * 100)}%</text>
        <rect x="35" y="120" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="120" width={30 * sg.pulmonary.occ} height="2" fill={sg.pulmonary.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="96" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* ARTERIAL Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}>
        <path d="M 186,260 L 115,180 L 70,180" fill="none" stroke={sg.arterial.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="186" cy="260" r="2" fill={sg.arterial.color} style={{pointerEvents:'none'}} />
        <text x="65" y="176" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.arterial.color} style={{pointerEvents:'none'}}>ARTERIAL</text>
        <text x="65" y="187" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.arterial.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.arterial.occ * 100)}%</text>
        <rect x="35" y="190" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="190" width={30 * sg.arterial.occ} height="2" fill={sg.arterial.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="166" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* GI TRACT Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}>
        <path d="M 175,275 L 115,260 L 70,260" fill="none" stroke={sg.gi.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="175" cy="275" r="2" fill={sg.gi.color} style={{pointerEvents:'none'}} />
        <text x="65" y="256" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.gi.color} style={{pointerEvents:'none'}}>GI TRACT</text>
        <text x="65" y="267" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.gi.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.gi.occ * 100)}%</text>
        <rect x="35" y="270" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="270" width={30 * sg.gi.occ} height="2" fill={sg.gi.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="246" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* NMJ Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}>
        <path d="M 128,380 L 115,360 L 70,360" fill="none" stroke={sg.nmj.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="128" cy="380" r="2" fill={sg.nmj.color} style={{pointerEvents:'none'}} />
        <text x="65" y="356" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.nmj.color} style={{pointerEvents:'none'}}>NMJ</text>
        <text x="65" y="367" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.nmj.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.nmj.occ * 100)}%</text>
        <rect x="35" y="370" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="370" width={30 * sg.nmj.occ} height="2" fill={sg.nmj.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="346" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* HEART Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}>
        <path d="M 202,208 L 245,110 L 290,110" fill="none" stroke={sg.cardiac.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="202" cy="208" r="2" fill={sg.cardiac.color} style={{pointerEvents:'none'}} />
        <text x="295" y="106" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.cardiac.color} style={{pointerEvents:'none'}}>HEART</text>
        <text x="295" y="117" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.cardiac.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.cardiac.occ * 100)}%</text>
        <rect x="295" y="120" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="120" width={30 * sg.cardiac.occ} height="2" fill={sg.cardiac.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="96" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* VENOUS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}>
        <path d="M 182,230 L 245,180 L 290,180" fill="none" stroke={sg.venous.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="182" cy="230" r="2" fill={sg.venous.color} style={{pointerEvents:'none'}} />
        <text x="295" y="176" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.venous.color} style={{pointerEvents:'none'}}>VENOUS</text>
        <text x="295" y="187" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.venous.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.venous.occ * 100)}%</text>
        <rect x="295" y="190" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="190" width={30 * sg.venous.occ} height="2" fill={sg.venous.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="166" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* SPINE Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}>
        <path d="M 180,250 L 245,250 L 290,250" fill="none" stroke={sg.spinal.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="180" cy="250" r="2" fill={sg.spinal.color} style={{pointerEvents:'none'}} />
        <text x="295" y="246" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.spinal.color} style={{pointerEvents:'none'}}>SPINE</text>
        <text x="295" y="257" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.spinal.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.spinal.occ * 100)}%</text>
        <rect x="295" y="249" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="249" width={30 * sg.spinal.occ} height="2" fill={sg.spinal.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="236" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* ═══ MOUSE HOVER HITBOXES — invisible overlays for easy selection ═══ */}
      {/* Brain/CNS */}
      <circle cx="180" cy="105" r="32" {...hit()} onMouseEnter={()=>onSiteEnter('brain')} onMouseLeave={onSiteLeave}/>
      {/* Lungs */}
      <ellipse cx="158" cy="205" rx="18" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      <ellipse cx="202" cy="205" rx="18" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      {/* Heart */}
      <ellipse cx="202" cy="208" rx="22" ry="20" {...hit()} onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}/>
      {/* Arterial */}
      <rect x="183" y="145" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}/>
      {/* Venous */}
      <rect x="172" y="145" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}/>
      {/* Spine */}
      <rect x="177" y="145" width="6" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}/>
      {/* GI Tract */}
      <ellipse cx="180" cy="275" rx="26" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}/>
      {/* NMJ - 5 site triggers */}
      <circle cx="194" cy="100" r="14" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="58" cy="113" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="302" cy="113" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="128" cy="380" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="232" cy="380" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
    </svg>
  );
};
"""

# Combine sections and write to file
with open("src/components/ReceptorBodyPanel.jsx", "w", encoding="utf-8") as f:
    f.write(top_section)
    f.write(new_body_svg)
    f.write(bottom_section)

print("SPREAD EAGLE ASSEMBLY COMPLETE!")
