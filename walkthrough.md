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
