import os

# Read the intact top section from the workspace file (lines 1 to 579)
# We can read ReceptorBodyPanel.jsx and extract lines up to the beginning of computeNetEffect
with open("src/components/ReceptorBodyPanel.jsx", "r", encoding="utf-8") as f:
    orig_lines = f.readlines()

# Let's verify line 575 is "function computeNetEffect(contribs) {"
# Note: orig_lines is 0-indexed, so line 575 is index 574
top_section = "".join(orig_lines[:579])

# The deleted middle functions from ReceptorBodyPanel.jsx
middle_functions = """      case 'agonist':        agScore  += occ; break;
      case 'partial':        agScore  += occ * 0.5; break;
      case 'pam':            pamBoost += occ * 0.55; break;
      case 'nam':            antScore += occ * 0.4; break;
      case 'competitive':    antScore += occ; break;
      case 'noncompetitive': antScore += occ * 0.85; break;
      case 'channel_block':  antScore += occ * 0.9; break;
      case 'enzyme_inhibit': agScore  += occ; break;
      case 'depolarizing':   agScore  += occ * 0.15; antScore += occ * 0.75; break;
      case 'chelation':      agScore  += occ; break;  // removes NMB → restores activation
      default:               agScore  += occ * 0.5;
    }
  });
  const effectiveAg = Math.min(1.2, agScore * (1 + pamBoost));
  const net = Math.max(-1, Math.min(1, effectiveAg - antScore));
  let label, color;
  if (net > 0.18) { label = 'AGONISM PREVAILS';  color = '#34d399'; }
  else if (net < -0.18) { label = 'BLOCKADE PREVAILS'; color = '#f87171'; }
  else { label = 'BALANCED / PARTIAL'; color = '#fbbf24'; }
  return { net: parseFloat(net.toFixed(3)), agScore: Math.min(1,agScore), antScore: Math.min(1,antScore), pamBoost, label, color };
}

function computeActivity(activeMeds, vitals) {
  const sites = { brain: {}, cardiac: {}, arterial: {}, venous: {}, pulmonary: {}, nmj: {}, gi: {}, spinal: {} };
  const currentMac = vitals?.mac || 0;

  const merge = (site, receptor, occ, entry, drugName) => {
    if (!sites[site]) return;
    const mech = getMech(drugName, receptor, entry.action);
    if (!sites[site][receptor]) {
      sites[site][receptor] = { occ: 0, action: entry.action, color: entry.color, label: entry.label, detail: entry.detail, drugs: [], contribs: [] };
    }
    const rec = sites[site][receptor];
    if (occ > rec.occ) {
      rec.occ = occ; rec.action = entry.action; rec.color = entry.color;
      rec.label = entry.label; rec.detail = entry.detail;
    }
    if (!rec.drugs.includes(drugName)) rec.drugs.push(drugName);
    // Track per-drug contribution with mechanism
    if (!rec.contribs.find(c => c.name === drugName && c.receptor === receptor)) {
      rec.contribs.push({ name: drugName, occ, mech, action: entry.action, color: entry.color, label: entry.label, detail: entry.detail });
    }
  };

  (activeMeds || []).forEach(model => {
    if (!model?.name || !model.Ce || model.Ce <= 0) return;
    const entries = DRUG_RECEPTOR_MAP[model.name];
    if (!entries) return;
    entries.forEach(entry => {
      const Ce = entry.isMac ? currentMac : model.Ce;
      const occ = hillOcc(Ce, entry.c50, entry.gamma);
      if (occ < 0.02) return;
      merge(entry.site, entry.receptor, occ, entry, model.name);
    });
  });

  // Compute net effect for each receptor after all drugs are merged
  Object.values(sites).forEach(site => {
    Object.values(site).forEach(rec => { rec.netEffect = computeNetEffect(rec.contribs); });
  });

  return sites;
}

// Colour palette per action type
const ACTION_COLORS = {
  agonist:    { bar: '#22d3ee', glow: 'rgba(34,211,238,', border: '#0891b2', text: '#a5f3fc', label: 'AGONIST' },
  antagonist: { bar: '#f87171', glow: 'rgba(248,113,113,', border: '#dc2626', text: '#fca5a5', label: 'ANTAGONIST' },
  modulator:  { bar: '#a78bfa', glow: 'rgba(167,139,250,', border: '#7c3aed', text: '#c4b5fd', label: 'MODULATOR' },
  inhibitor:  { bar: '#fb923c', glow: 'rgba(251,146,60,',  border: '#ea580c', text: '#fed7aa', label: 'INHIBITOR' },
};

// Override color based on drug-semantic color field
const SEMANTIC_COLORS = {
  blue:   { bar: '#818cf8', glow: 'rgba(129,140,248,', border: '#4f46e5', text: '#c7d2fe', label: '↓ CNS' },
  green:  { bar: '#34d399', glow: 'rgba(52,211,153,',  border: '#059669', text: '#a7f3d0', label: '↑ ACTIVE' },
  red:    { bar: '#f87171', glow: 'rgba(248,113,113,', border: '#dc2626', text: '#fca5a5', label: '↓ BLOCKED' },
  amber:  { bar: '#fbbf24', glow: 'rgba(251,191,36,',  border: '#d97706', text: '#fde68a', label: '± MIXED' },
  violet: { bar: '#c084fc', glow: 'rgba(192,132,252,', border: '#9333ea', text: '#e9d5ff', label: 'MODULATES' },
};

const getColor = (entry) => SEMANTIC_COLORS[entry.color] || ACTION_COLORS[entry.action] || ACTION_COLORS.agonist;

// Max occupancy across a site's receptors → glow intensity 0-1
const siteMaxOcc = (siteMap) => Math.max(0, ...Object.values(siteMap || {}).map(r => r.occ));

const SITE_META = {
  brain:     { label: "Brain / CNS",        short: "CNS",   icon: "🧠" },
  cardiac:   { label: "Heart",              short: "HEART", icon: "♥" },
  arterial:  { label: "Systemic Arteries",  short: "ART",   icon: "〜" },
  venous:    { label: "Venous System",       short: "VEN",   icon: "≈" },
  pulmonary: { label: "Pulmonary",          short: "PULM",  icon: "🫁" },
  nmj:       { label: "Neuromuscular Jxn",  short: "NMJ",   icon: "⚡" },
  gi:        { label: "GI / Smooth Muscle", short: "GI",    icon: "⊙" },
  spinal:    { label: "Spinal / Pain",      short: "SPINE", icon: "⋮" },
};
"""

