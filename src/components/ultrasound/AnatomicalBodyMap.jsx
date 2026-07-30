import React, { useRef } from 'react';
import { BODY_REGION_ANCHORS, projectProbeOntoBody } from '../../engine/ultrasound/UltrasoundSliceEngine';

/**
 * Real front-view anatomical body diagram (self-contained inline SVG). Shows
 * exactly where the probe sits on the body and its orientation; dragging moves
 * the probe within the active region and feeds region-space coords back up.
 *
 * The body figure is a stylized silhouette positioning surface — intentionally
 * NOT a claim of anatomical mesh detail. It emits the same region-space
 * coordinates a future 3D body mesh would, into the shared slice engine.
 */
const BODY_SILHOUETTE = {
  head: { cx: 50, cy: 9, r: 6 },
  torso: '38,19 62,19 66,31 60,60 40,60 34,31',
  armL: '34,21 30,22 20,45 18,58 23,59 26,45 33,26',
  armR: '66,21 70,22 80,45 82,58 77,59 74,45 67,26',
  legL: '40,60 49,60 48,98 41,98',
  legR: '51,60 60,60 59,98 52,98'
};

const STATUS_COLOR = {
  on_window: '#34d399',
  off_axis: '#fbbf24',
  no_window: '#f87171'
};

export const AnatomicalBodyMap = ({
  region = 'neck',
  pose,
  targetPos,
  onProbeMove,
  windowStatus = 'off_axis',
  alignmentScore = 0
}) => {
  const wrapRef = useRef(null);
  const box = BODY_REGION_ANCHORS[region] || { cx: 50, cy: 50, w: 30, h: 30 };

  const probe = projectProbeOntoBody(region, pose?.xPercent ?? 50, pose?.yPercent ?? 50);
  const target = projectProbeOntoBody(region, targetPos?.xPercent ?? 50, targetPos?.yPercent ?? 50);
  const rot = pose?.rotationDeg ?? 0;
  const tilt = pose?.tiltDeg ?? 0;
  const statusColor = STATUS_COLOR[windowStatus] || STATUS_COLOR.off_axis;

  // The container is kept square so viewBox (0-100) maps 1:1 to pointer fraction.
  const pointerToRegion = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const vx = ((e.clientX - rect.left) / rect.width) * 100;
    const vy = ((e.clientY - rect.top) / rect.height) * 100;
    const rx = ((vx - (box.cx - box.w / 2)) / box.w) * 100;
    const ry = ((vy - (box.cy - box.h / 2)) / box.h) * 100;
    onProbeMove?.(Math.max(0, Math.min(100, rx)), Math.max(0, Math.min(100, ry)));
  };

  const handleDown = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pointerToRegion(e); };
  const handleMove = (e) => { if (e.buttons === 1) pointerToRegion(e); };

  // Beam wedge apex offset shows tilt; footprint + wedge rotate with the probe.
  const tiltOffset = (tilt / 45) * 6;

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-square max-h-56 mx-auto bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-crosshair select-none touch-none"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Body silhouette */}
        <g fill="#1e293b" stroke="#334155" strokeWidth="0.6" strokeLinejoin="round">
          <circle cx={BODY_SILHOUETTE.head.cx} cy={BODY_SILHOUETTE.head.cy} r={BODY_SILHOUETTE.head.r} />
          <polygon points={BODY_SILHOUETTE.torso} />
          <polygon points={BODY_SILHOUETTE.armL} />
          <polygon points={BODY_SILHOUETTE.armR} />
          <polygon points={BODY_SILHOUETTE.legL} />
          <polygon points={BODY_SILHOUETTE.legR} />
        </g>

        {/* Active region highlight */}
        <rect
          x={box.cx - box.w / 2}
          y={box.cy - box.h / 2}
          width={box.w}
          height={box.h}
          rx="2"
          fill="rgba(34,211,238,0.06)"
          stroke="#0e7490"
          strokeWidth="0.4"
          strokeDasharray="2 1.5"
        />

        {/* Glowing target acoustic window */}
        <g>
          <circle cx={target.x} cy={target.y} r="4" fill="none" stroke="#34d399" strokeWidth="0.8" opacity="0.9">
            <animate attributeName="r" values="3.2;4.6;3.2" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={target.x} cy={target.y} r="0.9" fill="#34d399" />
        </g>

        {/* Oriented probe glyph (footprint + scan-plane wedge) */}
        <g transform={`rotate(${rot} ${probe.x} ${probe.y})`}>
          <polygon
            points={`${probe.x - 5},${probe.y} ${probe.x + 5},${probe.y} ${probe.x + 7 + tiltOffset},${probe.y + 13} ${probe.x - 7 + tiltOffset},${probe.y + 13}`}
            fill={statusColor}
            opacity="0.16"
          />
          <rect x={probe.x - 5.5} y={probe.y - 2.4} width="11" height="4.2" rx="1.4" fill={statusColor} stroke="#0f172a" strokeWidth="0.5" />
          <line x1={probe.x} y1={probe.y + 2} x2={probe.x + tiltOffset} y2={probe.y + 13} stroke={statusColor} strokeWidth="0.6" strokeDasharray="1.5 1" opacity="0.8" />
        </g>
      </svg>

      {/* Corner telemetry */}
      <div className="absolute top-1.5 left-2 text-[9px] font-mono text-cyan-300/90 font-bold uppercase">
        {region} · rot {Math.round(rot)}° · tilt {Math.round(tilt)}°
      </div>
      <div className="absolute bottom-1.5 right-2 text-[9px] font-mono font-bold" style={{ color: statusColor }}>
        {windowStatus.replace('_', ' ').toUpperCase()} · {alignmentScore}%
      </div>
    </div>
  );
};
