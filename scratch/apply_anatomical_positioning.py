import os

# Read current file to get top and bottom sections
with open("src/components/ReceptorBodyPanel.jsx", "r", encoding="utf-8") as f:
    orig_lines = f.readlines()

body_svg_start = -1
for i, line in enumerate(orig_lines):
    if "const BodySvg = " in line:
        body_svg_start = i
        break

top_section = "".join(orig_lines[:body_svg_start])

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
      {/* Continuous Body Path (Neck, Arms, Torso, Legs - WIDER) */}
      <path d="M 160,143 C 135,132 80,112 50,105 C 38,102 34,118 42,125 C 75,150 110,165 138,175 C 138,210 144,235 142,260 C 140,285 132,295 128,310 C 122,350 107,410 97,470 C 90,485 120,485 125,470 C 138,430 160,375 180,330 C 200,375 222,430 235,470 C 240,485 270,485 265,470 C 255,370 240,350 232,310 C 230,295 220,295 218,260 C 216,235 222,210 222,175 C 250,165 285,150 320,125 C 328,118 324,102 310,105 C 280,112 225,132 200,143 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.2" style={{pointerEvents:'none'}}/>

      {/* ═══ REGION OVERLAYS — glow fills per pharmacological site ════════════ */}
      <circle cx="180" cy="105" r="32" {...region('brain')}/>
      <ellipse cx="192" cy="208" rx="22" ry="18" {...region('cardiac')}/>
      <ellipse cx="151" cy="205" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="209" cy="205" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="180" cy="275" rx="26" ry="24" {...region('gi')}/>
      <rect x="177" y="145" width="6" height="170" rx="3" {...region('arterial')}/>
      <rect x="177" y="145" width="6" height="170" rx="3" {...region('venous')}/>

      {/* ═══ VASCULAR LINES ═════════════════════════════════════════════════ */}
      {/* Aortic arch + descending */}
      <path d="M 186,192 L 186,310" {...line('arterial', 2.0)}/>
      {/* SVC */}
      <path d="M 174,155 L 174,190 C 174,196 182,196 182,196" {...line('venous', 1.6, '3,2.5')}/>
      {/* IVC */}
      <path d="M 174,215 L 174,310" {...line('venous', 1.6, '3,2.5')}/>
      {/* Arm vessels */}
      <path d="M 172,170 C 130,152 90,132 44,113" {...vessel('arterial')}/>
      <path d="M 188,170 C 230,152 270,132 316,113" {...vessel('arterial')}/>
      <path d="M 168,174 C 126,156 86,136 40,117" {...vessel('venous', true)}/>
      <path d="M 192,174 C 234,156 274,136 320,117" {...vessel('venous', true)}/>
      {/* Leg vessels */}
      <path d="M 176,310 C 165,336 142,385 105,460" {...vessel('arterial')}/>
      <path d="M 184,310 C 195,336 218,385 255,460" {...vessel('arterial')}/>
      <path d="M 173,310 C 162,338 139,387 102,462" {...vessel('venous', true)}/>
      <path d="M 187,310 C 198,338 221,387 258,462" {...vessel('venous', true)}/>

      {/* ═══ EXTERNAL SPINE WIDGET (ON THE RIGHT SIDE OUTSIDE BODY) ══════ */}
      <rect x="241" y="182" width="18" height="141" rx="4"
            fill="rgba(30,58,95,0.06)" stroke="rgba(30,58,95,0.25)" strokeWidth="0.8" style={{pointerEvents:'none'}}/>
      <path d="M 250,187 L 250,318" stroke={sg.spinal.color} strokeOpacity={sg.spinal.occ < 0.03 ? 0.08 : 0.15} strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {[190, 205, 220, 235, 250, 265, 280, 295, 310].map((y,i)=>(
        <rect key={`vert-group-${i}`} x="245" y={y-2.5} width="10" height="5" rx="1.5"
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

      {/* ═══ ORGANS — anatomical representations ════════════════════════ */}
      {/* Brain: two clean symmetric lobes + midline */}
      <path d="M 180,85 C 165,85 160,95 160,106 C 160,117 168,122 180,122 Z" {...vis('brain')}/>
      <path d="M 180,85 C 195,85 200,95 200,106 C 200,117 192,122 180,122 Z" {...vis('brain')}/>
      <line x1="180" y1="85" x2="180" y2="122" style={{pointerEvents:'none'}} stroke={sg.brain.color}
            strokeWidth="0.7" strokeDasharray="2.5,2" strokeOpacity={sg.brain.occ > 0.05 ? 0.6 : 0.2}/>

      {/* Heart: anatomical tilted ventricles + aorta loop (1/3 right, 2/3 left of midline) */}
      <path d="M 185,192 C 174,192 168,198 168,206 C 168,214 195,224 205,224 C 210,224 212,216 212,206 C 212,198 198,192 192,192 L 192,183 C 192,178 185,178 185,183 L 187,192 Z" {...vis('cardiac')}/>

      {/* Lungs: bilateral lobes with cardiac notch and fissures (CONTAINED IN BODY) */}
      {/* Viewer's Left Lung (Patient's Right Lung - 3 lobes) */}
      <path d="M 160,185 C 150,187 142,202 142,222 C 142,232 149,234 160,227 Z" {...vis('pulmonary')}/>
      <line x1="143" y1="205" x2="158" y2="225" stroke={sg.pulmonary.color} strokeOpacity={sg.pulmonary.occ > 0.05 ? 0.6 : 0.3} strokeWidth="0.8" style={{pointerEvents:'none'}}/>
      <line x1="149" y1="213" x2="160" y2="213" stroke={sg.pulmonary.color} strokeOpacity={sg.pulmonary.occ > 0.05 ? 0.6 : 0.3} strokeWidth="0.8" style={{pointerEvents:'none'}}/>

      {/* Viewer's Right Lung (Patient's Left Lung - 2 lobes + cardiac notch) */}
      <path d="M 200,185 C 210,187 218,202 218,222 C 218,232 211,234 200,227 C 204,222 206,216 205,210 C 204,204 200,200 200,185 Z" {...vis('pulmonary')}/>
      <line x1="217" y1="205" x2="203" y2="225" stroke={sg.pulmonary.color} strokeOpacity={sg.pulmonary.occ > 0.05 ? 0.6 : 0.3} strokeWidth="0.8" style={{pointerEvents:'none'}}/>

      {/* Trachea + main bronchi */}
      <line x1="180" y1="155" x2="180" y2="185" {...line('pulmonary', 1.6)}/>
      <path d="M 180,185 C 172,191 162,203" fill="none" {...line('pulmonary', 1.3)}/>
      <path d="M 180,185 C 188,191 198,203" fill="none" {...line('pulmonary', 1.3)}/>

      {/* GI: Stomach + Large Colon frame + small intestine loops */}
      {/* Stomach (patient's left side / viewer's right) */}
      <path d="M 186,242 C 196,242 202,250 202,260 C 202,272 188,274 176,270 C 172,268 170,262 174,258 C 180,254 185,254 188,250 C 190,247 188,244 186,242 Z" {...vis('gi')}/>
      {/* Haustrated Large Colon */}
      <path d="M 156,300 Q 153,295 156,290 Q 153,285 156,280 Q 154,275 160,275 Q 168,278 180,275 Q 192,278 200,275 Q 206,275 204,280 Q 207,285 204,290 Q 207,295 204,300 Q 192,304 180,302 Q 168,304 156,300 Z" {...vis('gi')}/>
      {/* Small Intestines loops */}
      <path d="M 162,282 C 160,288 174,292 180,288 C 186,292 200,288 198,282 C 196,276 164,276 162,282 C 160,288 180,294 180,286 C 180,294 200,288 198,282" fill="none" {...line('gi', 0.9)}/>

      {/* ═══ NMJ TARGET NODES — placed anatomically on muscle monitoring sites ══════ */}
      {[
        { cx: 194, cy: 100, label: "facial" },
        { cx: 42,  cy: 113, label: "left-wrist" },
        { cx: 318, cy: 113, label: "right-wrist" },
        { cx: 138, cy: 380, label: "left-knee" },
        { cx: 222, cy: 380, label: "right-knee" }
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
        <path d="M 154,205 L 115,110 L 70,110" fill="none" stroke={sg.pulmonary.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="154" cy="205" r="2" fill={sg.pulmonary.color} style={{pointerEvents:'none'}} />
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
        <path d="M 138,380 L 115,360 L 70,360" fill="none" stroke={sg.nmj.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="138" cy="380" r="2" fill={sg.nmj.color} style={{pointerEvents:'none'}} />
        <text x="65" y="356" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.nmj.color} style={{pointerEvents:'none'}}>NMJ</text>
        <text x="65" y="367" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.nmj.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.nmj.occ * 100)}%</text>
        <rect x="35" y="370" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="370" width={30 * sg.nmj.occ} height="2" fill={sg.nmj.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="346" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* HEART Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}>
        <path d="M 206,208 L 245,110 L 290,110" fill="none" stroke={sg.cardiac.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="206" cy="208" r="2" fill={sg.cardiac.color} style={{pointerEvents:'none'}} />
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

      {/* SPINE Callout Group (POINTS TO THE FLOATING SPINE PANEL) */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}>
        <path d="M 250,250 L 290,250" fill="none" stroke={sg.spinal.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="250" cy="250" r="2" fill={sg.spinal.color} style={{pointerEvents:'none'}} />
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
      <ellipse cx="151" cy="205" rx="14" ry="24" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      <ellipse cx="209" cy="205" rx="14" ry="24" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      {/* Heart */}
      <ellipse cx="192" cy="208" rx="22" ry="18" {...hit()} onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}/>
      {/* Arterial */}
      <rect x="183" y="145" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}/>
      {/* Venous */}
      <rect x="172" y="145" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}/>
      {/* Spine (OVERLAYS SPINE PANEL) */}
      <rect x="241" y="182" width="18" height="141" rx="4" {...hit()} onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}/>
      {/* GI Tract */}
      <ellipse cx="180" cy="275" rx="30" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}/>
      {/* NMJ - 5 site triggers */}
      <circle cx="194" cy="100" r="14" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="42"  cy="113" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="318" cy="113" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="138" cy="380" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="222" cy="380" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
    </svg>
  );
};"""

with open("src/components/ReceptorBodyPanel.jsx", "w", encoding="utf-8") as f:
    f.write(top_section)
    f.write(new_body_svg)
    f.write(bottom_section)

print("ANATOMICAL POSITIONING ASSEMBLY COMPLETE!")
