import React, { useEffect, useRef } from 'react';
import { generatePressureVolumeLoopFromMechanics } from '../engine/PressureVolumeLoopModel';

/**
 * Renders a pressure-volume loop (Paw on X, lung volume on Y).
 *
 * Clinical reference lines added (Miller's 9e Ch13; ARDSNet protocol):
 * - PEEP vertical: where the breath starts/ends
 * - Pplat dashed vertical: plateau pressure at end of inspiration (zero flow),
 *   the denominator in Cstat = Vt / (Pplat − PEEP). PIP > Pplat iff resistance > 0.
 * - 30 cmH₂O dashed red reference: the ARDSNet / lung-protective ventilation
 *   Pplat ceiling above which overdistension risk rises sharply.
 * - Static compliance slope line from (PEEP, FRC) to (Pplat, FRC+Vt): visually
 *   shows the effective static compliance; the loop bowing left of this line
 *   represents resistive hysteresis.
 * - Numeric overlay: PIP, Pplat, PEEP, Cstat, Cdyn (mL/cmH₂O).
 */
export const PressureVolumeLoopCanvas = React.memo(({ patient, vitals, ventSettings, active = true }) => {
  const canvasRef = useRef(null);
  const drawState = useRef({ lastTime: null });
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

      const rr = typeof v?.rr === 'number' && Number.isFinite(v.rr) ? v.rr : 12;
      const beatDuration = (isActive && rr > 0) ? (60 / rr) : 4.0;
      let pCycle = (time / 1000) / beatDuration;
      pCycle = pCycle % 1.0;
      if (pCycle < 0) pCycle += 1.0;
      const progress = pCycle;

      const loop = generatePressureVolumeLoopFromMechanics(p, v, vs);
      const { points, pip, peep, pplat, vte, dynamicCompliance, staticCompliance } = loop;

      const margin = { left: 44, right: 14, top: 34, bottom: 28 };
      const plotW = Math.max(10, w - margin.left - margin.right);
      const plotH = Math.max(10, h - margin.top - margin.bottom);

      const xMin = 0;
      const xMax = Math.max(35, pip * 1.25);
      const lv = p?.lungVolumes;
      const frc = lv?.frc_L || 2.2;
      const vtL = Math.max(0.1, vte / 1000);
      const yMin = Math.max(0, frc - 0.2);
      const yMax = frc + vtL * 1.4;

      const pxf = (pressure) => margin.left + ((pressure - xMin) / (xMax - xMin || 1)) * plotW;
      const pyf = (volume)   => margin.top  + ((yMax - volume)   / (yMax - yMin   || 1)) * plotH;

      ctx.clearRect(0, 0, w, h);

      // ── Reference line: 30 cmH₂O overdistension threshold (ARDSNet) ──────────
      if (xMax > 28) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pxf(30), margin.top);
        ctx.lineTo(pxf(30), margin.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('30', pxf(30), margin.top + plotH + 12);
      }

      // ── Reference line: PEEP vertical ─────────────────────────────────────────
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pxf(peep), margin.top);
      ctx.lineTo(pxf(peep), margin.top + plotH);
      ctx.stroke();

      // ── Reference line: Pplat dashed vertical ─────────────────────────────────
      const showPplat = pplat && pplat > peep + 0.5 && pplat < pip - 0.5;
      if (showPplat) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pxf(pplat), margin.top);
        ctx.lineTo(pxf(pplat), margin.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Ppl', pxf(pplat), margin.top + plotH + 12);
      }

      // ── Static compliance slope line: (PEEP, FRC) → (Pplat, FRC+Vt) ─────────
      if (showPplat && vtL > 0.05) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pxf(peep),  pyf(frc));
        ctx.lineTo(pxf(pplat), pyf(frc + vtL));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Axes (left + bottom edges) ────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + plotH);
      ctx.lineTo(margin.left + plotW, margin.top + plotH);
      ctx.stroke();

      // ── X-axis tick marks and labels ──────────────────────────────────────────
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const xTickStep = xMax > 45 ? 10 : xMax > 25 ? 5 : 5;
      for (let tv = 0; tv <= xMax + 0.1; tv += xTickStep) {
        const tx = pxf(tv);
        if (tx >= margin.left && tx <= margin.left + plotW) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx, margin.top + plotH - 3);
          ctx.lineTo(tx, margin.top + plotH + 3);
          ctx.stroke();
          ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
          ctx.fillText(String(tv), tx, margin.top + plotH + 12);
        }
      }
      ctx.textAlign = 'left';

      // ── Axis labels ───────────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Pressure (cmH₂O)', margin.left + plotW / 2, h - 6);
      ctx.save();
      ctx.translate(11, margin.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Volume (L)', 0, 0);
      ctx.restore();

      // ── Main P-V loop trace ───────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.88)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, i) => {
        const x = pxf(pt.pressure);
        const y = pyf(pt.volume);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      // ── Numeric overlay (top of plot) ─────────────────────────────────────────
      const cstat = staticCompliance != null && staticCompliance > 0 ? Math.round(staticCompliance) : '—';
      const cdyn  = dynamicCompliance != null && dynamicCompliance > 0 ? Math.round(dynamicCompliance) : '—';
      const pplatStr = (showPplat && pplat) ? Math.round(pplat) : Math.round(pip);
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
      ctx.fillText(
        `PIP ${Math.round(pip)}  Ppl ${pplatStr}  PEEP ${Math.round(peep)} cmH₂O`,
        margin.left, margin.top - 14
      );
      ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.fillText(
        `Cstat ${cstat}  Cdyn ${cdyn} mL/cmH₂O`,
        margin.left, margin.top - 4
      );

      // ── Sweeping marker (arc-length blended to prevent stalling) ─────────────
      if (isActive && points.length > 1) {
        const n = points.length;
        const arc = new Array(n);
        arc[0] = 0;
        for (let i = 1; i < n; i++) {
          const dp = points[i].pressure - points[i - 1].pressure;
          const dv = points[i].volume   - points[i - 1].volume;
          arc[i] = arc[i - 1] + Math.sqrt(dp * dp + dv * dv * 2500);
        }
        const totalArc = arc[n - 1] || 1;
        const normArc = arc.map(a => a / totalArc);

        const timeIdx = Math.max(0, Math.min(n - 1, Math.floor(progress * (n - 1))));
        const sTime = normArc[timeIdx];
        const blend = 0.6;
        const sBlended = (1 - blend) * sTime + blend * progress;

        let idx = 0;
        while (idx < n - 1 && normArc[idx] < sBlended) idx++;

        const cur = points[idx];
        ctx.beginPath();
        ctx.fillStyle = '#facc15';
        ctx.arc(pxf(cur.pressure), pyf(cur.volume), 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
});
