# Walkthrough (scratch — current session only)

This file documents the major UI/UX refactorings, physiological bug fixes, and the newly implemented real-time timeskip engine added in this session.

---

## 1. Floating Hover Checklists & "Select All" Fast-Tracking

### Problem
Safety checklists (Time-Out, MSMAIDS, Post-Intubation, Extubation) were previously centered full-screen overlays with dark backdrops, locking the user out of the monitor waveforms and control panels. This interrupted clinical flow and caused click fatigue.

### Solution
1. **Left-Floating Layout**:
   * Removed full-screen wrappers and backdrops.
   * Converted all checklists to float on the left side of the screen (`fixed left-4 top-28 w-[380px] z-[100] max-h-[calc(100vh-140px)]`).
   * Standardized to a dark glassmorphic card design (`bg-slate-950/95 border border-slate-800 backdrop-blur-md`).
   * **Files altered**:
     * [PatientHeader.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/PatientHeader.jsx) (Pre-induction Sign-In / Time-Out Checklist)
     * [Modals.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/modals/Modals.jsx) (`MsmaidsModal`, `PostIntubationModal`, `ExtubationModal`)
2. **"Select All" Fast-Tracking**:
   * Added a `Select All` button to the header of all four checklists.
   * Instantly checks all safety assertions, letting experienced users proceed immediately without clicking every box.

---

## 2. Graves' Disease / Thyroid Storm Physiological Stability

### Problem
Starting the "Thyroid Storm" case with a heart rate of 162 bpm caused immediate, unrealistic blood pressure collapse (~50/40 mmHg) on tick 1. Because the four-chamber circuit model lacked hyperthyroidism-induced hyperdynamic adjustments, diastolic filling time collapsed without any compensatory contractility boost or peripheral vasodilation, putting the patient in instant cardiogenic shock and triggering AKI within 11 seconds.

### Solution
* **Hyperdynamic Adjustments**:
  * Modified [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts) to read the patient's `thyroidFunctionIndex` and `thyroidStormActive` flags.
  * **Inotropy Boost**: Multiplies contractility (`inotropyInitial`/`inotropyFinal`) by up to **$1.85\times$** during a active storm, sustaining stroke volume during rapid ventricular response (RVR).
  * **Vasodilation Drop**: Lowers Systemic Vascular Resistance (`targetSVR`) by **20–30%**, modeling thyroid-hormone-induced direct vascular relaxation.
* **Result**: The patient now starts with a stable, realistic blood pressure (MAP ~90-100 mmHg) at HR 162, giving the user adequate time to begin the stabilization cascade (PTU, Lugol's, beta-blockers, hydrocortisone).

---

## 3. Real-Time Physiological Kinetics & Time Skip / Fast-Forward System

### Problem
The 60x time acceleration factor inside the renal engine (1 simulation second = 1 game minute for hypotension exposure) was highly unstable and unrealistic. A few seconds of lag or menu browsing could trigger irreversible acute kidney injury. The user requires 1:1 real-time kinetics, coupled with an intentional, polished Time Skip mechanism to progress through long, uneventful surgical phases.

### Solution
1. **Unaccelerated Renal Kinetics**:
   * Modified [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts) to accumulate MAP ischemia exposure (`mapUnder60Time`, `mapUnder55Time`) and urine output KDIGO timers in standard, 1:1 seconds (`+= safeDt`).
   * Updated the renal unit tests in [renal.test.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/testing/renal.test.ts) to tick with `dt = 60` (1-minute steps) to preserve test coverage and validate scaling.
2. **Fast-Forward Engine**:
   * Enhanced the simulation loop in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js) to check for a `patient.fastForwardRemaining` count.
   * If fast-forwarding, the loop is dynamically rebuilt to run at a speed of **10ms per tick** (approx. 100 ticks/sec, simulating 1 minute of patient time in 600ms of real-time).
3. **Clinical Safety Intercepts (Auto-Pause)**:
   * During fast-forward ticks, a safety monitor checks the patient's vitals on every step.
   * If **Hypoxemia** ($SpO_2 < 90\%$), **Severe Hypotension** ($MAP < 55\text{ mmHg}$), **Arrhythmia** ($HR > 140$ or $< 45\text{ bpm}$), or **Cardiac Arrest** ($HR \le 0$) is detected, the engine halts the fast-forward, forces the simulator to pause (`isRunning = false`), and logs a detailed warning with the exact vitals at that second so the user can immediately intervene.
4. **UI Dropdown & Overlay**:
   * Added a **TIME SKIP** dropdown button in [PatientHeader.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/PatientHeader.jsx) containing options for **+1 Minute (60s)**, **+5 Minutes (300s)**, or **+10 Minutes (600s)**, as well as a cancel button.
   * Added a premium glassmorphic full-screen progress overlay in [App.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/App.jsx) showing a spinner, progress bar, time remaining counter, and a button to halt the process at any time.

