import React, { useEffect } from 'react';
import { WAVEFORMS } from '../engine/WaveformDatabase';

export const CanvasWaveform = React.memo(({ color, speed, rrSpeed = 0, active, type = 'ecg', morphology = 'normal', ieRatio = 2, ampScale = 1, baseScale = 0 }) => {
  const canvasRef = React.useRef(null);
  const drawState = React.useRef({ x: 0, lastTime: performance.now(), lastY: null, tBeat: 0 });
  const propsRef = React.useRef({ speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale });

  useEffect(() => {
    propsRef.current = { speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale };
  }, [speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (time) => {
      const { speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale } = propsRef.current;
      const rect = canvas.parentElement.getBoundingClientRect();
      const roundedWidth = Math.floor(rect.width);
      const roundedHeight = Math.floor(rect.height);
      if (roundedWidth > 0 && roundedHeight > 0 && (canvas.width !== roundedWidth || canvas.height !== roundedHeight)) {
        canvas.width = roundedWidth;
        canvas.height = roundedHeight;
        drawState.current.x = 0;
        drawState.current.lastY = null;
      }

      if (canvas.width === 0) { animationFrameId = requestAnimationFrame(render); return; }

      if (!active || speed <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.5;
        ctx.moveTo(0, canvas.height * 0.8); ctx.lineTo(canvas.width, canvas.height * 0.8); ctx.stroke();
        ctx.globalAlpha = 1.0;
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      let dt = (time - drawState.current.lastTime) / 1000;
      if (dt > 0.1) dt = 0.016; 
      drawState.current.lastTime = time;

      const pixelsPerSec = canvas.width / 4;
      let newX = drawState.current.x + (dt * pixelsPerSec);
      let isWrapping = false;
      if (newX >= canvas.width) { newX = 0; isWrapping = true; }

      const h = canvas.height;
      const base = h * 0.7;
      let y;
      const freq = speed > 0 ? (1 / speed) : 1; 
      const beatDuration = 1000 / freq;
      drawState.current.tBeat += (dt * 1000);
      if (drawState.current.tBeat >= beatDuration) { drawState.current.tBeat %= beatDuration; }
      const tBeat = drawState.current.tBeat;
      
      let respShift = 0;
      if ((type === 'pleth' || type === 'aline') && rrSpeed > 0) {
          const rrFreq = 1 / rrSpeed;
          const totalSecs = time / 1000;
          respShift = Math.sin(totalSecs * Math.PI * 2 * rrFreq) * (h * 0.1);
      }

      if (type === 'etco2') {
        const phase = tBeat / beatDuration;
        const baseline = h * 0.9;
        const peak = h * 0.2;
        const morphFn = WAVEFORMS.etco2[morphology] || WAVEFORMS.etco2.normal;
        y = morphFn(phase, baseline, peak, h);
      } else {
        const morphFn = (WAVEFORMS[type] && WAVEFORMS[type][morphology]) ? WAVEFORMS[type][morphology] : WAVEFORMS[type].normal;
        y = morphFn(tBeat, beatDuration, h, base, time, ieRatio, ampScale, baseScale) + respShift;
      }

      ctx.clearRect(newX, 0, 30, h);
      if (!isWrapping && drawState.current.lastY !== null) {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.moveTo(drawState.current.x, drawState.current.lastY); ctx.lineTo(newX, y); ctx.stroke();
      }

      drawState.current.x = newX;
      drawState.current.lastY = y;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
});