import React, { useEffect, useRef } from 'react';
import { UltrasoundPhysicsEngine } from '../../engine/ultrasound/UltrasoundPhysicsEngine';
import { UltrasoundDopplerEngine } from '../../engine/ultrasound/UltrasoundDopplerEngine';

export const UltrasoundScreenCanvas = ({
  procedure,
  gainDb = 50,
  tgc = { near: 0, mid: 0, far: 0 },
  depthCm = 5.0,
  frequencyMHz = 10.0,
  probeType = 'linear',
  mode = 'b_mode', // 'b_mode' | 'color_doppler'
  showOverlays = true,
  needleState = null,
  hydrodissectionPocket = null,
  patientModifiers = null,
  slice = null, // SliceResult from UltrasoundSliceEngine.computeSlice (probe scan-through)
  isFrozen = false
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const offscreenCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create offscreen canvas once for clipped tissue speckle rendering
    if (!offscreenCanvasRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      offscreenCanvasRef.current = offscreen;
    }
    const offscreen = offscreenCanvasRef.current;
    const offCtx = offscreen.getContext('2d');

    let frameCount = 0;

    const renderFrame = () => {
      frameCount++;
      const timeMs = Date.now();
      const pulsePhase = Math.sin(timeMs * 0.007); // ~70 BPM arterial pulse

      // 1. Clear Outer Screen (Ultrasound Console Black Background)
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, width, height);

      if (!procedure) return;

      // Scan-through slice: structure positions/opacity/elongation come from the
      // slice engine (driven by probe pose). Fall back to a static full-alignment
      // view when no slice is supplied.
      const clarity = slice ? Math.max(0.08, 1 - slice.fogLevel) : 1;
      const structures = slice?.structures || (procedure.structureOverlays || []).map((st) => ({
        ...st, cxFrac: st.xPercent / 100, cyFrac: st.yPercent / 100, opacity: 1, elongation: 0
      }));

      // 2. Set Up Sector / Linear Beam Clip Area
      ctx.save();
      const isSector = probeType === 'phased_array' || probeType === 'curvilinear' || probeType === 'tee_multiplane';

      ctx.beginPath();
      if (isSector) {
        ctx.moveTo(width / 2, 20);
        ctx.arc(width / 2, 20, height - 30, Math.PI * 0.32, Math.PI * 0.68);
        ctx.closePath();
      } else {
        ctx.rect(30, 20, width - 60, height - 40);
      }
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.clip(); // Clip all subsequent drawing inside probe beam sector

      // 3. Render High-Fidelity Procedural Tissue Texture onto Offscreen Canvas
      if (offCtx) {
        const imgData = offCtx.createImageData(width, height);
        const data = imgData.data;

        for (let y = 20; y < height - 20; y++) {
          const depthFraction = (y - 20) / (height - 40);
          const currentDepthCm = depthFraction * depthCm;
          const gain = UltrasoundPhysicsEngine.calculateGainFactor(gainDb - 38, tgc.near, tgc.mid, tgc.far, depthFraction);
          const attenuation = UltrasoundPhysicsEngine.calculateAttenuationFactor(0.7, frequencyMHz, currentDepthCm);

          for (let x = 30; x < width - 30; x++) {
            const index = (y * width + x) * 4;
            const speckle = UltrasoundPhysicsEngine.generateSpeckleNoise(x, y);

            let baseEcho = 0.15 * speckle * gain * attenuation * clarity;

            // Epidermis hyperechoic top boundary
            if (y < 28) {
              baseEcho = 0.85 * (1 - (y - 20) / 8);
            }

            const val = Math.min(255, Math.max(0, Math.floor(baseEcho * 255)));
            data[index] = val;     // R
            data[index + 1] = val; // G
            data[index + 2] = val; // B
            data[index + 3] = 255; // A
          }
        }
        offCtx.putImageData(imgData, 0, 0);

        // Draw clipped offscreen background image
        ctx.drawImage(offscreen, 0, 0);
      }

      // 4. Render Photorealistic Anatomical Structures

      structures.forEach((st) => {
        if (!st) return;
        const opacity = st.opacity == null ? 1 : st.opacity;
        if (opacity <= 0.04) return; // slid out of the beam
        const cx = st.cxFrac * width;
        const cy = st.cyFrac * height;
        let rx = Math.max(0.5, (st.radiusPercent / 100) * width * clarity);
        let ry = rx;
        // Rotating the probe toward long axis stretches vessels/nerves from a
        // round short-axis cross-section into an elongated tube.
        const elong = st.elongation || 0;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

        if (st.type === 'artery') {
          // Dynamic Pulsatile Expansion (60-100 BPM)
          const pulsate = 1.0 + pulsePhase * 0.12;
          rx = Math.max(0.5, rx * pulsate * (1 + elong * 1.8));
          ry = Math.max(0.5, rx / (pulsate * (1 + elong * 1.8)) * pulsate * (1 - elong * 0.5));

          // Intima-Media Hyperechoic Wall
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Jet-Black Anechoic Lumen
          const innerRx = Math.max(0.2, rx - 2.5);
          const innerRy = Math.max(0.2, ry - 2.5);
          ctx.beginPath();
          ctx.ellipse(cx, cy, innerRx, innerRy, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();
        } else if (st.type === 'vein') {
          rx = Math.max(0.5, rx * (1 + elong * 1.8));
          ry = Math.max(0.5, ry * (1 - elong * 0.5));
          // Compressible Vein Lumen
          if (patientModifiers?.ijCollapseFraction > 0.4) {
            ry = Math.max(0.5, ry * (1 - patientModifiers.ijCollapseFraction * 0.7));
          }

          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.fillStyle = '#010306';
          ctx.fill();
        } else if (st.type === 'nerve' && st.echoPattern === 'hypoechoic_roots') {
          // Proximal nerve ROOTS (e.g. interscalene C5-C7): round HYPOechoic
          // ("dark") monofascicular circles with a thin bright rim, stacked
          // vertically in the interscalene groove — the classic "traffic light"
          // / "stoplight" sign. No bright honeycomb here.
          const roots = st.subStructures || [
            { yRel: -ry * 0.6 },
            { yRel: 0 },
            { yRel: ry * 0.6 }
          ];
          roots.forEach((r) => {
            const rootR = Math.max(0.5, rx * 0.34);
            ctx.beginPath();
            ctx.arc(cx + (r.xRel || 0), cy + (r.yRel || 0), rootR, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0f1a'; // hypoechoic (dark) interior
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1'; // thin hyperechoic rim
            ctx.lineWidth = 1.4;
            ctx.stroke();
          });
        } else if (st.type === 'nerve') {
          // Distal plexus / peripheral nerve: HYPERechoic honeycomb fascicular
          // structure ("cluster of grapes") — bright stroma with dark fascicles.
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(0.5, rx * 1.2), Math.max(0.5, ry * 0.9), 0, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Render individual hypoechoic nerve fascicles inside
          const fascicles = st.subStructures || [
            { xRel: -rx * 0.4, yRel: -ry * 0.2 },
            { xRel: 0, yRel: ry * 0.2 },
            { xRel: rx * 0.4, yRel: -ry * 0.2 }
          ];

          fascicles.forEach((f) => {
            ctx.beginPath();
            ctx.arc(cx + f.xRel, cy + f.yRel, Math.max(0.5, rx * 0.25), 0, Math.PI * 2);
            ctx.fillStyle = '#090d16';
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          });
        } else if (st.type === 'bone') {
          // Cortical Bone Surface
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, Math.max(0.5, ry * 0.4), 0, 0, Math.PI);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.stroke();

          // Pitch-Black Complete Acoustic Shadowing behind bone
          ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
          ctx.fillRect(cx - rx * 1.2, cy, rx * 2.4, height - cy);
        } else if (st.type === 'pleura') {
          // Animated Sliding Pleural Line ("ants marching")
          const slideOffset = (frameCount * 1.5) % 15;

          ctx.beginPath();
          ctx.moveTo(cx - rx, cy);
          ctx.lineTo(cx + rx, cy);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Animated sliding dash overlay
          ctx.save();
          ctx.setLineDash([4, 6]);
          ctx.lineDashOffset = -slideOffset;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // Periodic A-line reverberation artifacts below pleura
          for (let a = 1; a <= 2; a++) {
            const aLineY = cy + a * 45;
            if (aLineY < height - 20) {
              ctx.beginPath();
              ctx.moveTo(cx - rx * 0.8, aLineY);
              ctx.lineTo(cx + rx * 0.8, aLineY);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }
        } else if (st.type === 'fascia') {
          // Hyperechoic Fascial Line
          ctx.beginPath();
          ctx.moveTo(cx - rx * 1.5, cy);
          ctx.lineTo(cx + rx * 1.5, cy);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else if (st.type === 'muscle') {
          // Muscle belly background
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(0.5, rx * 1.5), ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.fill();
        }
        ctx.restore();
      });

      // 5. Color Doppler Flow (BART Rule)
      if (mode === 'color_doppler') {
        structures.forEach((st) => {
          if (!st) return;
          if (st.type === 'artery' || st.type === 'vein') {
            const cx = (st.xPercent / 100) * width + offsetX;
            const cy = (st.yPercent / 100) * height + offsetY;
            const rx = Math.max(0.5, (st.radiusPercent / 100) * width * alignmentQuality);

            const velocity = st.type === 'artery' ? 45 : -25;
            const doppler = UltrasoundDopplerEngine.calculateColorDoppler(velocity, 30, 4000, frequencyMHz);

            if (doppler.hasFlow) {
              ctx.save();
              ctx.beginPath();
              ctx.ellipse(cx, cy, Math.max(0.5, rx * 0.75), Math.max(0.5, rx * 0.75), 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${doppler.colorRgb.r}, ${doppler.colorRgb.g}, ${doppler.colorRgb.b}, ${doppler.colorRgb.a})`;
              ctx.fill();
              ctx.restore();
            }
          }
        });
      }

      // 6. Local Anesthetic Hydrodissection Anechoic Pocket
      if (hydrodissectionPocket && hydrodissectionPocket.volumeMl > 0) {
        const hx = (hydrodissectionPocket.xPercent / 100) * width;
        const hy = (hydrodissectionPocket.yPercent / 100) * height;
        const hr = Math.max(0.5, (hydrodissectionPocket.radiusPercent / 100) * width);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(hx, hy, hr, Math.max(0.5, hr * 0.55), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.55)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // 7. Interventional Needle Trajectory & Tip
      if (needleState && needleState.isInserted) {
        const nx = (needleState.xOffsetPercent / 100) * width;
        const ny = (needleState.depthCm / depthCm) * height;

        ctx.save();
        if (needleState.approach === 'in_plane') {
          ctx.beginPath();
          ctx.moveTo(30, 20);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(nx, ny, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // 8. Teaching Overlays & Anatomical Labels
      if (showOverlays) {
        structures.forEach((st) => {
          if (!st) return;
          const cx = (st.xPercent / 100) * width + offsetX;
          const cy = (st.yPercent / 100) * height + offsetY;

          ctx.save();
          ctx.font = 'bold 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#22d3ee';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 5;
          ctx.fillText(st.label, cx + 18, cy - 4);

          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#22d3ee';
          ctx.fill();
          ctx.restore();
        });
      }

      // 9. Depth Scale Markers on Right Edge
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      for (let d = 1; d <= Math.floor(depthCm); d++) {
        const dy = 20 + (d / depthCm) * (height - 40);
        ctx.beginPath();
        ctx.moveTo(width - 25, dy);
        ctx.lineTo(width - 15, dy);
        ctx.stroke();
        ctx.fillText(`${d}cm`, width - 44, dy + 3);
      }
      ctx.restore();

      ctx.restore(); // Outer clip restore

      if (!isFrozen) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [procedure, gainDb, tgc, depthCm, frequencyMHz, probeType, mode, showOverlays, needleState, hydrodissectionPocket, patientModifiers, probePos, isFrozen]);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-2">
      {/* Telemetry Display Bar */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-10 font-mono text-xs text-cyan-400 opacity-90">
        <div>
          <span className="font-bold text-white uppercase">{procedure?.shortName || 'ULTRASOUND'}</span>
          <span className="ml-3 text-slate-400">PROBE: {probeType.toUpperCase()}</span>
        </div>
        <div className="flex space-x-3">
          <span>GAIN: {gainDb}dB</span>
          <span>DEPTH: {depthCm}cm</span>
          <span>FREQ: {frequencyMHz}MHz</span>
          {isFrozen && <span className="px-2 py-0.5 bg-red-600 text-white rounded font-bold animate-pulse">FREEZE</span>}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={580}
        height={430}
        className="w-full h-full max-w-[640px] max-h-[480px] object-contain rounded border border-slate-800/80 shadow-inner bg-black"
      />
    </div>
  );
};
