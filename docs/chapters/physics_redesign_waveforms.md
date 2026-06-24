# §21 — Physics-Grounded Waveform Redesign: CVP, PA Catheter, Flow-Volume Loop, Ventilator PV Loop (Cross-Cutting)

> Not a Miller's-chapter-integration session — a follow-on, user-requested rebuild of
> four waveform displays (three built this same overall session, one by a different AI
> process active in this repo) on real differential-equation-based physics instead of
> hand-tuned parametric shape functions, after the user explicitly asked for "real
> calculus, real math, real physics" and for "all values and graphs to correlate to one
> another." Staged across three checkpoints per an approved plan (`/Users/jsriverab/
> .claude/plans/mutable-roaming-newell.md`); each stage was verified (tests + build) and
> reported before the next began.

**Content classification.** Entirely Bucket A in spirit (quantifiable waveform physics)
but explicitly disclosed as general cardiovascular/respiratory systems physiology
(Suga-Sagawa/Stergiopulos time-varying elastance, Mead-Fry-Whittenberger flow limitation,
single-compartment respiratory mechanics), not literal Miller's citations — Miller's gives
no rendering parameters for any of this. Cross-cutting (monitoring/ventilation display
layer, not tied to a phase of care).

## Stage 0+1 — Respiratory mechanics (`LungComplianceModel.js`, `RespiratoryMechanicsModel.js`)

Replaced three previously-independent approximations of one physical breath — the
ventilator time-strips (`WaveformDatabase.js`'s `ventPressure`/`ventFlow`, a fixed 0.3s
decay constant, **the code actually rendered**, not derived from live R/C at all;
`VentModel.js`'s more rigorous but never-imported `synthesizeVentFlow`/
`synthesizeVentPressure` were confirmed dead code) and the pressure-volume loop's
independent hysteresis formula — with one real equation-of-motion integration every
consumer now reads from.

- **`LungComplianceModel.js`**: a real nonlinear lung P-V curve (compliance peaks at FRC,
  tapers toward both RV and TLC — the ARDSnet upper/lower-inflection-point shape),
  calibrated to exactly reproduce `currentCompliance` at FRC by construction. An initial
  single-power-law design was tried and proven numerically infeasible for realistic adult
  lung volumes before this one was built — see the file's own header comment for the
  worked proof.
- **`RespiratoryMechanicsModel.js`**: solves `Paw - PEEP = ΔPel(ΔV) + R·dΔV/dt` once per
  breath-phase (numerically for PCV/passive-exhalation, since ΔPel is nonlinear), produces
  consistent pressure/flow/volume together, and wires this into `CanvasWaveform.jsx`'s
  ventilator strips for the first time (they were never actually consuming the more
  rigorous dead code before this session).
- **Genuine, derived (not assumed) finding**: passive-exhalation airway pressure comes
  out exactly flat at PEEP for the whole expiratory phase — the same resistance driving
  exhalation flow exactly cancels recoil by the time gas reaches the mouth, which is the
  textbook reason plateau pressure needs an inspiratory *hold*. The previously-displayed
  smooth exponential decay during exhalation did not reflect rigorous single-compartment
  physics for the mouth-pressure measurement point. Interesting expiratory dynamics
  (auto-PEEP, bronchospasm) now correctly surface in the flow trace instead.
- **`FlowVolumeLoopModel.js`** rewritten: expiratory limb now uses the real
  effort-independent maximal-flow relationship $\dot V_{max}(V)=P_{el}(V)/R_{aw}(V)$
  instead of a hand-picked "concavity exponent." Found and fixed during calibration: an
  initial single resistance-volume exponent made obstructive lungs paradoxically *more*
  patent near TLC (where PEF occurs) when amplified for "more dramatic narrowing toward
  RV" — fixed by decoupling the above-FRC and below-FRC resistance behavior.
- **A user-facing decision point, resolved with the user's explicit input**: found an
  unexplained ×5 factor inflating `RespiratoryEngine.ts`'s existing VCV PIP-Pplat gap
  (5x too high, most consequential in bronchospasm/COPD where it would spuriously peg the
  ventilator's pressure safety limit). Presented the concrete numeric impact; user chose
  to fix it directly in the tested numeric engine, not just in the new waveform layer.
- **Verification**: `src/testing/lung_compliance_model.test.ts` (7 tests),
  `src/testing/respiratory_mechanics_unification.test.ts` (10 tests).

## Stage 2 — Cardiac chambers (`CardiacChamberModel.js`)

Replaced `CvpWaveformModel.js`/`PulmonaryArteryCatheterModel.js`'s hand-coded per-pattern
wave-height constants (e.g. AV-dissociation's cannon wave previously being literally
`aHeight = 7.0*scale`) with a coupled RA/RV/PA time-varying-elastance + valve +
Windkessel system, integrated to a periodic limit cycle (architecture note: this
codebase's `CanvasWaveform.jsx` render loop is deliberately stateless, so the system is
integrated once per parameter set and cached — not continuously in real time).

- **Stage 2a reconciliation checkpoint** (committed to before writing live code): swept
  `CardiovascularEngine.ts`'s `lvedpVal` formula across volume/inotropy/AS combinations.
  Found it smooth and well-behaved — safe to use as a feedforward calibration target with
  no blocking decision needed. One pre-existing quirk disclosed but deliberately not
  fixed (out of scope, risks rippling into ischemia/arrest logic): AS only elevates LVEDP
  via deviation from baseline volume, showing zero effect at exactly-normal volume status.
- **Elastance/valve mechanics**: RV uses the published Stergiopulos/Suga-Sagawa
  double-Hill curve; RA/LA use a simpler raised-cosine atrial-systole bump (the full
  ventricular curve's isovolumic-phase shape doesn't apply to atria). AFib = no atrial
  elastance activation; AV dissociation = atrial-contraction phase decoupled from the
  ventricular cycle (a cannon wave emerges when the two happen to coincide); TR/MR = valve
  leak terms. All four patterns now emerge from the mechanism rather than being asserted.
- **A genuine emergent finding, confirmed by direct numerical sweep, not assumed**: the
  pure 2-chamber (RA/RV) ODE could not produce a c wave or y descent for any tested
  combination of venous-return rate and tricuspid resistance — constant venous inflow
  consistently outpaced valve outflow even once the valve reopened. These are passive
  valve-bulge mechanical events, not elastance phenomena; modeled as a small disclosed
  additive perturbation scaled by the ODE's own computed a-wave height.
- **Calibration**: shape parameters tuned once offline against Table 36.2's pressure
  *ratios* (RA a-wave/mean ≈ 2.0, confirmed to fall out at `eRaMax=0.12`); the resulting
  trajectory is rescaled multiplicatively to the live target mean (`vitals.cvp`/
  `vitals.mPAP`) — exact shape preservation, exact target agreement. PCWP/LVEDP rescales
  to a specific end-diastolic phase point, not the cycle mean, since LVEDP is
  conventionally read as an instantaneous value.
- **Disclosed gap found during Stage 3 verification**: RV/RA elastance is not driven by
  live contractility/inotropy — confirmed `CardiovascularEngine.ts`'s internal
  `inotropyFinal` is never exposed on `vitals`/`patient` anywhere, so there is no cheap
  signal to wire this to without modifying that tested engine or threading a new prop.
  Displayed CVP/PA/wedge levels stay correct under inotropic changes (the rescale handles
  that); waveform *shape* does not yet respond to contractility.
- **Verification**: `src/testing/cardiac_chamber_model.test.ts` (10 tests),
  `src/testing/cardiovascular_monitoring_ch36.test.ts` rewritten (22 tests, replacing
  assertions on now-removed internal fields with assertions on actual traced behavior).

## Stage 3 — Cross-consistency verification

`src/testing/waveform_cross_consistency.test.ts` (8 tests): proves CVP and PA pressures
are read from the literal same cached right-heart simulation (not two independently-tuned
models); proves the PV loop and ventilator strips are reads of one shared trajectory
(samples both and confirms numeric agreement, not just design intent); proves a single
`vitals.res` change moves flow-volume PEF, PV-loop PIP, and ventilator peak pressure
together in the correct direction; proves `synthesizeCvpWaveform`/`synthesizePacWaveform`'s
end-to-end cycle-mean pressures match `vitals.cvp`/`vitals.mPAP` exactly through the full
canvas-synthesizer call path; and smoke-tests all four generators together on one
multi-comorbidity (COPD + ventilated + TR) patient.

## What was not integrated / deliberately deferred

- Unifying `ArterialLineModel.js`'s systemic arterial trace into the cardiac chamber model
  (its diastolic decay is already the correct Windkessel solution; only the systolic
  upstroke is hand-shaped) and a full LV/mitral-valve chamber (the LA model uses a
  simplified constant-drain outflow) — both natural, separate follow-ons, not started.
  Contractility/inotropy is not yet wired into the cardiac chambers (see disclosed gap
  above) — would need either a `CardiovascularEngine.ts` change or new prop threading.
- Tricuspid stenosis and pericardial constriction/tamponade's CVP patterns remain
  unmodeled (carried over, undisturbed, from the prior Ch36 session).

**Verification:** 666/666 tests passing (58 test files), build clean (pre-existing
chunk-size warning only, unrelated). New test files this work: `lung_compliance_model`,
`respiratory_mechanics_unification`, `cardiac_chamber_model`, `waveform_cross_consistency`,
plus a rewritten `cardiovascular_monitoring_ch36`.
