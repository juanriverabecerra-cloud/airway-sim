# Chapter 23 — Anesthesia Monitor Sounds & Audio Alerts

Integrates operating room auditory signals (pulse oximetry tones, ventilator cycles, IEC crisis alarms, and flatline alerts) to aid non-visual clinical decision-making.

## 23.1 Clinical Background & Auditory Safety

In anesthesia care, auditory feedback is a primary channel of situational awareness. Clinicians rely on sound to trace a patient's physiological status when handling manual tasks (e.g. airway instrumentation, regional blocks, line placements):
- **Pulse Oximetry Pitch Mapping**: The pulse beep occurs on every heartbeat. The tone's pitch decreases as $SpO_2$ falls (from a high-pitched 880 Hz at 100% saturation down to 220 Hz at 50% saturation). This creates an immediate cognitive warning of hypoxemia without requiring visual validation.
- **IEC 60601-1-8 Medical Alarms**: High-priority physiological crises (such as severe hypoxia, $SpO_2 < 90\%$) trigger standardized alarm sequences (3 rapid beeps, a short pause, then 2 rapid beeps).
- **Ventilator Cycling sounds**: A low-frequency hum/swell during the mechanical inspiratory phase indicates active ventilation.
- **Flatline Tones**: Cardiac arrest or a heart rate of zero triggers a continuous high-pitched clinical flatline alarm tone (520 Hz) to signify lack of perfusion.

## 23.2 Sound Synthesis Engine (`src/engine/SoundManager.js`)

A dedicated sound manager synthesized 100% in-browser using the **Web Audio API** (avoiding large assets, latency, or network requests). It features:
- **High-Precision Scheduler**: Runs on a `requestAnimationFrame` loop, reading `AudioContext.currentTime` to queue future oscillators and gains precisely, avoiding browser drift or audio stutter.
- **Realistic Pulse Oximeter Pitch Scaling**: Maps $SpO_2$ from 70% to 100% linearly onto 300 Hz to 800 Hz frequencies:
  $$f(SpO_2) = 300 + (\max(70, \min(100, SpO_2)) - 70) \cdot 16.67$$
  This produces a realistic clinical tone progression: 100% SpO2 yields 800 Hz, 90% yields 633 Hz, 80% yields 466 Hz, and 70% and below remains at a low, warning 300 Hz.
- **Audio Swell Envelope**: Pulse beeps use an exponential decay envelope (rising to peak volume in 15ms, decaying over 120ms) to mimic clinical pulse oximeters.
- **Environment Isolation Guards**: The engine checks `typeof window` and `typeof requestAnimationFrame` before initializing context or scheduling. This allows the simulation codebase to run, compile, and test seamlessly in headless server/CI environments (such as Node and Vitest) without throwing ReferenceErrors.

## 23.3 UI Settings Panel (`src/components/monitors/PrimaryMonitor.jsx`)

- Added a floating speaker button inside the waveforms window. Hovering or clicking reveals a glassmorphic menu.
- Syncs the settings (`master`, `pulse`, `vent`, `alarms`) bidirectionally with `localStorage` via the parent `<App />` state hooks to persist user sound configurations across sessions.
