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
  const drawState = useRef({ x: 0, lastTime: null, lastY: null });
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
              // Lock respiratory signals to absolute time phase as well
              let pResp = (time / 1000) / beatDuration;
              pResp = pResp % 1.0;
              if (pResp < 0) pResp += 1.0;
              tBeatVal = pResp * beatDuration;
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
                // ── EEG Synthesis ─────────────────────────────────────────────────
                // The canvas scrolls at 25 px/sec. At this rate, a true 32 Hz gamma
                // signal occupies < 1 pixel per cycle — physically invisible. Instead we
                // use DISPLAY-SCALED REPRESENTATIONAL FREQUENCIES: the visual CHARACTER
                // of each state (awake = dense fast noise; deep = sweeping slow waves) is
                // preserved while frequencies are scaled to be renderable. The depth-to-
                // visual mapping below is correct; only the literal Hz value is scaled.
                //
                // State legend (shown on the strip):
                //   BIS > 85: AWAKE — fast irregular low-amplitude β/γ noise
                //   BIS 65–85: LIGHT SEDATION — alpha spindles emerging
                //   BIS 40–65: SURGICAL DEPTH — slow δ waves dominate, higher amplitude
                //   BIS < 40 / BSR > 0: BURST SUPPRESSION — flat interrupted by high bursts
                //   BIS < 3: ISOELECTRIC — flat line (profound suppression)

                const bis = vitals?.bis !== undefined ? vitals.bis : 98;
                const bsr = vitals?.bsr !== undefined ? vitals.bsr : 0;
                const isArrest = patientState?.isArrest || false;

                if (isArrest || patientState?.biologicalDeath || bis < 3) {
                    // Isoelectric / cerebral death — near-flat with minimal electrical noise
                    y = base + (Math.random() - 0.5) * 1.5;
                } else {
                    const t = time / 1000;

                    // ── Burst suppression: cyclically suppress based on BSR ────────
                    const isBursted = bsr > 0;
                    const bsCyclePeriod = 4.0;  // 4-second suppression cycle (typical clinical BS)
                    const bsActiveFrac  = (100 - bsr) / 100;
                    const isSuppressed  = isBursted && ((t % bsCyclePeriod) > (bsCyclePeriod * bsActiveFrac));

                    if (isSuppressed) {
                        // Flat suppression period: near-isoelectric with minimal noise
                        y = base + (Math.random() - 0.5) * 2.0;
                    } else {
                        // ── Representational frequency components ─────────────────────
                        // Frequencies chosen so ≥2 cycles are visible per screen width at 25 px/sec.
                        // Visual character is preserved; literal Hz is scaled ~5-6× for display.

                        // ── Signal functions IDENTICAL to EEGContextPanel SVG preview ──────
                        // This guarantees the live strip matches what the preview shows.
                        // Root cause of previous mismatch: live used amplitudes (1.8, 1.4, 1.2)
                        // while preview used (5, 3.5, 4, 2.5, 3) — a 3× difference — plus
                        // depthAmpScale=0.25 for awake made the live signal effectively invisible
                        // (±1.6 px in a 48px canvas). Now both use the same amplitudes.
                        //
                        // h/80: normalizes to canvas height. At h=48, sf=0.6; at h=80, sf=1.0.
                        // This way the waveform always fills the same proportion of the strip
                        // regardless of how tall the strip happens to be rendered.
                        const TAU = 2 * Math.PI;
                        const sf  = h / 80;   // height scale factor

                        // Fast noise (awake β/γ character) — same 5 components as SVG
                        const fastNoise =
                            Math.sin(t * TAU * 5.5) * 5  * sf
                          + Math.sin(t * TAU * 7.3) * 3.5 * sf
                          + Math.sin(t * TAU * 4.1) * 4  * sf
                          + Math.sin(t * TAU * 9.2) * 2.5 * sf
                          + Math.sin(t * TAU * 6.7) * 3  * sf
                          + (Math.random() - 0.5)   * 3.5 * sf;  // biological noise

                        // Alpha spindles (waxing-waning enveloped bursts) — same as SVG
                        const env1 = Math.max(0, Math.sin(t * TAU * 0.4));
                        const env2 = Math.max(0, Math.sin(t * TAU * 0.35 + 2.1));
                        const alphaSpindle =
                            Math.sin(t * TAU * 2.2) * 22 * env1 * sf
                          + Math.sin(t * TAU * 1.9) * 14 * env2 * sf
                          + Math.sin(t * TAU * 5.1) * 3  * (1 - env1) * sf;

                        // Theta (transitional medium-slow) — same as SVG
                        const theta =
                            Math.sin(t * TAU * 1.1) * 22 * sf
                          + Math.cos(t * TAU * 0.9) * 13 * sf
                          + Math.sin(t * TAU * 1.6) * 8  * sf;

                        // Delta (large slow sweeps — surgical depth signature) — same as SVG
                        const delta =
                            Math.sin(t * TAU * 0.35) * 32 * sf
                          + Math.cos(t * TAU * 0.22) * 18 * sf
                          + Math.sin(t * TAU * 0.55) * 12 * sf
                          + Math.sin(t * TAU * 0.15) * 8  * sf;

                        // Burst signal (high-amplitude polymorphic discharge) — same as SVG
                        const burstSignal = isBursted
                          ? Math.sin(t * TAU * 1.5) * 34 * sf
                          + Math.sin(t * TAU * 0.9) * 20 * sf
                          + Math.sin(t * TAU * 2.4) * 12 * sf
                          + (Math.random() - 0.5)   * 8  * sf
                          : 0;

                        // ── BIS → band-weight mapping (unchanged) ─────────────────
                        let wFast = 0, wAlpha = 0, wTheta = 0, wDelta = 0, wBurst = 0;
                        if (isBursted) {
                            wBurst = 1.0;
                        } else if (bis > 85) {
                            wFast = 1.0;
                        } else if (bis > 70) {
                            const f = (bis - 70) / 15;
                            wFast  = f * 0.7;
                            wAlpha = (1 - f) * 0.9 + 0.1;
                        } else if (bis > 55) {
                            const f = (bis - 55) / 15;
                            wAlpha = f * 0.6;
                            wTheta = (1 - f) * 0.5 + f * 0.3;
                            wDelta = (1 - f) * 0.4;
                        } else if (bis > 40) {
                            const f = (bis - 40) / 15;
                            wTheta = f * 0.3;
                            wDelta = (1 - f) * 0.9 + f * 0.7;
                        } else {
                            wDelta = 1.0;
                        }

                        const rawSignal =
                            (fastNoise    * wFast)
                          + (alphaSpindle * wAlpha)
                          + (theta        * wTheta)
                          + (delta        * wDelta)
                          + (burstSignal  * wBurst);

                        // Global scale 0.60: keeps deep delta waves within canvas bounds while
                        // making awake activity clearly visible (~15% of canvas height, matching
                        // what the SVG preview box shows for the same state).
                        y = base + rawSignal * 0.60;
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
          let tBeatVal = (time / 1000) % beatDuration;
          if (tBeatVal < 0) tBeatVal += beatDuration;

          if (type === 'aline') {
              y = synthesizeArterialLine(tBeatVal, beatDuration, h, time / 1000, patientState, vitals, activeMeds);
          } else if (type === 'pleth') {
              y = synthesizePleth(tBeatVal, beatDuration, h, time / 1000, patientState, vitals, activeMeds);
          } else if (type === 'cvp') {
              y = synthesizeCvpWaveform(tBeatVal, beatDuration, h, time / 1000, patientState, vitals);
          } else if (type === 'pac') {
              y = synthesizePacWaveform(tBeatVal, beatDuration, h, time / 1000, patientState, vitals, morphology === 'wedge' ? 'wedge' : 'pa');
          } else if (type === 'ventPressure') {
              y = synthesizeVentPressureMechanics(tBeatVal, beatDuration, h, patientState, vitals, ventSettings);
          } else if (type === 'ventFlow') {
              y = synthesizeVentFlowMechanics(tBeatVal, beatDuration, h, patientState, vitals, ventSettings);
          } else if (type === 'ventVolume') {
              y = synthesizeVentVolumeMechanics(tBeatVal, beatDuration, h, patientState, vitals, ventSettings);
          } else if (type === 'ecg') {
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
          if (type === 'ventFlow') {
              ctx.beginPath();
              ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)'; // faint green dashed baseline
              ctx.lineWidth = 1.0;
              ctx.setLineDash([4, 4]);
              ctx.moveTo(drawState.current.x, h * 0.5);
              ctx.lineTo(newX, h * 0.5);
              ctx.stroke();
              ctx.setLineDash([]);
          }

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