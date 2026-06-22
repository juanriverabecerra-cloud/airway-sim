import React, { useEffect, useRef } from 'react';
import { generateFlowVolumeLoop } from '../engine/FlowVolumeLoopModel';

/**
 * Renders a flow-volume loop: an X-Y plot (volume on X, flow on Y), not a
 * scrolling time-strip like CanvasWaveform — the loop persists and retraces
 * once per breath, with a bright marker sweeping around it in sync with the
 * current breath so it reads as live rather than a static reference image.
 */
export const FlowVolumeLoopCanvas = React.memo(({ patient, vitals, active = true }) => {
  const canvasRef = useRef(null);
  const drawState = useRef({ tBeat: 0, lastTime: null });
  const propsRef = useRef({ patient, vitals, active });

  useEffect(() => {
    propsRef.current = { patient, vitals, active };
  }, [patient, vitals, active]);

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

      const { patient: p, vitals: v, active: isActive } = propsRef.current;

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

      const loop = generateFlowVolumeLoop(p, v);
      const { points, tlc, rv, fvc, pef, pif } = loop;

      const margin = { left: 42, right: 14, top: 14, bottom: 28 };
      const plotW = Math.max(10, w - margin.left - margin.right);
      const plotH = Math.max(10, h - margin.top - margin.bottom);

      const pad = Math.max(0.3, fvc * 0.18);
      const xMin = Math.max(0, rv - pad);
      const xMax = tlc + pad;
      const yMax = Math.max(1, pef * 1.2);
      const yMin = -Math.max(1, pif * 1.2);

      const px = (vol) => margin.left + ((vol - xMin) / (xMax - xMin || 1)) * plotW;
      const py = (flow) => margin.top + ((yMax - flow) / (yMax - yMin || 1)) * plotH;

      ctx.clearRect(0, 0, w, h);

      // Grid + zero-flow axis
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + plotH);
      ctx.lineTo(margin.left + plotW, margin.top + plotH);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.beginPath();
      ctx.moveTo(margin.left, py(0));
      ctx.lineTo(margin.left + plotW, py(0));
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Volume (L)', margin.left + plotW / 2, h - 6);
      ctx.save();
      ctx.translate(10, margin.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Flow (L/s)', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.fillText('Insp', margin.left + 2, margin.top + plotH - 4);
      ctx.fillText('Exp', margin.left + 2, margin.top + 10);

      // Persistent loop trace
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, i) => {
        const x = px(pt.volume);
        const y = py(pt.flow);
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
        ctx.arc(px(cur.volume), py(cur.flow), 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
});
