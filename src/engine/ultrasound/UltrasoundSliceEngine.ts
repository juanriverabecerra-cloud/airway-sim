/**
 * UltrasoundSliceEngine.ts
 * The "scan-through" core: given a probe POSE (where the probe sits on the body,
 * plus its rotation and tilt) it computes the live ultrasound slice — how each
 * anatomical structure is panned, rotated, elongated and faded on screen, how
 * close the view is to the textbook acoustic window, and a steering hint.
 *
 * ARCHITECTURE / 3D-READINESS: this engine depends ONLY on a `ProbePose`, never
 * on how that pose was produced. The 2D anatomical body map is one "positioning
 * surface" that emits a ProbePose; a future 3D body mesh is simply another
 * surface emitting the same ProbePose into this same engine — no engine rewrite.
 */

import type { UltrasoundProcedureDefinition } from './UltrasoundRegistry';

export interface ProbePose {
  xPercent: number; // 0-100 position within the procedure's body region
  yPercent: number; // 0-100 position within the procedure's body region
  rotationDeg: number; // footprint rotation: 0 = short-axis (transverse), 90 = long-axis
  tiltDeg: number; // beam fan/tilt, -45 (heel) .. +45 (toe)
}

export interface SlicedStructure {
  id: string;
  label: string;
  type: string;
  echoPattern?: string;
  radiusPercent: number;
  subStructures?: { label: string; xRel: number; yRel: number }[];
  cxFrac: number; // 0-1 screen position
  cyFrac: number; // 0-1 screen position
  opacity: number; // 0-1 (fades as the view drifts off-window)
  elongation: number; // 0 = short-axis circle, 1 = long-axis tube (vessels/nerves)
  visible: boolean;
}

export interface SliceResult {
  alignmentQuality: number; // 0-1
  alignmentScore: number; // 0-100 rounded
  planeRotationDeg: number; // effective rotation vs the preferred orientation
  windowStatus: 'on_window' | 'off_axis' | 'no_window';
  hint: string;
  fogLevel: number; // 0-1 haze/speckle applied to the whole frame off-window
  structures: SlicedStructure[];
}

/** Where each body region lives on the normalized 100x100 front-view body SVG. */
export const BODY_REGION_ANCHORS: Record<string, { cx: number; cy: number; w: number; h: number }> = {
  neck: { cx: 50, cy: 15, w: 15, h: 8 },
  chest: { cx: 50, cy: 33, w: 34, h: 18 },
  abdomen: { cx: 50, cy: 51, w: 32, h: 16 },
  groin: { cx: 50, cy: 63, w: 24, h: 10 },
  arm: { cx: 77, cy: 42, w: 12, h: 30 },
  leg: { cx: 43, cy: 84, w: 15, h: 26 }
};

const DEG2RAD = Math.PI / 180;

