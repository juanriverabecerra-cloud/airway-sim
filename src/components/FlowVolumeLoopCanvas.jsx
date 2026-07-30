import React, { useEffect, useRef } from 'react';
import { generateFlowVolumeLoop, generateVentilatorFlowVolumeLoop } from '../engine/FlowVolumeLoopModel';

/**
 * Renders a flow-volume loop.
 *
 * Two display modes, switched automatically:
 * - VENTILATED (patient.airwaySecured): tidal ventilator loop (0 → Vt), matching
 *   the real-time display on GE Carestation / Dräger Primus. Inspiratory flow is
 *   positive (above zero line), expiratory is negative. VCV shows a rectangular
 *   inspiratory step; PCV/PSV shows a decelerating curve. Auto-PEEP is visible as
 *   the loop failing to return to zero volume.
 * - NOT VENTILATED: forced-PFT flow-volume loop (RV → TLC) showing maximal-effort
 *   effort-independent expiratory flow-limitation patterns (COPD scooping, restriction,
 *   extrathoracic obstruction). Expiratory flow is positive (above zero), matching
 *   PFT convention.
 */
export const FlowVolumeLoopCanvas = React.memo(({ patient, vitals, ventSettings, active = true }) => {
  const canvasRef = useRef(null);
  const drawState = useRef({ tBeat: 0, lastTime: null });
  const propsRef = useRef({ patient, vitals, ventSettings, active });

  useEffect(() => {
    propsRef.current = { patient, vitals, ventSettings, active };
  }, [patient, vitals, ventSettings, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (time) => {
      if (!canvas || !canvas.parentElement) return;

      if (drawState.current.lastTime === null) drawState.current.lastTime = time;
      let dtMs = time - drawState.current.lastTime;
      drawState.current.lastTime = time;
      if (dtMs > 100) dtMs = 16;

      const { patient: p, vitals: v, ventSettings: vs, active: isActive } = propsRef.current;

      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w === 0 || h === 0) { animationFrameId = requestAnimationFrame(render); return; }
      if (Math.abs(canvas.width - w) > 4 || Math.abs(canvas.height - h) > 4) {
        canvas.width = w; canvas.height = h;
      }

      const isVentilated = !!p?.airwaySecured && !!vs;
      const loop = isVentilated
        ? generateVentilatorFlowVolumeLoop(p, v, vs)
        : generateFlowVolumeLoop(p, v);
      const { points } = loop;

      const rr = typeof v?.rr === 'number' && Number.isFinite(v.rr) ? v.rr : 12;
      const beatDuration = (isActive && rr > 0) ? (60 / rr) : 4.0;
      drawState.current.tBeat += dtMs / 1000;
      if (drawState.current.tBeat >= beatDuration) drawState.current.tBeat %= beatDuration;
      const progress = Math.max(0, Math.min(1, drawState.current.tBeat / beatDuration));

      const margin = { left: 44, right: 14, top: 22, bottom: 28 };
      const plotW = Math.max(10, w - margin.left - margin.right);
      const plotH = Math.max(10, h - margin.top - margin.bottom);

      let xMin, xMax, yMin, yMax, topLabel, botLabel, xAxisTitle;
      // flipX renders higher lung volume on the LEFT — the standard clinical spirometry
      // orientation, where forced expiration begins at TLC (left), peak expiratory flow
      // sits at the far left, and the limb descends rightward toward RV. The x-axis is then
      // read as EXHALED volume (0 at TLC on the left, rising to FVC at RV on the right).
      let flipX = false;
      const tlcRef = loop.tlc ?? 6;

      if (isVentilated) {
        const vtL = Math.max(0.2, (loop.vte ?? 0) / 1000);
        xMin = 0;
        xMax = vtL * 1.3;
        yMax = Math.max(0.3, (loop.pef ?? 0) * 1.3);   // top    = peak expiratory flow
        yMin = -Math.max(0.3, (loop.pif ?? 0) * 1.3);  // bottom = peak inspiratory flow
        topLabel = 'Exp';
        botLabel = 'Insp';
        xAxisTitle = 'Volume (L)';
        flipX = true;
      } else {
        // PFT loop: Expiration on TOP (positive) and Inspiration on BOTTOM (negative).
        const { tlc, rv, fvc, pef, pif } = loop;
        const pad = Math.max(0.3, fvc * 0.14);
        xMin = Math.max(0, rv - pad);
        xMax = tlc + pad;
        yMax = Math.max(1, pef * 1.2);    // top    = peak expiratory flow
        yMin = -Math.max(1, pif * 1.2);   // bottom = peak inspiratory flow
        topLabel = 'Exp';
        botLabel = 'Insp';
        xAxisTitle = 'Exhaled Volume (L)';
        flipX = true;
      }

      const pxf = (vol) => {
        const t = (vol - xMin) / (xMax - xMin || 1);
        return margin.left + (flipX ? 1 - t : t) * plotW;
      };
      const pyf = (flow) => margin.top + ((yMax - flow) / (yMax - yMin || 1)) * plotH;

      ctx.clearRect(0, 0, w, h);

      // ── Reference lines ──────────────────────────────────────────────────────
      // Axes (left + bottom)
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + plotH);
      ctx.lineTo(margin.left + plotW, margin.top + plotH);
      ctx.stroke();

      // Zero-flow horizontal baseline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.beginPath();
      ctx.moveTo(margin.left, pyf(0));
      ctx.lineTo(margin.left + plotW, pyf(0));
      ctx.stroke();

      // Vent loop: zero-volume dashed vertical reference (loop should close here)
      if (isVentilated) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pxf(0), margin.top);
        ctx.lineTo(pxf(0), margin.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Axis labels ───────────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(xAxisTitle, margin.left + plotW / 2, h - 6);
      ctx.save();
      ctx.translate(11, margin.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Flow (L/s)', 0, 0);
      ctx.restore();
      // Direction labels sit at the plot's top-right/bottom-right corners (right-aligned)
      // rather than top-left/bottom-left — the left side is already used by the numeric
      // readout overlay (top) and the volume-axis "0" tick label (bottom), and sharing
      // that corner produced an illegible overlapping smear of text.
      ctx.textAlign = 'right';
      ctx.fillText(topLabel, margin.left + plotW - 3, margin.top + 9);
      ctx.fillText(botLabel, margin.left + plotW - 3, margin.top + plotH - 5);
      ctx.textAlign = 'left';

      // ── X-axis tick marks ─────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const xTickStep = xMax > 4 ? 1.0 : xMax > 1.5 ? 0.5 : 0.2;
      for (let tv = Math.ceil(xMin / xTickStep) * xTickStep; tv <= xMax + 0.001; tv += xTickStep) {
        const tx = pxf(tv);
        // PFT axis is exhaled volume (TLC − absolute volume): 0 at TLC, rising toward RV.
        const labelVal = flipX ? tlcRef - tv : tv;
        if (tx >= margin.left && tx <= margin.left + plotW && labelVal >= -0.001) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
          ctx.lineWidth = 1;
          ctx.moveTo(tx, margin.top + plotH - 3);
          ctx.lineTo(tx, margin.top + plotH + 3);
          ctx.stroke();
          ctx.fillText(labelVal.toFixed(1), tx, margin.top + plotH + 12);
        }
      }
      ctx.textAlign = 'left';

      // ── Main loop trace ───────────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.88)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, i) => {
        const x = pxf(pt.volume);
        const y = pyf(pt.flow);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      // Close loop for PFT; leave open for vent (auto-PEEP visible as open loop)
      if (!isVentilated) ctx.closePath();
      ctx.stroke();

      // ── Auto-PEEP indicator ───────────────────────────────────────────────────
      // The trapped-gas band spans from the zero-volume line to the volume the expiratory
      // limb actually stops at. Derive its screen extent from min/abs of the two mapped x's
      // rather than a bare subtraction, so it renders correctly regardless of flipX (with
      // flipX, pxf(0) is the RIGHT edge and pxf(finalVol) sits to its left — a plain
      // pxf(finalVol) - pxf(0) goes negative and the band silently disappears).
      if (isVentilated && loop.hasAutoPeep) {
        const finalVol = points[points.length - 1]?.volume ?? 0;
        if (finalVol > 0.01) {
          const xZero = pxf(0);
          const xTrap = pxf(finalVol);
          const trapX = Math.min(xZero, xTrap);
          const trapW = Math.abs(xTrap - xZero);
          if (trapW > 2) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
            ctx.fillRect(trapX, margin.top, trapW, plotH);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(xTrap, margin.top);
            ctx.lineTo(xTrap, margin.top + plotH);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('auto-PEEP', trapX + trapW / 2, pyf(0) - 4);
            ctx.textAlign = 'left';
          }
        }
      }

      // ── Numeric readouts (top-left overlay) ──────────────────────────────────
      ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      if (isVentilated) {
        const vteMl  = Math.round(loop.vte ?? 0);
        const pifStr = (loop.pif ?? 0).toFixed(1);
        const pefStr = (loop.pef ?? 0).toFixed(1);
        const tau    = (loop.timeConstant ?? 0).toFixed(1);
        ctx.fillText(`Vte ${vteMl} mL  τ=${tau}s`, margin.left, margin.top - 3);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.fillText(`PIF ${pifStr}  PEF ${pefStr} L/s`, margin.left, margin.top + 7);
      } else {
        const fvcStr = (loop.fvc ?? 0).toFixed(2);
        const pefStr = (loop.pef ?? 0).toFixed(1);
        const pifStr = (loop.pif ?? 0).toFixed(1);
        ctx.fillText(`FVC ${fvcStr}L  PEF ${pefStr}  PIF ${pifStr} L/s`, margin.left, margin.top - 3);
      }
      ctx.textAlign = 'left';

      // ── Sweeping marker ───────────────────────────────────────────────────────
      if (isActive && points.length > 1) {
        const idx = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
        const cur = points[idx];
        ctx.beginPath();
        ctx.fillStyle = '#facc15';
        ctx.arc(pxf(cur.volume), pyf(cur.flow), 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
});