---

## 4. Summary of Code Modifications for Claude Verification

### 1. [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts)
* Reads `patient.thyroidFunctionIndex` and `patient.thyroidStormActive`.
* Computes `thyroidInotropyMod` (up to $+0.85$ during storm) and multiplies `inotropyInitial` and `inotropyFinal` by it.
* Computes `thyroidSvrMod` (down to $-0.20$ during storm) and multiplies `baseSVR` by it inside the `targetSVR` equation.

### 2. [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts)
* Removed the `* 60` acceleration multiplier from `mapUnder60Time`, `mapUnder55Time`, `uopOliguriaTimer`, and `uopAnuriaTimer` increments.

### 3. [renal.test.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/testing/renal.test.ts)
* Changed `RenalEngine.tick(1, ...)` calls in timer progression tests to `RenalEngine.tick(60, ...)` to represent 1-minute steps.

### 4. [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js)
* Exposes `setIsRunning` to the hook destructured parameters.
* decrements `fastForwardRemaining` at the end of each tick.
* Implements safety pauses (auto-pause on hypoxemia, hypotension, arrhythmia, or arrest) and logs alerts.
* Adjusts the interval speed dynamically to `10ms` when fast-forwarding and updates the `useEffect` dependencies accordingly.

### 5. [PatientHeader.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/PatientHeader.jsx)
* Exposes `setPatient` in the destructured parameters.
* Declares `showFfDropdown` state and `handleFastForward` helper.
* Renders the floating left layout for the Pre-induction Sign-In/Time-Out Checklist.
* Inspected and destructured the `vitals` prop to resolve timeline warnings.
* Renders the new `TIME SKIP` button and dropdown menu.

### 6. [App.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/App.jsx)
* Passes `setIsRunning` and `setPatient` to the `<PatientHeader />` component.
* Renders the glassmorphic `<div className="fixed inset-0 bg-slate-950/80 ...">` overlay whenever `patient.fastForwardRemaining > 0` is active.

### 7. [Modals.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/modals/Modals.jsx)
* Refactored `MsmaidsModal`, `PostIntubationModal`, and `ExtubationModal` to use the left-floating layout classes.
* Added the `Select All` buttons in their headers.

---

## 5. Waveform Loops (P-V and F-V) Physics & Clinical Accuracy Fixes

### Problem
1. **Flow-Volume Loop Gaps**: In the non-ventilated PFT loop, the vital capacity ($FVC$) calculation was decoupled from the exact difference between Total Lung Capacity ($TLC$) and Residual Volume ($RV$). Because of small physiological differences between these estimation points, the expiratory and inspiratory limbs ended/began at different volumes. This resulted in open gaps and ugly vertical line artifacts on the right and left sides of the canvas when rendering.
2. **Incorrect Compliance Subtitles**: In the Pressure-Volume Loop guide:
   * The *Normal Compliance* card description claimed a "gentle slope" (which physically means flat/low compliance).
   * The *ARDS — Low Compliance* card description claimed a "steep, narrow loop" (which physically means high compliance).
3. **Auto-PEEP Volume Shift Missing**: While the Pressure-Volume Loop correctly shifted to the right (higher pressure) for auto-PEEP, it did not shift upward (higher volume) to represent the physical air trapping/dynamic hyperinflation above FRC.

### Solution
1. **Perfect Loop Closure**:
   * Modified [FlowVolumeLoopModel.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/FlowVolumeLoopModel.js) to set `fvcMl` exactly to `tlcMl - rvMl`. Both limbs now seamlessly start and end at the exact same volumes ($TLC$ and $RV$), returning to zero flow cleanly.
2. **Corrected Subtitles**:
   * Updated the static loop configurations in [WaveformContextPanel.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/WaveformContextPanel.jsx):
     * Changed normal compliance description to: `Steep slope, moderate width`.
     * Changed ARDS low compliance description to: `Flatter slope, narrow loop — high pressure for small volume`.
3. **Asymmetric Clinical Loop Redesign (Double-Sigmoidal S-Curves)**:
   * Replaced the simple oval templates in `makePVPath` inside [WaveformContextPanel.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/WaveformContextPanel.jsx) with a mathematically precise double-sigmoidal S-curve architecture.
   * **Inspiratory Limb (Inflation)**: Starts flat at PEEP (representing the recruitment pressure threshold/Lower Inflection Point), rises steeply in the mid-pressure compliance zone, and flattens horizontally at the top near PIP (representing elastic limits/Upper Inflection Point).
   * **Expiratory Limb (Deflation)**: Employs a mirrored, left-shifted S-shape to model clinical hysteresis, dropping steeply back to PEEP at lower volumes.
   * **ARDS / Low Compliance**: Vertically compressed sigmoidal curve, showing a flat, right-shifted compliance slope.
   * **High Resistance (Bronchospasm)**: Widened horizontal hysteresis with sigmoidal inflation and deflation limbs, keeping a normal steep compliance height (66px).
   * **Overdistension ("Beak")**: Models an exaggerated "duckbill beak" where compliance drops to zero near peak volume, forcing the inspiratory limb to bend horizontally to the right.