# The brand new redesigned BodySvg component
new_body_svg = """
const BodySvg = ({ activity, hoveredSite, onSiteEnter, onSiteLeave }) => {
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

      {/* ═══ BODY SILHOUETTE — sleek medical wireframe, contoured form ══════ */}
      {/* Head */}
      <path d="M 180,44 C 160,44 154,58 154,72 C 154,88 166,96 172,99 L 180,102 L 188,99 C 194,96 206,88 206,72 C 206,58 200,44 180,44 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {/* Neck */}
      <path d="M 174,99 L 174,112 L 186,112 L 186,99 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1" style={{pointerEvents:'none'}}/>
      {/* Torso — tapered at waist */}
      <path d="M 174,108 C 160,108 144,114 144,124 L 144,190 C 144,225 152,245 148,290 L 212,290 C 208,245 216,225 216,190 L 216,124 C 216,114 200,108 186,108 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {/* Left arm — organic bend at elbow */}
      <path d="M 144,118 C 120,122 100,140 92,185 C 85,225 80,245 88,248 C 96,250 102,230 110,195 C 120,155 136,132 144,124 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.1" style={{pointerEvents:'none'}}/>
      {/* Right arm — mirrored */}
      <path d="M 216,118 C 240,122 260,140 268,185 C 275,225 280,245 272,248 C 264,250 258,230 250,195 C 240,155 224,132 216,124 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.1" style={{pointerEvents:'none'}}/>
      {/* Left leg — tapered */}
      <path d="M 148,290 C 148,340 144,380 144,420 C 144,455 142,475 149,478 C 156,480 160,460 160,420 C 160,370 163,330 163,290 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.1" style={{pointerEvents:'none'}}/>
      {/* Right leg — mirrored */}
      <path d="M 197,290 C 197,330 200,370 200,420 C 200,460 204,480 211,478 C 218,475 216,455 216,420 C 216,380 212,340 212,290 Z"
            fill="#050a15" stroke="#11223e" strokeWidth="1.1" style={{pointerEvents:'none'}}/>

      {/* ═══ REGION OVERLAYS — glow fills per pharmacological site ════════════ */}
      <circle cx="180" cy="70" r="23" {...region('brain')}/>
      <ellipse cx="202" cy="185" rx="16" ry="18" {...region('cardiac')}/>
      <ellipse cx="162" cy="182" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="198" cy="182" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="180" cy="252" rx="22" ry="24" {...region('gi')}/>
      <rect x="177" y="120" width="6" height="170" rx="3" {...region('arterial')}/>
      <rect x="177" y="120" width="6" height="170" rx="3" {...region('venous')}/>

      {/* ═══ VASCULAR LINES ═════════════════════════════════════════════════ */}
      {/* Aortic arch + descending */}
      <path d="M 198,175 L 198,153 C 198,143 186,142 186,153 L 186,290" {...line('arterial', 2.0)}/>
      {/* SVC */}
      <path d="M 174,133 L 174,168 C 174,174 182,174 182,174" {...line('venous', 1.6, '3,2.5')}/>
      {/* IVC */}
      <path d="M 182,192 C 176,192 176,200 176,200 L 176,290" {...line('venous', 1.6, '3,2.5')}/>
      {/* Arm vessels */}
      <path d="M 172,148 C 136,168 104,198 92,218" {...vessel('arterial')}/>
      <path d="M 188,148 C 224,168 256,198 268,218" {...vessel('arterial')}/>
      <path d="M 168,152 C 132,172 100,202 88,222" {...vessel('venous', true)}/>
      <path d="M 192,152 C 228,172 260,202 272,222" {...vessel('venous', true)}/>
      {/* Leg vessels */}
      <path d="M 176,290 C 168,316 164,355 152,460" {...vessel('arterial')}/>
      <path d="M 184,290 C 192,316 196,355 208,460" {...vessel('arterial')}/>
      <path d="M 173,290 C 165,318 161,358 150,460" {...vessel('venous', true)}/>
      <path d="M 187,290 C 195,318 199,358 210,460" {...vessel('venous', true)}/>

      {/* ═══ SPINE BACKGROUND — vertebral column running down midline ══════ */}
      <path d="M 180,120 L 180,290" stroke={sg.spinal.color} strokeOpacity={sg.spinal.occ < 0.03 ? 0.08 : 0.15} strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {[120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285].map((y,i)=>(
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
      <path d="M 180,55 C 167,55 164,65 164,74 C 164,83 170,87 180,87 Z" {...vis('brain')}/>
      <path d="M 180,55 C 193,55 196,65 196,74 C 196,83 190,87 180,87 Z" {...vis('brain')}/>
      <line x1="180" y1="55" x2="180" y2="87" style={{pointerEvents:'none'}} stroke={sg.brain.color}
            strokeWidth="0.7" strokeDasharray="2.5,2" strokeOpacity={sg.brain.occ > 0.05 ? 0.6 : 0.2}/>

      {/* Heart: clean stylized vector heart (anatomically left = viewer right) */}
      <path d="M 202,175 C 198,169 193,169 193,178 C 193,188 202,201 202,201 C 202,201 211,188 211,178 C 211,169 206,169 202,175 Z"
            {...vis('cardiac')}/>

      {/* Lungs: bilateral simple arches */}
      <path d="M 163,163 C 154,165 151,180 151,198 C 151,210 156,212 163,205 C 168,198 171,180 169,165 Z" {...vis('pulmonary')}/>
      <path d="M 197,163 C 206,165 209,180 209,198 C 209,210 204,212 197,205 C 192,198 189,180 191,165 Z" {...vis('pulmonary')}/>
      {/* Trachea + main bronchi */}
      <line x1="180" y1="128" x2="180" y2="162" {...line('pulmonary', 1.6)}/>
      <path d="M 180,162 C 172,168 164,180" fill="none" {...line('pulmonary', 1.3)}/>
      <path d="M 180,162 C 188,168 196,180" fill="none" {...line('pulmonary', 1.3)}/>

      {/* GI: single clean stomach + intestinal loop */}
      <path d="M 172,238 C 172,230 194,228 194,240 C 194,250 184,256 174,252 C 168,249 172,242 172,238 Z" {...vis('gi')}/>
      <path d="M 170,256 C 170,264 190,264 190,258 C 190,252 170,252 170,260 C 170,268 190,268 190,262 C 190,258 180,258 180,258" {...line('gi', 0.9)}/>

      {/* ═══ NMJ TARGET NODES — placed anatomically on muscle monitoring sites ══════ */}
      {[
        { cx: 194, cy: 65, label: "facial" },
        { cx: 90,  cy: 240, label: "left-wrist" },
        { cx: 270, cy: 240, label: "right-wrist" },
        { cx: 148, cy: 390, label: "left-knee" },
        { cx: 212, cy: 390, label: "right-knee" }
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
        <path d="M 172,70 L 115,30 L 70,30" fill="none" stroke={sg.brain.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="172" cy="70" r="2" fill={sg.brain.color} style={{pointerEvents:'none'}} />
        <text x="65" y="26" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.brain.color} style={{pointerEvents:'none'}}>CNS</text>
        <text x="65" y="37" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.brain.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.brain.occ * 100)}%</text>
        <rect x="35" y="40" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="40" width={30 * sg.brain.occ} height="2" fill={sg.brain.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="16" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* LUNGS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}>
        <path d="M 158,185 L 115,110 L 70,110" fill="none" stroke={sg.pulmonary.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="158" cy="185" r="2" fill={sg.pulmonary.color} style={{pointerEvents:'none'}} />
        <text x="65" y="106" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.pulmonary.color} style={{pointerEvents:'none'}}>LUNGS</text>
        <text x="65" y="117" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.pulmonary.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.pulmonary.occ * 100)}%</text>
        <rect x="35" y="120" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="120" width={30 * sg.pulmonary.occ} height="2" fill={sg.pulmonary.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="96" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* ARTERIAL Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}>
        <path d="M 186,220 L 115,180 L 70,180" fill="none" stroke={sg.arterial.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="186" cy="220" r="2" fill={sg.arterial.color} style={{pointerEvents:'none'}} />
        <text x="65" y="176" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.arterial.color} style={{pointerEvents:'none'}}>ARTERIAL</text>
        <text x="65" y="187" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.arterial.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.arterial.occ * 100)}%</text>
        <rect x="35" y="190" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="190" width={30 * sg.arterial.occ} height="2" fill={sg.arterial.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="166" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* GI TRACT Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}>
        <path d="M 175,255 L 115,260 L 70,260" fill="none" stroke={sg.gi.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="175" cy="255" r="2" fill={sg.gi.color} style={{pointerEvents:'none'}} />
        <text x="65" y="256" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.gi.color} style={{pointerEvents:'none'}}>GI TRACT</text>
        <text x="65" y="267" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.gi.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.gi.occ * 100)}%</text>
        <rect x="35" y="270" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="270" width={30 * sg.gi.occ} height="2" fill={sg.gi.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="246" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* NMJ Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}>
        <path d="M 148,390 L 115,360 L 70,360" fill="none" stroke={sg.nmj.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="148" cy="390" r="2" fill={sg.nmj.color} style={{pointerEvents:'none'}} />
        <text x="65" y="356" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.nmj.color} style={{pointerEvents:'none'}}>NMJ</text>
        <text x="65" y="367" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.nmj.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.nmj.occ * 100)}%</text>
        <rect x="35" y="370" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="370" width={30 * sg.nmj.occ} height="2" fill={sg.nmj.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="346" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* HEART Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}>
        <path d="M 202,185 L 245,110 L 290,110" fill="none" stroke={sg.cardiac.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="202" cy="185" r="2" fill={sg.cardiac.color} style={{pointerEvents:'none'}} />
        <text x="295" y="106" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.cardiac.color} style={{pointerEvents:'none'}}>HEART</text>
        <text x="295" y="117" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.cardiac.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.cardiac.occ * 100)}%</text>
        <rect x="295" y="120" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="120" width={30 * sg.cardiac.occ} height="2" fill={sg.cardiac.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="96" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* VENOUS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}>
        <path d="M 182,210 L 245,180 L 290,180" fill="none" stroke={sg.venous.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="182" cy="210" r="2" fill={sg.venous.color} style={{pointerEvents:'none'}} />
        <text x="295" y="176" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.venous.color} style={{pointerEvents:'none'}}>VENOUS</text>
        <text x="295" y="187" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.venous.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.venous.occ * 100)}%</text>
        <rect x="295" y="190" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="190" width={30 * sg.venous.occ} height="2" fill={sg.venous.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="166" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* SPINE Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}>
        <path d="M 180,240 L 245,250 L 290,250" fill="none" stroke={sg.spinal.color} strokeWidth="0.8" strokeOpacity="0.6" style={{pointerEvents:'none'}} />
        <circle cx="180" cy="240" r="2" fill={sg.spinal.color} style={{pointerEvents:'none'}} />
        <text x="295" y="246" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.spinal.color} style={{pointerEvents:'none'}}>SPINE</text>
        <text x="295" y="257" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.spinal.color} fillOpacity="0.65" style={{pointerEvents:'none'}}>{Math.round(sg.spinal.occ * 100)}%</text>
        <rect x="295" y="249" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="249" width={30 * sg.spinal.occ} height="2" fill={sg.spinal.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="236" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* ═══ MOUSE HOVER HITBOXES — invisible overlays for easy selection ═══ */}
      {/* Brain/CNS */}
      <circle cx="180" cy="70" r="32" {...hit()} onMouseEnter={()=>onSiteEnter('brain')} onMouseLeave={onSiteLeave}/>
      {/* Lungs */}
      <ellipse cx="162" cy="182" rx="18" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      <ellipse cx="198" cy="182" rx="18" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      {/* Heart */}
      <ellipse cx="202" cy="185" rx="22" ry="20" {...hit()} onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}/>
      {/* Arterial */}
      <rect x="183" y="120" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}/>
      {/* Venous */}
      <rect x="172" y="120" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}/>
      {/* Spine */}
      <rect x="177" y="120" width="6" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}/>
      {/* GI Tract */}
      <ellipse cx="180" cy="252" rx="26" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}/>
      {/* NMJ - 5 site triggers */}
      <circle cx="194" cy="65" r="14" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="90" cy="240" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="270" cy="240" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="148" cy="390" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="212" cy="390" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
    </svg>
  );
};
"""

# The bottom section of the file from orig_lines
# We search for the first occurrence of "// ─────────────────────────────────────────────────────────────────────────────\n// ANS BALANCE PANEL"
# which in our corrupted file corresponds to index 934
bottom_start = -1
for i, line in enumerate(orig_lines):
    if "ANS BALANCE PANEL" in line and "// ──" in orig_lines[i-1]:
        bottom_start = i - 1
        break

if bottom_start == -1:
    # fallback search
    for i, line in enumerate(orig_lines):
        if "const ANSPanel =" in line:
            bottom_start = i
            break

bottom_section = "".join(orig_lines[bottom_start:])

# Write the final combined file
with open("src/components/ReceptorBodyPanel.jsx", "w", encoding="utf-8") as f:
    f.write(top_section)
    f.write(middle_functions)
    f.write(new_body_svg)
    f.write(bottom_section)

print("ASSEMBLY COMPLETE!")