function num(v: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Sector/deep probes have a more forgiving acoustic window than a fine linear probe. */
function windowRadiusFor(procedure: UltrasoundProcedureDefinition): number {
  const probe = procedure?.recommendedProbe;
  if (probe === 'curvilinear' || probe === 'phased_array' || probe === 'tee_multiplane') return 26;
  return 18;
}

export function createDefaultProbePose(procedure: UltrasoundProcedureDefinition): ProbePose {
  const target = procedure?.targetMapPos || { xPercent: 50, yPercent: 50 };
  return {
    xPercent: num(target.xPercent, 50),
    yPercent: num(target.yPercent, 50),
    rotationDeg: 0,
    tiltDeg: 0
  };
}

/** Projects a region-space probe position (0-100) onto the 100x100 body SVG. */
export function projectProbeOntoBody(
  region: string,
  xPercent: number,
  yPercent: number
): { x: number; y: number } {
  const box = BODY_REGION_ANCHORS[region] || { cx: 50, cy: 50, w: 30, h: 30 };
  const x = box.cx - box.w / 2 + (clamp(num(xPercent, 50), 0, 100) / 100) * box.w;
  const y = box.cy - box.h / 2 + (clamp(num(yPercent, 50), 0, 100) / 100) * box.h;
  return { x, y };
}

/**
 * Computes the live slice for a probe pose. Pure and deterministic.
 */
export function computeSlice(
  procedure: UltrasoundProcedureDefinition,
  pose: ProbePose
): SliceResult {
  const safePose: ProbePose = {
    xPercent: num(pose?.xPercent, 50),
    yPercent: num(pose?.yPercent, 50),
    rotationDeg: num(pose?.rotationDeg, 0),
    tiltDeg: clamp(num(pose?.tiltDeg, 0), -60, 60)
  };

  const target = procedure?.targetMapPos || { xPercent: 50, yPercent: 50 };
  const windowRadius = windowRadiusFor(procedure);

  // --- Positional deviation from the acoustic window -------------------------
  const dx = safePose.xPercent - num(target.xPercent, 50); // +ve: probe right of window
  const dy = safePose.yPercent - num(target.yPercent, 50); // +ve: probe below window
  const dist = Math.sqrt(dx * dx + dy * dy);
  const posQuality = clamp(1 - dist / windowRadius, 0, 1);

  // --- Orientation (rotation) and tilt --------------------------------------
  // 0 = short-axis (preferred textbook default). Off-axis is still a valid image,
  // just a different (long-axis) view, so it fades the score less than position.
  const rotDelta = ((safePose.rotationDeg % 180) + 180) % 180; // 0..180
  const rotFromShortAxis = rotDelta > 90 ? 180 - rotDelta : rotDelta; // 0..90
  const orientationMatch = Math.max(0, Math.cos(rotFromShortAxis * DEG2RAD)); // 1 short .. 0 long
  const orientationFactor = 0.68 + 0.32 * orientationMatch;
  const tiltFactor = 0.72 + 0.28 * (1 - clamp(Math.abs(safePose.tiltDeg) / 45, 0, 1));

  const alignmentQuality = clamp(posQuality * orientationFactor * tiltFactor, 0, 1);
  const fogLevel = clamp(1 - alignmentQuality, 0, 1);
  const elongation = Math.abs(Math.sin(rotFromShortAxis * DEG2RAD)); // 0 circle .. 1 tube

  // --- Per-structure transform ----------------------------------------------
  // The probe IS the window: sliding the probe by +Δ shifts the anatomy that was
  // under the window by -Δ on screen. Tilt fans the plane, nudging depth.
  const panScale = 1.5;
  const panX = -(dx / 100) * panScale; // screen fraction
  const panY = -(dy / 100) * panScale;
  const tiltDepthShift = (safePose.tiltDeg / 90) * 0.18;
  const rotRad = rotFromShortAxis * DEG2RAD * 0.5; // subtle position rotation, not a full spin

  const overlays = Array.isArray(procedure?.structureOverlays) ? procedure.structureOverlays : [];
  const structures: SlicedStructure[] = overlays
    .filter((st) => !!st)
    .map((st) => {
      let bx = clamp(num(st.xPercent, 50) / 100 + panX, -0.5, 1.5);
      let by = clamp(num(st.yPercent, 50) / 100 + panY + tiltDepthShift, -0.5, 1.5);

      // subtle rotation of the constellation about the sector centre
      const ox = bx - 0.5;
      const oy = by - 0.5;
      const cx = 0.5 + (ox * Math.cos(rotRad) - oy * Math.sin(rotRad));
      const cy = 0.5 + (ox * Math.sin(rotRad) + oy * Math.cos(rotRad));

      const offScreen = cx < -0.05 || cx > 1.05 || cy < -0.05 || cy > 1.05;
      const opacity = clamp((offScreen ? 0 : 1) * (0.12 + 0.88 * alignmentQuality), 0, 1);

      return {
        id: st.id,
        label: st.label,
        type: st.type,
        echoPattern: (st as any).echoPattern,
        radiusPercent: num(st.radiusPercent, 8),
        subStructures: st.subStructures,
        cxFrac: cx,
        cyFrac: cy,
        opacity,
        elongation: st.type === 'artery' || st.type === 'vein' || st.type === 'nerve' ? elongation : 0,
        visible: opacity > 0.04
      };
    });

  // --- Window status + steering hint ----------------------------------------
  let windowStatus: SliceResult['windowStatus'];
  if (posQuality >= 0.72 && orientationMatch >= 0.72) windowStatus = 'on_window';
  else if (posQuality >= 0.3) windowStatus = 'off_axis';
  else windowStatus = 'no_window';

  const hint = buildHint(dx, dy, rotFromShortAxis, dist, windowRadius, windowStatus);

  return {
    alignmentQuality,
    alignmentScore: Math.round(alignmentQuality * 100),
    planeRotationDeg: rotFromShortAxis,
    windowStatus,
    hint,
    fogLevel,
    structures
  };
}

function buildHint(
  dx: number,
  dy: number,
  rotFromShortAxis: number,
  dist: number,
  windowRadius: number,
  windowStatus: SliceResult['windowStatus']
): string {
  if (windowStatus === 'on_window' && rotFromShortAxis < 20) {
    return '✅ Optimal window — hold the probe steady.';
  }

  // Position is the dominant correction when meaningfully off-window.
  if (dist > windowRadius * 0.35) {
    const horiz = Math.abs(dx) > 3 ? (dx > 0 ? 'left ◀' : 'right ▶') : '';
    const vert = Math.abs(dy) > 3 ? (dy > 0 ? 'up ▲' : 'down ▼') : '';
    const dir = [vert, horiz].filter(Boolean).join(' & ');
    if (dir) return `Slide the probe ${dir} toward the glowing target window.`;
  }

  if (rotFromShortAxis > 30) {
    return rotFromShortAxis > 60
      ? 'Long-axis view — rotate the probe back toward short-axis (transverse) for the standard window.'
      : 'Rotate the probe to square up the short-axis view.';
  }

  return 'Fine-tune probe position and tilt to sharpen the view.';
}
