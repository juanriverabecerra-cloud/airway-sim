import React, { useEffect, useRef } from 'react';
import { generatePressureVolumeLoopFromMechanics } from '../engine/PressureVolumeLoopModel';

/**
 * Renders a pressure-volume loop: an X-Y plot (pressure on X, volume on Y).
 * The loop persists and retraces once per breath, with a bright marker
 * sweeping around it in sync with the current breath.
 */
export const PressureVolumeLoopCanvas = React.memo(({ patient, vitals, ventSettings, active = true }) => {
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
      if (w === 0 || h === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      if (Math.abs(canvas.width - w) > 4 || Math.abs(canvas.height - h) > 4) {
        canvas.width = w;
        canvas.height = h;
      }

      const rr = typeof v?.rr === 'number' && Number.isFinite(v.rr) ? v.rr : 12;
      const beatDuration = (isActive && rr > 0) ? (60 / rr) : 4.0;
      drawState.current.tBeat += dtMs / 1000;
      if (drawState.current.tBeat >= beatDuration) drawState.current.tBeat %= beatDuration;
      const progress = Math.max(0, Math.min(1, drawState.current.tBeat / beatDuration));

      const loop = generatePressureVolumeLoopFromMechanics(p, v, vs);
      const { points, pip, peep } = loop;

      const margin = { left: 42, right: 14, top: 14, bottom: 28 };
      const plotW = Math.max(10, w - margin.left - margin.right);
      const plotH = Math.max(10, h - margin.top - margin.bottom);

      // Bounds for plotting
      const xMin = 0;
      const xMax = Math.max(35, pip * 1.25);
      
      const lv = p?.lungVolumes;
      const frc = lv?.frc_L || 2.2;
      const vt = (v?.vte || 500) / 1000;
      const yMin = Math.max(0, frc - 0.4);
      const yMax = frc + vt * 1.35;

      const px = (pressure) => margin.left + ((pressure - xMin) / (xMax - xMin || 1)) * plotW;
      const py = (volume) => margin.top + ((yMax - volume) / (yMax - yMin || 1)) * plotH;

      ctx.clearRect(0, 0, w, h);

      // Grid + PEEP axis line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // grid lines
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + plotH);
      ctx.lineTo(margin.left + plotW, margin.top + plotH);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.beginPath();
      ctx.moveTo(px(peep), margin.top);
      ctx.lineTo(px(peep), margin.top + plotH);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Pressure (cmH2O)', margin.left + plotW / 2, h - 6);
      ctx.save();
      ctx.translate(10, margin.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Volume (L)', 0, 0);
      ctx.restore();

      // Plot the loop trace
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)'; // Yellow matching Paw waveform
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, i) => {
        const x = px(pt.pressure);
        const y = py(pt.volume);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      // Sweeping marker synced to the current breath
      if (isActive && points.length > 1) {
        const idx = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
        const cur = points[idx];
        ctx.beginPath();
        ctx.fillStyle = '#facc15';
        ctx.arc(px(cur.pressure), py(cur.volume), 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
});
