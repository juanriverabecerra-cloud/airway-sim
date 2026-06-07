import React, { useEffect, useRef } from 'react';
import { WAVEFORMS } from '../engine/WaveformDatabase';
import { synthesizeEkgLead } from '../engine/EkgModel';

export const CanvasWaveform = React.memo(({ 
  color, 
  speed, 
  rrSpeed = 0, 
  active, 
  type = 'ecg', 
  morphology = 'normal', 
  ieRatio = 2, 
  ampScale = 1, 
  baseScale = 0,
  lead = 'II',
  patientState = null,
  electrolytes = null,
  activeMeds = null
}) => {
  const canvasRef = useRef(null);
  
  // Initialize lastTime as null to securely sync with the exact rAF epoch on frame 1
  const drawState = useRef({ x: 0, lastTime: null, lastY: null, tBeat: 0 });
  const propsRef = useRef({ speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds });

  useEffect(() => {
    propsRef.current = { speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds };
  }, [speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (time) => {
      // Unmount protection to prevent React lifecycle crashes
      if (!canvas || !canvas.parentElement) return;

      if (drawState.current.lastTime === null) {
          drawState.current.lastTime = time;
      }
      let dtMs = time - drawState.current.lastTime;
      drawState.current.lastTime = time;

      // Frame-drop protection (Caps dt to prevent massive beam jumps if tab goes inactive)
      if (dtMs > 100) dtMs = 16; 

      const { speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds } = propsRef.current;
      
      // CSS Flexbox Sizing Bridge
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      
      if (w > 0 && h > 0 && (Math.abs(canvas.width - w) > 8 || Math.abs(canvas.height - h) > 8)) {
        canvas.width = w;
        canvas.height = h;
        drawState.current.x = 0; // Reset beam to start on resize
        drawState.current.lastY = null;
      }

      if (w === 0 || h === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // === CLINICAL SWEEP SPEED DECOUPLING ===
      // Standard monitor: ECG/A-line sweep at 25 mm/sec (~6 sec screen transit). 
      // Respiratory waves sweep at 12.5 mm/sec (~12 sec screen transit).
      const isSlowSweep = type === 'etco2' || type.startsWith('vent');
      const secondsAcrossScreen = isSlowSweep ? 12.0 : 6.0; 
      
      const pixelsPerSec = w / secondsAcrossScreen; 
      const dx = pixelsPerSec * (dtMs / 1000);
      
      let newX = drawState.current.x + dx;
      let isWrapping = false;
      
      if (newX >= w) {
        newX = 0;
        isWrapping = true;
      }

      // === BIOLOGICAL TIMING CALCULUS ===
      // Parse floats to prevent string-coercion NaN injection
      const parsedSpeed = parseFloat(speed);
      const parsedRR = parseFloat(rrSpeed);
      
      // CRITICAL FIX: Convert physiological Rate (BPM/RPM) to chronological Period (Seconds per cycle)
      // e.g., 70 BPM -> 60/70 = 0.857 seconds per beat.
      const beatDuration = (parsedSpeed > 0 && !isNaN(parsedSpeed)) ? (60 / parsedSpeed) : 1.0; 
      
      drawState.current.tBeat += (dtMs / 1000);
      if (drawState.current.tBeat >= beatDuration) {
          drawState.current.tBeat %= beatDuration;
      }
      const tBeat = drawState.current.tBeat;

      const isCardiac = type === 'ecg' || type === 'aline' || type === 'pleth';
      const base = isCardiac ? (h / 2) : (h * 0.9); 
      let y;

      const isActiveAndBeating = active && parsedSpeed > 0 && !isNaN(parsedSpeed);

      if (isActiveAndBeating) {
          // === TRUE RESPIRATORY VARIATION (Pulse Pressure / Pleth Variability) ===
          // Positive Pressure Ventilation increases intrathoracic pressure, decreasing venous return.
          // This dynamically squeezes the amplitude of the stroke volume (PPV).
          let respAmpMod = 1.0;
          let respBaseShift = 0;
          
          if ((type === 'pleth' || type === 'aline') && parsedRR > 0 && !isNaN(parsedRR)) {
              // Convert RPM to standard Hz (cycles per second) for the sine wave
              const rrFreq = parsedRR / 60; 
              const totalSecs = time / 1000;
              const respPhase = Math.sin(totalSecs * Math.PI * 2 * rrFreq);
              
              respBaseShift = respPhase * (h * 0.02); // Minor baseline wander
              respAmpMod = Math.max(0.1, 1.0 - (respPhase * 0.12)); // True PPV amplitude squeeze
          }

          if (type === 'ecg') {
              y = synthesizeEkgLead(lead, tBeat, beatDuration, h, base, time / 1000, patientState, electrolytes, activeMeds);
          } else {
              const morphGroup = WAVEFORMS[type] || WAVEFORMS.ecg;
              const morphFn = morphGroup[morphology] || morphGroup.normal || Object.values(morphGroup)[0];

              // Unified Morphology Signature for ALL waveforms (Phase-locked via ieRatio)
              const effectiveAmpScale = ampScale * respAmpMod;
              y = morphFn(tBeat, beatDuration, h, base, time, ieRatio, effectiveAmpScale, baseScale);
          }
          
          if (type !== 'etco2' && type !== 'ecg') {
              y += respBaseShift;
          }

      } else {
          // === ASYSTOLE / INACTIVE PHYSICS ===
          if (type === 'aline' || type === 'pleth') {
              y = h * 0.95;
          } else if (type === 'ecg') {
              // Let EkgModel render the flatline or cpr artifacts when inactive/arrest
              y = synthesizeEkgLead(lead, tBeat, beatDuration, h, base, time / 1000, patientState, electrolytes, activeMeds);
          } else {
              y = base;
          }
      }

      if (isNaN(y) || !isFinite(y)) {
          y = base;
      }

      // === RENDER VECTOR ===
      const eraserWidth = Math.max(8, w * 0.015);
      ctx.clearRect(newX, 0, eraserWidth, h);
      
      if (!isWrapping && drawState.current.lastY !== null) {
          ctx.beginPath(); 
          ctx.strokeStyle = color; 
          ctx.lineWidth = 2.5; 
          ctx.lineJoin = 'round';
          ctx.moveTo(drawState.current.x, drawState.current.lastY); 
          ctx.lineTo(newX, y);
          ctx.stroke();
      }

      drawState.current.x = newX;
      drawState.current.lastY = y;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
  );
});