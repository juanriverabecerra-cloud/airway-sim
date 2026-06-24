import React, { useEffect, useRef } from 'react';
import { WAVEFORMS } from '../engine/WaveformDatabase';
import { synthesizeEkgLead } from '../engine/EkgModel';
import { synthesizeArterialLine } from '../engine/ArterialLineModel';
import { synthesizePleth } from '../engine/PlethModel';
import { synthesizeEtCo2 } from '../engine/EtCo2Model';
import { synthesizeCvpWaveform } from '../engine/CvpWaveformModel';
import { synthesizePacWaveform } from '../engine/PulmonaryArteryCatheterModel';
import { synthesizeVentPressureMechanics, synthesizeVentFlowMechanics, synthesizeVentVolumeMechanics } from '../engine/RespiratoryMechanicsModel';

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
  activeMeds = null,
  vitals = null,
  ventSettings = null
}) => {
  const canvasRef = useRef(null);

  // Initialize lastTime as null to securely sync with the exact rAF epoch on frame 1
  const drawState = useRef({ x: 0, lastTime: null, lastY: null, tBeat: 0 });
  const propsRef = useRef({ speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds, vitals, ventSettings });

  useEffect(() => {
    propsRef.current = { speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds, vitals, ventSettings };
  }, [speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds, vitals, ventSettings]);

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

      const { speed, rrSpeed, active, color, type, morphology, ieRatio, ampScale, baseScale, lead, patientState, electrolytes, activeMeds, vitals, ventSettings } = propsRef.current;
      
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

      const isCardiac = type === 'ecg' || type === 'aline' || type === 'pleth' || type === 'cvp' || type === 'pac';
      const base = isCardiac ? (h / 2) : (h * 0.9); 
      let y;

      const isActiveAndBeating = active && parsedSpeed > 0 && !isNaN(parsedSpeed);

      if (isActiveAndBeating) {
          let tBeatVal;
          let beatDurationVal = beatDuration;
          let ampScaleMod = 1.0;
          
          if (isCardiac) {
              // Deterministic phase-locking across all cardiac channels using absolute time
              let pCardiac = (time / 1000) / beatDuration;
              if (patientState?.cardiacRhythm === 'afib' || patientState?.afib) {
                  const tSecs = time / 1000;
                  const modulation = 0.18 * Math.sin(tSecs * 2.3) + 0.10 * Math.sin(tSecs * 5.7) + 0.05 * Math.sin(tSecs * 11.1);
                  pCardiac += modulation;
                  
                  // Amplitude modulation matching the frequency modulation derivative (longer cycle = larger amplitude)
                  const modPrime = 0.414 * Math.cos(2.3 * tSecs) + 0.570 * Math.cos(5.7 * tSecs) + 0.555 * Math.cos(11.1 * tSecs);
                  ampScaleMod = Math.max(0.4, Math.min(1.4, 1.0 - 0.22 * modPrime));
              }
              pCardiac = pCardiac % 1.0;
              if (pCardiac < 0) pCardiac += 1.0;
              
              tBeatVal = pCardiac * beatDuration;
          } else {
              tBeatVal = tBeat;
          }

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
              y = synthesizeEkgLead(lead, tBeatVal, beatDurationVal, h, base, time / 1000, patientState, electrolytes, activeMeds);
          } else if (type === 'aline') {
              y = synthesizeArterialLine(tBeatVal, beatDurationVal, h, time / 1000, patientState, vitals, activeMeds);
              if (patientState?.cardiacRhythm === 'afib' || patientState?.afib) {
                  const baselineOffset = h * 0.95;
                  y = baselineOffset - (baselineOffset - y) * ampScaleMod;
              }
          } else if (type === 'pleth') {
              y = synthesizePleth(tBeatVal, beatDurationVal, h, time / 1000, patientState, vitals, activeMeds);
              if (patientState?.cardiacRhythm === 'afib' || patientState?.afib) {
                  const baselineOffset = h * 0.95;
                  y = baselineOffset - (baselineOffset - y) * ampScaleMod;
              }
          } else if (type === 'etco2') {
              y = synthesizeEtCo2(tBeatVal, beatDurationVal, h, time / 1000, patientState, vitals, activeMeds, ieRatio, ampScale, baseScale);
          } else if (type === 'cvp') {
              y = synthesizeCvpWaveform(tBeatVal, beatDurationVal, h, time / 1000, patientState, vitals);
          } else if (type === 'pac') {
              y = synthesizePacWaveform(tBeatVal, beatDurationVal, h, time / 1000, patientState, vitals, morphology === 'wedge' ? 'wedge' : 'pa');
          } else if (type === 'ventPressure') {
              y = synthesizeVentPressureMechanics(tBeatVal, beatDurationVal, h, patientState, vitals, ventSettings);
          } else if (type === 'ventFlow') {
              y = synthesizeVentFlowMechanics(tBeatVal, beatDurationVal, h, patientState, vitals, ventSettings);
          } else if (type === 'ventVolume') {
              y = synthesizeVentVolumeMechanics(tBeatVal, beatDurationVal, h, patientState, vitals, ventSettings);
          } else if (type === 'eeg') {
                const bis = vitals?.bis !== undefined ? vitals.bis : 98;
                const bsr = vitals?.bsr !== undefined ? vitals.bsr : 0;
                const isArrest = patientState?.isArrest || false;
                
                if (isArrest || patientState?.biologicalDeath || bis < 3) {
                    y = base + (Math.random() - 0.5) * 0.5;
                } else {
                    const tSecs = time / 1000;
                    const isBursted = bsr > 0;
                    const cyclePeriod = 6.0;
                    const cyclePhase = tSecs % cyclePeriod;
                    const activeFrac = (100 - bsr) / 100;
                    const isFlatPeriod = cyclePhase > (cyclePeriod * activeFrac);
                    
                    if (isBursted && isFlatPeriod) {
                        y = base + (Math.random() - 0.5) * 0.4;
                    } else {
                        const gamma = Math.sin(tSecs * 2 * Math.PI * 32.0) * 2.0 + Math.sin(tSecs * 2 * Math.PI * 25.0) * 1.5;
                        const beta = Math.sin(tSecs * 2 * Math.PI * 18.0) * 4.0 + Math.cos(tSecs * 2 * Math.PI * 15.0) * 3.0;
                        const alphaEnvelope = 0.5 + 0.5 * Math.sin(tSecs * 2 * Math.PI * 0.5);
                        const alpha = Math.sin(tSecs * 2 * Math.PI * 10.0) * 8.0 * alphaEnvelope;
                        const theta = Math.sin(tSecs * 2 * Math.PI * 5.0) * 10.0;
                        const delta = Math.sin(tSecs * 2 * Math.PI * 1.5) * 20.0 + Math.cos(tSecs * 2 * Math.PI * 0.8) * 15.0;
                        
                        let wGammaBeta = 0; let wAlpha = 0; let wTheta = 0; let wDelta = 0;
                        if (bis > 85) {
                            wGammaBeta = 1.0;
                        } else if (bis > 65) {
                            const f = (bis - 65) / 20;
                            wGammaBeta = f * 0.8;
                            wAlpha = (1 - f) * 0.7 + 0.2;
                            wTheta = (1 - f) * 0.3;
                        } else if (bis > 40) {
                            const f = (bis - 40) / 25;
                            wAlpha = f * 0.6;
                            wTheta = f * 0.4;
                            wDelta = (1 - f) * 0.8;
                        } else {
                            wDelta = 1.0;
                        }
                        
                        const rawSignal = (gamma * wGammaBeta) + (beta * wGammaBeta * 0.8) + (alpha * wAlpha) + (theta * wTheta) + (delta * wDelta);
                        y = base + rawSignal * 0.6 * ampScale;
                    }
                }
          } else {
              const morphGroup = WAVEFORMS[type] || WAVEFORMS.ecg;
              const morphFn = morphGroup[morphology] || morphGroup.normal || Object.values(morphGroup)[0];

              // Unified Morphology Signature for ALL waveforms (Phase-locked via ieRatio)
              const effectiveAmpScale = ampScale * respAmpMod;
              y = morphFn(tBeatVal, beatDurationVal, h, base, time, ieRatio, effectiveAmpScale, baseScale);
          }
          
          if (type !== 'etco2' && type !== 'ecg' && type !== 'aline' && type !== 'pleth') {
              y += respBaseShift;
          }

      } else {
          // === ASYSTOLE / INACTIVE PHYSICS ===
          if (type === 'aline') {
              y = synthesizeArterialLine(tBeat, beatDuration, h, time / 1000, patientState, vitals, activeMeds);
          } else if (type === 'pleth') {
              y = synthesizePleth(tBeat, beatDuration, h, time / 1000, patientState, vitals, activeMeds);
          } else if (type === 'cvp') {
              y = synthesizeCvpWaveform(tBeat, beatDuration, h, time / 1000, patientState, vitals);
          } else if (type === 'pac') {
              y = synthesizePacWaveform(tBeat, beatDuration, h, time / 1000, patientState, vitals, morphology === 'wedge' ? 'wedge' : 'pa');
          } else if (type === 'ventPressure') {
              y = synthesizeVentPressureMechanics(tBeat, beatDuration, h, patientState, vitals, ventSettings);
          } else if (type === 'ventFlow') {
              y = synthesizeVentFlowMechanics(tBeat, beatDuration, h, patientState, vitals, ventSettings);
          } else if (type === 'ventVolume') {
              y = synthesizeVentVolumeMechanics(tBeat, beatDuration, h, patientState, vitals, ventSettings);
          } else if (type === 'ecg') {
              let tBeatVal = tBeat;
              if (isCardiac) {
                  let pCardiac = ((time / 1000) / beatDuration) % 1.0;
                  if (pCardiac < 0) pCardiac += 1.0;
                  tBeatVal = pCardiac * beatDuration;
              }
              // Let EkgModel render the flatline or cpr artifacts when inactive/arrest
              y = synthesizeEkgLead(lead, tBeatVal, beatDuration, h, base, time / 1000, patientState, electrolytes, activeMeds);
          } else if (type === 'eeg') {
              y = base + (Math.random() - 0.5) * 0.5;
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