4. **Auto-PEEP Gas Trapping Volume Shift**:
   * Updated `makePVPath` in [WaveformContextPanel.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/WaveformContextPanel.jsx) to calculate `volumeShift = autoPeep * 14` and shift the loop's volume baseline (`yB`) upward in the SVG space. The auto-PEEP guide loop now shifts both right (higher pressure) and up (higher volume), matching the live simulation engine's behavior.

---

## 6. Loop Waveforms — Full Clinical-Accuracy Overhaul (rendering + morphology)

### Problem (why they "didn't look real")
1. **Kinked/polygonal loops**: both loops read from `RespiratoryMechanicsModel`'s breath trajectory, which was resampled *uniformly in time* — starving fast-but-brief transients (the ~30 ms expiratory valve-opening) of points and drawing straight chords across curves. (Fixed earlier this session via arc-length resampling — see the F-V/P-V loop kink fix.)
2. **PIP always equal to Pplat in VCV**: Pplat was inferred from "the trajectory point of peak volume", which in constant-flow VCV coincides with peak *flow*, not zero flow — so PIP and Pplat silently collapsed to one value and Cstat/Cdyn could never diverge. (Also fixed earlier — Pplat now computed directly during integration.)
3. **The normal F-V loop looked obstructive**: the expiratory limb was fed the raw `Pel(V)/Raw(V)` curve, which is strongly *scooped for every pattern* (verified numerically: normal normalized descent ≈0.65/0.37/0.20/0.09). Normal and COPD loops were nearly indistinguishable — the opposite of the display's whole teaching purpose.
4. **Wrong axis orientation**: TLC on the right (peak on the right) — a valid physiology-textbook layout but the mirror image of every PFT machine/clinical reference.
5. **Guide-card "examples" were wrong**: the *Normal* F-V card was literally described as a "symmetric oval" (a normal loop is a triangular expiratory peak over a semicircular inspiratory bowl); P-V cards were hand-drawn Béziers not tied to the live physics.

### Solution
1. **Shared canonical shape functions** — `expiratoryFlowFraction()` and `inspiratoryFlowFraction()` exported from [FlowVolumeLoopModel.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/FlowVolumeLoopModel.js):
   * Expiratory: near-vertical rise to PEF at ~12% of the VC below TLC, then $(1-e)^{p}$ with $p = 1 + 3.4\cdot\text{obstruction}$ — **straight** (p=1) for normal, **deeply coved/concave** for obstruction. A `plateau` parameter flat-tops the limb (fixed / variable-intrathoracic UAO).
   * Inspiratory: symmetric half-sine semicircle; `plateau` flat-tops it (variable-extrathoracic / fixed UAO).
   * **PEF/PIF magnitude stays physics-grounded** (peak of `Pel(V)/Raw(V)`, still disease-responsive: normal ≈9-11, severe COPD <1.5 L/s). Only the *descent curvature* is the canonical shape — verified: normal descent now ≈0.91/0.68/0.45/0.23 (near-linear), COPD ≈0.74/0.30/0.08/0.01 (scooped).
2. **Clinical peak-on-left orientation** — [FlowVolumeLoopCanvas.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/FlowVolumeLoopCanvas.jsx) `flipX`: TLC at the left, x-axis relabeled *Exhaled Volume (L)* (0 at TLC → FVC at RV). The model still emits absolute-volume points; the flip is display-only (tests unaffected).
3. **Guide/example cards rebuilt on the SAME shared functions** — [WaveformContextPanel.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/WaveformContextPanel.jsx). The tapped "example" and the patient's live loop are now one source of truth. F-V cards: normal / COPD / restrictive / fixed-UAO / variable-extrathoracic / **variable-intrathoracic (new)**. P-V cards rewritten as point-sampled parametric loops with a real elastic backbone + resistive hysteresis: normal / ARDS (visible **LIP + UIP** recruitment S-curve) / high-resistance (fat loop) / auto-PEEP (up+right) / **overdistension "beak" (new)**.
4. **All clinical text corrected** — the "symmetric oval" language, PEF-location, loop-shift-direction, and anatomy descriptions across the F-V and P-V configs; added full teaching text for the two new patterns.

