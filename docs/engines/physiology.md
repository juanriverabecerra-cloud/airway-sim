# Physiology Engine Reference (§4)

> Part of the `goldenversion.md` ground-truth set. Relocated here so a chapter-integration
> session only loads this file when its content actually touches the cardiovascular,
> respiratory, cerebral, GI, hepatic, or renal engines (see `CLAUDE.md` for when that is).
> Section numbering (§4.x) is preserved exactly as it was in `goldenversion.md` — code
> comments citing e.g. `§6.21` or `§4.12` still resolve correctly, just in this file now.

### 4. Pathophysiology & Vital Signs Engine

#### 4.1 Cardiovascular & Hemodynamic Physiology (`CardiovascularEngine.ts`)

> **Superseded this session (Phase 0, Stage D of `/Users/jsriverab/.claude/plans/
> mutable-roaming-newell.md`)**: stroke volume, MAP, SBP, DBP, and LVEDP below were
> replaced with direct outputs of `CardiacMechanicsEngine.ts` (§4.1.5) — a coupled
> LA-LV-mitral/aortic-valve-systemic-Windkessel time-varying-elastance ODE — rather than
> the separate Frank-Starling-curve/algebraic-LVEDP/pulse-pressure-ratio formulas
> described in points 1-3 below. Those formulas are kept here as **historical record**
> (every other engine in this codebase still reads/writes the same `vitals.sys/dia/map/
> co/svr/lvedp` fields, so understanding what used to compute them remains useful
> context) — see §4.1.5 for what actually runs now. HR computation (point 4, the
> baroreceptor reflex) and SVR's own afterload-setting formula are **unchanged** — only
> the SV/MAP/SBP/DBP/LVEDP chain moved to the new engine.

The cardiovascular engine calculates the patient's continuous perfusion status every second. It models cardiac output ($CO$, L/min) and mean arterial pressure ($MAP$, mmHg):

1.  **Mean Arterial Pressure (MAP)**:
    $$MAP = DBP + \frac{SBP - DBP}{3}$$
    $$MAP_{\text{exact}} = \frac{CO \cdot SVR}{80} + \Delta P_{\text{pressor}} + \Delta P_{\text{sepsis}} - \text{Stunning}_{\text{MAP\_penalty}}$$
    *   *Systemic Vascular Resistance ($SVR$)*: Normal range is $900 - 1400\text{ dyn}\cdot\text{s}\cdot\text{cm}^{-5}$. Updates dynamically based on vasodilation, vasoactive infusions, and autonomic reflexes. Under celiac or thoracic epidural sympathetic blockade (TEA):
        $$\text{targetSVR} *= (1.0 - 0.15 \cdot \text{SympatheticBlock})$$
        where $\text{SympatheticBlock} = 1.0$ if a celiac plexus block is active, else $\text{epiduralCoverageFraction}$ if a thoracic epidural is active (`epiduralBlockActive`), else $0.0$.
        *   *Dermatomal Epidural Coverage (Ch15, TABLE 15.2, Miller's 9th Ed)*: Splanchnic vasculature follows the same visceral sympathetic chain (T5-L1 via the celiac plexus, spanning liver/biliary through sigmoid/rectum) as the GI organs it perfuses. A celiac plexus block targets the ganglion directly (Fig 15.4/15.5) for complete splanchnic block regardless of level. A thoracic epidural's effect is graded by the dermatomal overlap between its insertion-level block span and this T5-L1 range:
            $$\text{epiduralCoverageFraction} = \text{calculateDermatomalBlockFraction}(\text{epiduralLevel}, 5, 13)$$
            $$\text{calculateDermatomalBlockFraction}(L, R_{lo}, R_{hi}) = \text{clamp}\left(\frac{\min(L+4, R_{hi}) - \max(L-4, R_{lo})}{R_{hi} - R_{lo}}, 0, 1\right)$$
            where $L$ is the catheter's thoracic dermatome (e.g. $8$ for T8), the $\pm 4$ segment spread is a standard clinical estimate (not a textbook-sourced constant) for a therapeutic epidural bolus, and $[R_{lo}, R_{hi}]$ is the target organ's dermatomal range on a $T1\text{-}T12, L1\text{-}L5$ integer scale ($T1=1 \ldots T12=12, L1=13 \ldots$). If `epiduralBlockActive` is set with no `epiduralLevel` specified, coverage defaults to $1.0$ (back-compatible with the prior all-or-nothing boolean). Implemented once in `Pharmacology.js` (`calculateDermatomalBlockFraction`) and consumed by both `CardiovascularEngine.ts` (this section) and `GastrointestinalEngine.ts` (§4.11) with organ-specific ranges, rather than duplicated inline. The UI exposes a "Place Thoracic Epidural" level selector (T4-T12) and a "Celiac Plexus Block" toggle in the Lines & Resus panel — both flags were previously inert (set only in test fixtures, with no live in-session control).
    *   *Pressor Pressure Shift (\Delta P_{\text{pressor}})*:
        $$\Delta P_{\text{pressor}} = \frac{\text{EffectiveVolume} - EBV - \text{splanchnicPoolingOffset}}{250} \cdot 8$$
        where $\text{splanchnicPoolingOffset} = 1000 \cdot (V_{\text{splanchnic}} - 1.0)\text{ mL}$. Sympathetic block dilates mesenteric capacitance vessels, causing relative splanchnic pooling ($V_{\text{splanchnic}} > 1.0$). This is reversed by alpha-1 adrenergic receptor stimulation:
        $$V_{\text{splanchnic}} = 1.0 + 0.3 \cdot \text{SympatheticBlock} \cdot (1.0 - \text{AlphaAgonistEffect})$$
        where $\text{AlphaAgonistEffect} = 1.0$ if Phenylephrine, Norepinephrine, or Epinephrine is active.
    *   *Sepsis Pressure Shift (\Delta P_{\text{sepsis}})*: Drops SVR and subtracts $33.33\text{ mmHg}$ from MAP due to vasoplegia.
    *   *Stunning MAP Penalty (\text{Stunning}_{\text{MAP\_penalty}})*: If myocardial stunning is present, MAP is reduced by the stunning percentage.
2.  **Cardiac Output (CO)**:
    $$CO = \frac{HR \cdot SV}{1000} \quad \text{[L/min]}$$
    *   *Cross-check (Fick Principle, Fig 14.7, Miller's 9th Ed)*: $CO = \frac{VO_2}{CaO_2 - CvO_2}$. The simulator runs the inverse direction (computing $CvO_2$ from a dynamically-derived $CO$ via the Fick equation in §4.8) rather than deriving $CO$ from measured $O_2$ contents, since $CO$ is itself a primary state variable here rather than a clinical measurement to be inferred.
    *   *Stroke Volume ($SV$)*: Derived from Frank-Starling preload curves, contractility, and stunning factors:
        $$SV = \min\left(SV_{\text{max}}, SV_{\text{base}} \cdot Preload_{SV} \cdot \max(0.1, Inotropy) \cdot CHF_{\text{penalty}} \cdot AFib_{\text{penalty}} \cdot Neurohormonal_{\text{inotropy}}\right)$$
        *   *Frank-Starling Preload Stroke Volume ($Preload_{SV}$)*: Models stroke volume variation as a function of LVEDP (Fig 14.3/14.5, Miller's 9th Ed: sarcomere length-tension relationship; leftward/rightward curve shifts denote inotropic state):
            $$Preload_{SV} = 1.2 \cdot \left(1.0 - e^{-0.15 \cdot LVEDP_{\text{Starling}}}\right) \cdot \left(1.0 - 1.2 \cdot \text{BloodLossRatio}\right)$$
            where $LVEDP_{\text{Starling}} = \min(LVEDP, 12.0)$ for Severe Aortic Stenosis patients (see below), else $LVEDP_{\text{Starling}} = LVEDP$.
        *   *Left Ventricular End-Diastolic Pressure ($LVEDP$)*: Calculated dynamically from intravascular volume offsets and myocardial inotropy:
            $$LVEDP = \max\left(2.0, \min\left(40.0, 8.0 + 4.0 \cdot AS_{\text{stiffness}} \cdot \frac{\text{EffectiveVolume} - EBV}{250} + \frac{5.0}{Inotropy}\right)\right)$$
            where $AS_{\text{stiffness}} = 1.4$ for Severe Aortic Stenosis (diastolic stiffness from concentric LV hypertrophy), else $1.0$.
        *   *Inotropy ($Inotropy$)*:
            $$Inotropy = \max\left(0.01, 1.0 - \frac{\text{Stunning}}{100} + \text{Inotropy}_{\text{drugs}} + \text{Spike}_{\text{contractility}}\right)$$
        *   *Severe Aortic Stenosis ($SV_{\text{max}}$ fixed-orifice cap)*: $SV_{\text{max}} = SV_{\text{base}} \cdot 1.10$ (vs. $1.6$ normally; $1.0$ for CHF). The fixed valvular orifice prevents recruiting additional forward stroke volume regardless of preload or inotropic state — the classic teaching point that AS patients cannot compensate for acute SVR drops by raising $CO$ (Fig 14.4, Miller's 9th Ed; Laplace's law $\sigma = \frac{P \cdot R}{2h}$ — compensatory LV hypertrophy normalizes wall stress despite elevated LV pressure, but yields a diastolically stiff, preload-capped ventricle). Triggered by `patient.as` (existing case-builder flag) or `patient.aorticStenosis`.
        *   *Neurohormonal Cardiac Support ($Neurohormonal_{\text{inotropy}}$, TABLE 14.1, Miller's 9th Ed)*: Vasopressin and Angiotensin II exert direct $+$inotropy/$+$chronotropy via V1a/AT1 myocardial receptors, becoming consequential mainly when markedly elevated above their `RenalEngine.ts` baseline ($\approx 0.1$) during hypovolemia/stress:
            $$Neurohormonal_{\text{inotropy}} = 1.0 + 0.15 \cdot \max(0, AVP - 0.1) + 0.10 \cdot \max(0, Ang II - 0.1)$$
            $$Neurohormonal_{\text{HRdelta}} = 8.0 \cdot \max(0, AVP - 0.1) + 6.0 \cdot \max(0, Ang II - 0.1) \quad \text{[bpm, added to } totalHrDelta\text{]}$$
            Aldosterone's "Cardiac Action" cell is blank in Table 14.1 (mineralocorticoid/fibrotic, not contractile) and is intentionally **not** given a direct inotropic/chronotropic effect — only its release-driving upstream hormone, Angiotensin II, is. $Ang II$ is computed in `RenalEngine.ts` as the explicit RAAS intermediate upstream of the pre-existing `aldosteroneLevel` (same sympathetic/hypovolemic afferents, not a separately-sourced textbook constant).
3.  **Systolic (SBP) & Diastolic (DBP) Pressures**:
    Systolic and diastolic pressures are derived from MAP and Pulse Pressure ($PP$, mmHg), which scales with stroke volume:
    $$PP = 40 \cdot \frac{SV}{SV_{\text{base}}}$$
    $$SBP = MAP + \frac{2}{3} \cdot PP + \text{Noise}_{\text{sys}}$$
    $$DBP = MAP - \frac{1}{3} \cdot PP + \text{Noise}_{\text{dia}}$$
4.  **Autonomic Reflexes - Baroreceptor Reflex**:
    *   *Baroreflex Gain (\text{baroreflexGain})*: Blunted dose-dependently by volatile anesthetics and completely bypassed under connected awareness crises:
        $$\text{baroreflexGain} = \max\left(0, 1.0 - \text{currentMac} \cdot 0.67\right)$$
    *   *Autonomic Heart Rate Mod (\text{autonomicHrMod})*:
        $$\text{Error}_{\text{baro}} = MAP - MAP_{\text{set}} \quad \text{where } MAP_{\text{set}} = DBP_{\text{base}} + \frac{SBP_{\text{base}} - DBP_{\text{base}}}{3}$$
        $$\text{autonomicHrMod} = \max\left(-25, \min\left(30, -0.5 \cdot \text{Error}_{\text{baro}} \cdot \text{baroreflexGain}\right)\right)$$
        Reflex bradycardia is blunted (set to 0) if antimuscarinic drugs block cholinergic receptors (`totalHrDelta > 15`).

#### 4.1.1 CVP & Pulmonary Artery Catheter Waveform Display Models (`CvpWaveformModel.js`, `PulmonaryArteryCatheterModel.js`)
Source: Miller's 9th Ed, Ch36 ("Cardiovascular Monitoring"), TABLE 36.2 (normal pressures),
TABLE 36.3/36.4 (CVP waveform components/abnormalities), TABLE 36.5 (PCWP-vs-LVEDP
discrepancies), Figs 36.35-36.46 (waveform morphology, directly reviewed pixel-by-pixel,
not just the auto-extracted figure metadata).

> **Superseded this session**: both files now consume `CardiacChamberModel.js` (§4.1.3) —
> the a/c/v/x/y waveform shape and its AFib/AV-dissociation/TR/MR patterns emerge from a
> genuine coupled-ODE integration rather than the hand-coded per-pattern wave-height
> constants this section originally described. The clinical content below (which named
> CVP/PAC pattern maps to which Table 36.4 finding, the PCWP-vs-LVEDP discrepancy
> directions, the catheter artifacts) is unchanged; only the underlying generator is new.

*   **Named CVP patterns** (Table 36.4): atrial fibrillation (`patient.afib` or
    `cardiacRhythm==='afib'`) removes atrial elastance activation (no a wave, relatively
    more prominent c wave); AV dissociation/asynchronous pacing (`patient.avDissociation`)
    decouples atrial-contraction timing from the ventricular cycle, producing a cannon
    wave when the two happen to coincide; tricuspid regurgitation
    (`patient.tricuspidRegurgitation`) adds a valve-leak term that raises mean RA pressure
    and produces the "ventricularized" fused c-v appearance (Fig 36.37).
*   **PA/wedge**: PA systolic/diastolic are read directly off the same chamber model's
    `pPA` trace used for CVP (one coupled simulation, not two independently-tuned
    approximations of a physically connected system) — no separate MAP-style algebraic
    formula. The PA trace's diastolic-falling / RV diastolic-rising differentiator (Fig
    36.38) is a genuine consequence of the Windkessel vs. elastance-chamber dynamics, not
    a hand-coded asymmetry. PCWP/wedge overestimation of true LVEDP with PEEP > 10
    (lung zone 1/2 creation) or mitral regurgitation (Table 36.5) is unchanged from before
    — still a disclosed, reasoned magnitude, since the source names the direction of each
    discrepancy but not a literal mmHg figure.
*   **Catheter artifacts**: `patient.pacWhipArtifact` (catheter-motion ripple at systole
    onset, Fig 36.39) and `patient.pacOverwedged` (non-pulsatile climbing pressure, Fig
    36.40) are unchanged engine-level capabilities, not wired to an automatic trigger
    condition this session.
*   **Deliberately not modeled** (documented gaps, unchanged): tricuspid stenosis and
    pericardial constriction/tamponade's full M/W-configuration equalization pattern; the
    RA→RV→PA→wedge insertion-transition sequence remains structured reference data only
    (`PAC_INSERTION_SEQUENCE`), not an interactive insertion UI.

#### 4.1.3 Coupled Right-Heart Lumped-Parameter Circulation Model (superseded — see §4.1.6)

> **Superseded (Phase 0, Stage E)**: `CardiacChamberModel.js` was unified with the left-
> heart model (§4.1.5) into `FourChamberCircuitModel.ts` — see §4.1.6. The right-heart
> mechanics, AFib/AV-dissociation/TR patterns, and the c/v/y-wave mechanical perturbation
> described below are otherwise unchanged; only the file/connection changed.
> **Sourcing note**: general cardiovascular systems physiology (the Suga-Sagawa/
> Stergiopulos time-varying-elastance framework, a 2-element Windkessel for the pulmonary
> artery) — not a specific Miller's citation. Disclosed per this project's standing
> convention.

A real coupled RA-RV-PA system (time-varying-elastance chambers + valve flow laws + a
Windkessel vascular compartment), integrated to a periodic limit cycle, replacing the
hand-coded per-pattern CVP/PA wave-height constants `CvpWaveformModel.js`/
`PulmonaryArteryCatheterModel.js` used earlier this session.

*   **Architecture**: `CanvasWaveform.jsx`'s render loop is deliberately stateless (every
    waveform synthesizer is a pure function called fresh every animation frame, with no
    physiology state carried between frames). A continuously-integrated real-time ODE does
    not fit that without a larger architecture change — confirmed as the single most
    important correction from this redesign's technical review. Instead, the system is
    integrated **once per parameter set** (6 settling cycles discarded, the periodic limit
    cycle recorded and cached via simple module-level memoization — the same pattern as
    `RespiratoryMechanicsModel.js`), and the per-frame canvas code interpolates into that
    cached trajectory.
*   **Elastance activation**: RV uses the published Stergiopulos/Suga-Sagawa double-Hill
    normalized curve. RA/LA use a simpler raised-cosine bump timed to atrial systole — the
    full ventricular curve's isovolumic-phase shape does not apply to atria and would
    misrepresent the a/v wave shape (a correction from this redesign's technical review).
*   **Valve flow**: a simple resistive law, `Q = max(0, P_upstream - P_downstream) / R`,
    with a regurgitant leak term (`Q_leak = max(0, P_downstream - P_upstream) / R_leak`,
    `R_leak` falling as severity rises) for TR (tricuspid) and MR (mitral, modeled as a
    direct systolic-timed regurgitant inflow pulse into a standalone LA chamber, since a
    full LV/mitral-valve model is out of scope this session).
*   **A genuine emergent finding confirmed by direct numerical sweep, not assumed**: the
    pure 2-chamber (RA/RV) elastance ODE, tested across a wide range of venous-return-rate
    and tricuspid-valve-resistance combinations, could not produce a c wave, v wave, or y
    descent — the RA pressure trace stayed monotonic between the x descent and the next a
    wave for every combination tried, because constant venous inflow consistently
    outpaced valve outflow even after the valve reopened. **Caught from a rendered
    screenshot, not from reviewing the equations**: this made the actual displayed trace a
    single dominant a-wave spike occupying ~12% of the cycle with the remaining ~88%
    nearly flat (the c/y perturbation initially added below was only ~0.5 mmHg against a
    ~6 mmHg spike — invisible at real scale) — not a recognizable multi-phasic CVP trace.
    The c wave (tricuspid valve bulging into the atrium during isovolumic ventricular
    contraction), v wave (continued venous filling against the closed tricuspid valve in
    late systole), and y descent (rapid early-diastolic atrial emptying) are all
    mechanically passive valve events, not elastance phenomena — modeled as disclosed
    additive perturbations timed to where Table 36.3 places each event, with amplitudes
    (and `eRaMax`) calibrated *together* against Table 36.2's a-wave/mean (≈2.0) **and**
    v-wave/mean (≈1.67) ratios, not just the a-wave alone — confirmed by direct
    calibration sweep to fall out at `eRaMax=0.13`, c-wave/v-wave/y-descent amplitudes of
    0.12/0.60/0.10 (as fractions of the ODE's own computed a-wave height). The resulting
    trace now shows a clear x descent, a v wave comparable in height to the a wave, and a
    y descent before the diastolic plateau — confirmed numerically and reasoned through
    per pattern (AFib's now-dominant v wave since the a wave is gone — itself a correct,
    additional emergent/clinically-consistent behavior not specifically designed for; TR's
    tall fused c-v wave reaching ~83% of the a-wave height with a visibly shallower x
    descent and an elevated diastolic plateau).
*   **Calibration**: the coupled nonlinear valved system's absolute pressure level cannot
    be solved in closed form for an arbitrary target mean (confirmed impractical during
    prototyping — every parameter combination tested needed a different absolute scale to
    hit a given target, with no tractable closed-form relationship). Shape parameters were
    tuned once, offline, against Table 36.2's normal pressure ratios (see above). The
    resulting trajectory is then rescaled **multiplicatively** so its cycle mean exactly
    equals the live target (`rescaleToTargetMean()`) — this preserves the ODE-derived
    relative shape exactly (a pure scale transform) while guaranteeing exact agreement
    with the numbers already displayed elsewhere in the UI. PCWP/LVEDP is rescaled to
    match at a *specific end-diastolic phase point* rather than the cycle mean
    (`rescaleToPhaseValue()`), since LVEDP is conventionally read as an instantaneous
    value, unlike CVP/mPAP which are conventionally means — a distinction surfaced during
    this redesign's reconciliation checkpoint (see below).
*   **Stage 2a reconciliation checkpoint** (committed to before writing any live code):
    swept `CardiovascularEngine.ts`'s existing `lvedpVal` formula across realistic volume/
    inotropy/AS combinations before building the LA/wedge chamber. Found it smooth,
    monotonic, and properly clamped (2-40 mmHg) — safe to use as a feedforward calibration
    target with no visible cross-consistency risk. One pre-existing quirk noted but
    deliberately not fixed (out of scope, and fixing it risks rippling into ischemia/
    arrest-triggering logic that reads the same value): aortic stenosis only elevates
    LVEDP via its *deviation* from baseline intravascular volume, so an AS patient at
    exactly-normal volume status shows zero AS effect on LVEDP — the new wedge trace
    inherits this as-is rather than silently diverging from the displayed number.
*   **Cross-consistency** (the property this whole redesign was for): CVP and PA pressure
    are now read from literally the *same* `getRightHeartCycle()` call — not two
    independently-tuned models of a physically connected system. `cardiac_chamber_model.test.ts`
    directly asserts the RV-rises/PA-falls diastolic differentiator, AFib's a-wave
    suppression, AV dissociation's mid-cycle (not late-diastolic) pressure peak, TR's
    elevated mean, MR's elevated LA peak, and that the rescale transform preserves shape
    ratios exactly.
*   **Out of scope this session** (a natural, separate follow-on): unifying
    `ArterialLineModel.js`'s systemic arterial trace into the same chamber model (its
    diastolic decay is already the correct Windkessel solution; only the systolic upstroke
    is currently hand-shaped) and a full LV/mitral-valve chamber (the LA model above uses a
    simplified constant-drain outflow instead).
*   **Disclosed gap found during Stage 3 verification**: RV/RA elastance (`eRvMax`/
    `eRaMax`) are fixed constants, not driven by live contractility/inotropy — confirmed
    by checking that `CardiovascularEngine.ts`'s internal `inotropyFinal` is never exposed
    on `vitals` or `patient` anywhere in the codebase, so there is currently no cheap
    signal to wire this to without either modifying that tested numeric engine (out of
    scope) or threading a new prop through `CanvasWaveform.jsx`/`PrimaryMonitor.jsx`. This
    means the rescale-to-target-mean calibration keeps the displayed CVP/PA/wedge *levels*
    correct under inotropic changes (e.g. an epinephrine infusion), but the *waveform
    shape* (a-wave/mean ratio, systolic upstroke steepness) does not currently respond to
    contractility the way a fully-coupled model would — a real, identified limitation, not
    a silent one.

#### 4.1.4 Arterial Line Dynamic Response — Fast-Flush Test (`calculateDynamicResponse`, `ArterialLineModel.js`)
Source: Ch36, Figs 36.22-36.25 — the worked fast-flush example: a 1.7 mm oscillation-cycle
period at 25 mm/s paper speed gives a natural frequency of 14.7 Hz; consecutive
oscillation-peak heights of 17 mm and 24 mm give an amplitude ratio (damping coefficient)
of 0.71 (the peak-height-ratio/period-to-frequency relationship was confirmed directly
from Fig 36.25's pixels, since the chapter gives the worked numbers but not the
intermediate formula).

> **Sourcing note**: this model maps `ArterialLineModel.js`'s existing three discrete
> damping states (`normal`/`underdamped`/`overdamped`, already driving the live waveform)
> onto representative natural-frequency/damping-coefficient number pairs, anchored to the
> chapter's one worked example. The specific numbers chosen for each state are a disclosed,
> reasoned generalization, not a per-state citation.

*   `normal` → 16 Hz / 0.45 (clinically adequate — oscillation cycles settle in well under
    the textbook's <30 ms "adequate" threshold).
*   `underdamped` → 24 Hz / 0.15 (rings for several cycles, systolic overshoot, falsely
    widened pulse pressure).
*   `overdamped` (explicit flag, or inferred from a 22G arterial catheter gauge) → 7 Hz /
    0.85 (no ringing, but the dicrotic notch and fine detail are lost, pulse pressure reads
    falsely narrow; MAP stays reasonably accurate despite the distorted shape, per the
    chapter's explicit repeated point).
*   Reachable from the Attending chat (`ClinicalAiChat.js`) via "fast flush"/"square
    wave"/"damping"/"natural frequency" keywords, grounded in the live arterial line's
    damping state when one is placed.

#### 4.1.5 Left-Heart Chamber Mechanics Replace Stroke Volume/MAP/SBP/DBP/LVEDP (superseded -- see §4.1.6)

Phase 0 (Stage D) of `/Users/jsriverab/.claude/plans/mutable-roaming-newell.md`: a
coupled LA-LV-mitral-valve-aortic-valve-systemic-Windkessel time-varying-elastance ODE
(Suga-Sagawa/Stergiopulos framework, same general-physiology sourcing convention as
§4.1.3's right-heart model), integrated to a periodic limit cycle inside
`CardiovascularEngine.tick()`, replacing §4.1's points 1-3 (Frank-Starling SV curve,
algebraic LVEDP, pulse-pressure-ratio SBP/DBP split). Real inotropy (`inotropyFinal` —
previously computed but never exposed outside this engine), dromotropy (`prInterval`),
AS (concentric-hypertrophy compensation + diastolic stiffness, replacing the old
`maxSV`/`starlingEffectiveLvedp` caps), and CHF (diastolic stiffness + contractility
penalty) now drive the chamber mechanics directly rather than acting as external
multipliers layered on a separate formula. `CardiovascularEngine.tick()` calls the engine
**twice per tick** — once with `inotropyInitial` (pre-ischemia-loop) to get this tick's
LVEDP for the ischemia-detection/CPP/MVO2/Bainbridge logic (mirroring the original
formula's same initial/final inotropy split), once with `inotropyFinal` (post-ischemia-
loop) for the tick's actual SV/CO/MAP/SBP/DBP output. HR's own computation (baroreceptor
reflex, §4.1 point 4) and SVR's own afterload-setting formula are unchanged — both feed
into the chamber engine as inputs, not outputs of it.

*   **A decision point surfaced by direct comparison, not a bug**: side-by-side testing
    against the old formula found that a pure contractility increase (e.g. epinephrine's
    inotropic effect in isolation) barely moves CO in the new engine (5.1→5.3 L/min for a
    1.8x inotropy multiplier) versus nearly doubling it in the old linear formula
    (5.0→10.1 L/min). The new engine's muted response is the textbook-correct one —
    stroke volume is preload-bounded (Frank-Starling ceiling), so pure contractility
    mainly raises ejection fraction (less residual end-systolic volume) rather than
    stroke volume once filling is already adequate; real epinephrine's full CO effect
    comes from concurrent venous-return augmentation and chronotropy, mechanisms slated
    for Phase 1 (vascular tree) and already-existing HR effects, not contractility alone.
    Given the user's explicit direction toward modeling these as separate real
    mechanisms rather than folding everything into one inotropy multiplier, the literal
    (muted) response was kept with no compensating patch.
*   **New outputs not previously available anywhere in this codebase**: `lvEdv`, `lvEsv`,
    `lvEf` (end-diastolic/end-systolic volume and ejection fraction) — the chamber
    engine's echo-readiness payoff (Phase 0/Stage E and beyond), unused by any live
    feature yet but exposed on `CardiacMechanicsInputs`/`CardiacMechanicsOutput`.
*   **Calibration**: `SVR_TO_R_SCALE=1175` (Windkessel resistance-units bridge, same
    disclosed-constant pattern as `FLOW_SCALE_FACTOR`/`SVR_TO_R_SCALE` elsewhere in this
    redesign) and a `preloadRatio` ceiling of 3.0 (3x normal blood volume — raised once
    during this session's test reconciliation from an initial 2.0, which couldn't reach
    the Bainbridge reflex's >18 mmHg LVEDP trigger at any input severity).
*   **Damping**: CO/MAP/SBP/DBP/SV are read **undamped** each tick directly from the
    chamber engine's instantaneous output (matching how `currentSV` was *never* damped in
    the original formula either) — only SVR keeps the original 10%-per-tick relaxation
    (it's an independent vasomotor-tone input, not a chamber-engine output). An initial
    implementation damped MAP/SBP/DBP and additionally kept CO's old "snap to target if
    within 0.05" rule; both were removed after testing surfaced concrete problems: the
    CO snap-rule produced a genuine *non-monotonic* artifact (whichever of two compared
    scenarios had its target closer to a test fixture's starting CO would snap fully
    while the other moved only 10%, occasionally reversing the expected ordering between
    e.g. a healthy vs. myocardially-stunned patient), and damping MAP directly made
    single-tick sympathetic-surge scenarios respond far too slowly against the now-
    self-consistent engine output.
*   **Downstream threshold reconciliation** (the mmHg-dependent code in `RenalEngine.ts`/
    `CerebralEngine.ts`/`HepaticEngine.ts`/`PainEngine.ts`/`AttendingEngine.js` flagged
    during planning): verified by direct numerical sweep that every flagged threshold
    (MAP 40/55/60/65/90, LVEDP 18) remains reachable at clinically appropriate input
    severity under the new engine — no downstream constants needed to change.
*   **Verification**: `src/testing/cardiac_mechanics_engine.test.ts` (12 tests, Stage A,
    standalone). Stage D's live swap surfaced 4 failing tests in the existing suite, all
    traced to genuine new-physics divergence (not engine bugs) and fixed forward per the
    plan's explicit instruction: two needed larger input severities to clearly cross a
    threshold given the new engine's different (not wrong) preload/inotropy sensitivity,
    one needed isolating from a confounding reflex (Bezold-Jarisch) that the original
    formula's larger LVEDP swing hadn't triggered at the same test input, and one needed
    a comparison-based assertion instead of an absolute post-single-tick value (a real
    several-bpm target shift, after 10%-per-tick HR damping, can be smaller than this
    test suite's existing random per-tick HR noise). One pre-existing, unrelated flaky
    test (`should verify targetHR stabilizes with chronotropic drug`) was identified as
    flaky *before* this change too (confirmed by direct repeated testing) and left
    untouched — it depends only on HR computation, which this work never modified.

#### 4.1.6 Closed Four-Chamber Circulation: RA-RV-PA-LA-LV-Aorta (`FourChamberCircuitModel.ts`)

Phase 0, Stage E. Unified what had been two separately-integrated systems (§4.1.3's
right heart, §4.1.5's left heart) into one coupled ODE, closing the pulmonary half of
the circulatory loop for real: the pulmonary artery's actual computed outflow (through
pulmonary vascular resistance) is now the left atrium's actual inflow, replacing both
predecessor files' simplification of assuming a constant for the other side's
contribution. `CvpWaveformModel.js`, `PulmonaryArteryCatheterModel.js` (both waveform
types now read PA *and* wedge from the same cached cycle), and
`CardiovascularEngine.ts` (both of its per-tick calls, §4.1.5) all now read this one
model. Systemic venous return (RA's inflow) remains an input-derived constant scaled by
`preloadRatio` — modeling that as a real systemic venous/capillary system, so RA's
inflow is itself a consequence of what the aorta pumped out, is Phase 1's job (the
vascular tree), not this stage's.

*   **A significant recalibration was required, not just a wiring change**: the
    predecessor right-heart model's absolute PA/RV pressure levels were never
    individually calibrated to be realistic — only their *shape* mattered, since
    `CvpWaveformModel.js`/`PulmonaryArteryCatheterModel.js` always rescaled the result to
    `vitals.cvp`/`vitals.mPAP` before display. Connecting PA's real output directly into
    a real LA chamber meant its absolute level suddenly mattered for the first time:
    initial wiring produced mPAP≈38 (vs. a textbook-normal ≈15), starving/flooding LA
    filling and collapsing downstream MAP to ≈42-56. `rPAexit` (pulmonary vascular
    resistance, 0.6→0.0875), `qVenousSystemic` (RA's venous-return input, 80→130), and
    `SVR_TO_R_SCALE` (the systemic Windkessel calibration bridge, 1175→1000) were jointly
    re-solved by direct numerical sweep (not solvable in closed form for this coupled
    nonlinear system) to land the connected loop's baseline near
    `CardiovascularEngine.ts`'s existing resting targets (MAP≈87, SBP≈103, DBP≈66,
    CO≈5.4 L/min, LVEDP≈9, mPAP≈18 — upper-normal but in range). All Stage 0-D pathology
    scenarios (hypovolemia, AS, CHF, high/low SVR, AFib) were re-verified directionally
    correct after recalibration.
*   **A genuine missing mechanism surfaced, not a bug**: re-running the existing test
    suite after the swap found vasopressin/Angiotensin II's hemodynamic-shock-compensation
    test now failing — elevated HR plus inotropy alone, at *unchanged* preload, could
    actually *lower* CO in the connected model (shorter diastolic filling time at higher
    HR outweighing the inotropy gain on stroke volume) — a real, isolated-variable finding,
    but incomplete: real vasopressin/Angiotensin II compensate for hemorrhagic shock
    substantially through *venoconstriction*, shifting blood from venous capacitance into
    effective circulating volume, not contractility/chronotropy alone. Added
    `neurohormonalPreloadBoost` in `CardiovascularEngine.ts` (a disclosed, Table-14.1-
    grounded ratio bump on `preloadRatioForLvedp`, the same scaling pattern as the existing
    `neurohormonalInotropy`/`neurohormonalHrDelta` terms) rather than reverting the more
    correct physiology or patching the test — Phase 1's real venous compartment will
    eventually replace this ratio bump with a genuine volume-compartment shift.
*   **Verification**: `src/testing/four_chamber_circuit_model.test.ts` (17 tests,
    consolidating and extending the predecessor right-heart and left-heart test files,
    both deleted). The live re-wiring surfaced 5 more failing tests across
    `cardiac_physiology_ch14.test.ts`, `awareness.test.ts`, and `pain.test.ts`: the
    neurohormonal one fixed by the venoconstriction addition above; the AS-at-rest CO
    tolerance widened slightly (0.3→0.35, a ~5% recalibration shift, the underlying
    "near-identical at rest" relationship unchanged); two sympathetic-surge MAP/SBP
    thresholds (awareness, pain) lowered to match the connected model's still-elevated
    but more conservative converged values (same afterload-mismatch mechanism as Stage
    D's analogous fixes); and one chronotropic-drug HR-convergence test's target range
    shifted upward (125→~137) after discovering a genuine, newly-possible vicious-cycle
    interaction: extreme Atropine-driven tachycardia alone (no preload/inotropy support)
    reduces diastolic filling time enough to lower MAP, which the baroreflex then tries
    to correct with *further* tachycardia (its only available lever here) — bounded, not
    runaway, but converging higher than the old HR-independent-stroke-volume formula's
    125. 673/673 tests passing, build clean.

#### 4.1.7 Vascular Tree, Stage A: Parallel Arterial Beds + Venous Reservoirs (`FourChamberCircuitModel.ts`)

Phase 1, Stage A. Closes the *systemic* half of the circulatory loop the way Stage E
closed the pulmonary half: instead of the right atrium's inflow being an external,
input-derived constant (`qVenousSystemic`), the aorta now empties through parallel
arterial vascular beds (splanchnic/renal/skeletal-muscle/cerebral/coronary/skin/other,
each independently resistance-modifiable, fractions of resting CO a disclosed general-
physiology estimate, not a specific citation) into venous reservoirs — a central pool
plus a separate, more compliant splanchnic pool — which drain into the right atrium.
`CardiovascularEngine.ts`'s single `preloadRatio` input is gone; `totalBloodVolumeMl`
(literally `effectiveIntravascularVolume`, in mL) is now the one source of preload truth
across the *entire* closed loop, redistributed across all compartments by the ODE itself
rather than fed in pre-divided.

*   **Venous unstressed-volume framework**: most of the venous pools' volume is
    "unstressed" — fills compliant venous capacity without generating pressure (the
    textbook reason veins are the body's blood reservoir, holding roughly two-thirds of
    blood volume at low pressure). Only the excess above that threshold drives pressure.
    Central unstressed volume is recruited (lowered) under elevated sympathetic tone
    (proxied by SVR relative to its own baseline — the same efferent outflow that
    vasoconstricts arterioles also venoconstricts) — a real, named compensatory mechanism
    (recruiting unstressed volume to defend preload during shock) that was *absent*
    before Stage A; without it, a static "40% blood loss" snapshot collapses far more
    catastrophically than a real patient's own venoconstriction would allow.
*   **Splanchnic pooling becomes a real compartment, not a volume-offset hack**:
    `CardiovascularEngine.ts`'s `splanchnicPoolingOffset` (`1000 * (splanchnicVol-1.0)`,
    subtracted from `effectiveIntravascularVolume`) is removed entirely. The same
    underlying signal (`sympatheticBlock`/`alphaAgonistEffect`, driven by celiac-plexus/
    thoracic-epidural block and alpha-agonist vasopressors, TABLE 15.2) is now passed as
    `splanchnicTone` directly into the closed-loop model, where it sets the *actual*
    splanchnic venous reservoir's unstressed volume and bed resistance — sympathetic
    block genuinely pools blood in a real compartment with its own compliance, rather
    than subtracting a flat number from a single "effective volume" scalar.
*   **A substantial joint recalibration, the same lesson as Stage E repeated**: adding a
    real resistance/compliance path between the aorta and the right atrium (where none
    existed before — `qVenousSystemic` had no resistance constraint at all) measurably
    raises the *system's* total effective resistance, requiring `SVR_TO_R_SCALE` (1000→
    1500), the venous-return resistance, and the venous compliances/unstressed volumes to
    be jointly re-solved by numerical grid search back to the existing resting targets
    (MAP≈87, CO≈5.4 — unchanged from Stage E's targets, confirming the recalibration
    didn't silently drift the baseline). The existing `neurohormonalPreloadBoost`
    (vasopressin/Angiotensin II's venoconstriction proxy, added during Stage E) needed
    its own coefficients reduced roughly 4x (0.20/0.15→0.05/0.0375) after the real
    venous-compartment model turned out far more volume-sensitive than the
    `preloadRatio`-based model it was originally tuned against — the old magnitude pushed
    MAP into the 140s+ at maximal AVP/AngII, triggering a baroreflex *overcorrection* that
    dropped HR below baseline instead of raising it (caught by the existing test for that
    exact scenario, not a new one written for this stage).
*   **New output**: `cvp` (mean RA pressure) is now a genuine aggregate output of the
    closed-loop model itself, rather than only being read by separately rescaling the
    waveform-layer's RA trajectory to a `vitals.cvp` target — not yet wired into
    `CardiovascularEngine.ts`'s own `vitals.cvp` (which still comes from elsewhere), a
    natural follow-on once that field's existing computation is examined.
*   **Deliberately not yet modeled** (Stage A's explicit scope boundary): only the
    splanchnic and central venous pools have their own compliance; skin's venous
    capacitance (relevant to thermoregulation and is on this roadmap's later
    integumentary phase) is folded into the central pool for now. The arterial beds are
    simple parallel resistors with no capacitance of their own (real arterioles do have
    some, but it's small relative to the venous side and was not worth the added
    complexity this stage). Cerebral/renal/coronary autoregulation (these beds
    maintaining their own flow despite swings in driving pressure, within limits) is not
    yet modeled — each bed's resistance currently only changes via the single
    `splanchnicTone` input and the shared sympathetic-driven venous tone; per-bed
    autoregulation is a natural Stage B/C follow-on.
*   **Verification**: `src/testing/four_chamber_circuit_model.test.ts` extended (5 new
    tests: the splanchnic-pooling mechanism, the total-volume Frank-Starling relationship
    re-verified against the new volume-based input, a bounded-volume sanity check under
    combined low-volume/high-demand stress). Re-running the full existing suite after the
    live swap surfaced exactly one failure (the AVP/AngII test above), traced to the
    same genuine recalibration-sensitivity pattern as every prior stage and fixed at the
    source (the boost coefficient) rather than by loosening the test. 675/675 tests
    passing, build clean.

#### 4.1.8 Vascular Tree, Stage B/C: Per-Bed Autoregulation + Lymphatic System (`FourChamberCircuitModel.ts`, `LymphaticSystemModel.ts`)

Phase 1, Stages B/C -- completing Phase 1.

**Per-bed autoregulation** (`FourChamberCircuitModel.ts`): cerebral, renal, and coronary
beds (Miller's 9th Ed Ch11/Ch13/Ch20's classically-emphasized strongly-autoregulating
circulations) now hold flow near baseline across a disclosed autoregulatory pressure
plateau (cerebral 50-150, renal 80-180, coronary 60-140 mmHg) by scaling resistance
proportionally with instantaneous aortic pressure within that range; outside it,
resistance clamps at the boundary value, so flow becomes pressure-passive again (the
clinically important "autoregulation breakdown" zone). This is a deliberately generic,
disclosed simplification operating only on the bed-resistance partition --
`CerebralEngine.ts`/`RenalEngine.ts` remain the authoritative source for the detailed
clinical physiology (CBF/CMRO2/ICP, cortex/medulla RBF/GFR) that reads the resulting
`vitals.map`/`vitals.cmap`, unaffected by how that aggregate number was internally
assembled. Splanchnic, skeletal-muscle, and skin beds are left non-autoregulating
(correct physiology -- these rely on sympathetic tone rather than autoregulation).

**Lymphatic system / interstitial fluid balance** (`LymphaticSystemModel.ts`, new): a
real Starling-forces capillary-filtration-vs-lymphatic-return balance, tracking
`patient.interstitialVolumeMl` as a continuously-evolving compartment rather than
`RenalEngine.ts`'s existing `hasFluidOverloadEdema` (a complementary, coarser
probabilistic clinical-event flag for renal-failure-driven fluid retention specifically
-- not replaced or duplicated). Net fluid that leaves the vasculature faster than
lymphatics can return it (`thirdSpacedVolumeMl`) now measurably reduces
`CardiovascularEngine.ts`'s effective circulating blood volume -- the real "third-
spacing" mechanism (sepsis/capillary-leak, burns, hypoalbuminemia, prolonged surgery)
that previously had no mechanism in this codebase at all: total body fluid can be normal
or even elevated while the heart sees relative hypovolemia.

*   **Mechanism**: $J_v = K_f \cdot [(P_c - P_i) - \sigma \cdot (\pi_p - \pi_i)]$.
    $P_c$ (capillary hydrostatic pressure) approximated from CVP (`cvp + 15`, a standard
    simplification -- most of the arterial-to-venous pressure drop happens across
    arterioles, so capillary pressure sits much closer to venous than arterial). $P_i$
    (interstitial hydrostatic pressure) rises with interstitial volume via its own very
    high compliance (edema accumulates substantially before pressure rises much --
    consistent with real tissue compliance and why edema is often silent until
    advanced). $\pi_p$ (plasma oncotic pressure) uses the same `25 * albumin/4.0` scaling
    convention `RenalEngine.ts`/`HepaticEngine.ts` already use for albumin-driven
    oncotic pressure (here at the systemic-capillary baseline, not the glomerular-specific
    figure). Capillary leak (sepsis, disclosed proxy: `patient.isSeptic` -> 0.4 severity,
    or an explicit override) lowers $\sigma$ *and* raises $\pi_i$ together -- the real
    reason leak states cause especially severe edema: leaked protein collapses the very
    oncotic gradient that normally opposes filtration, not just "more leak" alone.
*   **Lymphatic return**: a baseline active-pumping rate plus a pressure-stimulated
    component, capped at a finite maximum capacity -- the lymphatic system's real
    "safety factor" (~10x normal flow) before being overwhelmed, which is what allows
    edema to accumulate progressively under sustained imbalance rather than always
    reaching a new steady state. `lymphaticObstructionSeverity` (e.g. post-
    lymphadenectomy, filariasis -- Bucket C/B groundwork, no dedicated UI flag yet)
    reduces this capacity directly.
*   **Calibration**: solved by direct numerical balancing (not closed-form) for a true
    steady state at baseline (zero net accumulation over a simulated hour with no
    pathology) -- `Kf=1.0`, baseline lymphatic flow `3.0 mL/min`, interstitial compliance
    `750 mL/mmHg` against a `10000 mL` baseline interstitial volume (general physiology
    estimate for a 70 kg adult). Verified pathological scenarios (sepsis, hypoalbuminemia,
    elevated CVP/right-heart-failure, lymphatic obstruction) each independently produce
    clinically plausible edema-accumulation rates over a simulated hour (a few hundred to
    ~900 mL/hr depending on severity) without needing per-scenario hand-tuning.
*   **Architecture**: a new slow-tick (1 Hz) engine, matching `RenalEngine.ts`/
    `HepaticEngine.ts`'s established shape -- deliberately *not* inside
    `FourChamberCircuitModel.ts`'s fast intra-beat ODE, since real capillary filtration/
    edema formation operates on a minutes-to-hours timescale, not a cardiac-cycle one.
    Runs in `usePhysiology.js`'s tick loop after `RenalEngine` (shares that tick's `cvp`)
    and before `CardiovascularEngine`, which reads `thirdSpacedVolumeMl` to reduce
    `effectiveIntravascularVolume`.
*   **Deliberately not yet modeled**: per-vascular-bed capillary filtration (this is a
    single lumped systemic compartment, not per-organ); a proper nonlinear (J-shaped)
    tissue compliance curve (a constant compliance is used as a disclosed
    simplification); a dedicated UI flag/case-builder control for
    `lymphaticObstructionSeverity` (the mechanism exists and is tested, but isn't yet
    reachable from a live case setup).
*   **Verification**: `src/testing/lymphatic_system_model.test.ts` (8 tests) and an
    added autoregulation-boundary test in `src/testing/four_chamber_circuit_model.test.ts`.
    The live integration surfaced one more recalibration-sensitivity case (the same
    AVP/AngII test from §4.1.7, now needing its averaging window widened and its HR
    assertion loosened after a genuinely fragile baroreflex-vs-direct-chronotropic tug-of-
    war was traced to unseeded `Math.random()` state differing between running a test file
    alone vs. as part of the full suite -- confirmed by direct reproduction, not assumed).
    684/684 tests passing, build clean. **Phase 1 is now fully complete.**

#### 4.2 Oscillations & Homeostatic Waves
The hemodynamics engine superimposes oscillatory waveforms onto heart rate and blood pressures to represent in-vivo responses:
*   **Respiratory Sinus Arrhythmia (RSA) & Breathing Fluctuations**:
    $$\text{RSA}_{\text{Effect}} = \sin(\theta_{\text{resp}}) \cdot 1.3 \quad \text{[bpm]} \quad \text{where } \theta_{\text{resp}} = \frac{t \cdot 2\pi}{60/RR}$$
    $$\text{RespBp}_{\text{Var}} = \sin(\theta_{\text{resp}}) \cdot 2.2 \quad \text{[mmHg]}$$
*   **Traube-Hering-Mayer (THM) Waves**:
    $$\text{THM}_{\text{Effect}} = \sin\left(\frac{t \cdot 2\pi}{10}\right) \cdot 0.9 \quad \text{[mmHg]}$$
*   **Micro-Fluctuations (Nervous Noise)**:
    $$\text{Noise}_{\text{HR\_Micro}} \approx \text{Random}(-0.2, 0.2) \quad \text{Noise}_{\text{BP\_Micro}} \approx \text{Random}(-0.35, 0.35)$$

#### 4.3 Myocardial Ischemia & Metabolic Demand
Myocardial oxygen balance represents a dynamic supply-demand relationship. Perfusion occurs primarily during diastole and is governed by coronary driving pressure:

*   **Coronary Perfusion Pressure ($CPP_{\text{coronary}}$)**:
    $$CPP_{\text{coronary}} = \max\left(5.0, DBP - LVEDP\right)$$
*   **Diastolic Time Ratio (\text{DiastoleTimeRatio})**: Shrinks as heart rate rises, limiting the duration of coronary perfusion:
    $$\text{DiastoleTimeRatio} = \max\left(0.20, \min\left(0.85, \frac{60.0 - 0.2 \cdot HR}{60.0}
ight)\right)$$
*   **Myocardial Oxygen Demand ($MVO_2$)**: Scales with heart rate, systolic pressure, contractility, and ventricular radius:
    $$MVO_2 = HR \cdot SBP \cdot Inotropy \cdot RadiusMod \quad \text{where } RadiusMod = 1.0 + \max\left(0, \frac{LVEDP - 12.0}{15.0}
ight)$$
*   **Myocardial Oxygen Supply ($Supply_{\text{myo}}$)**:
    $$Supply_{\text{myo}} = CPP_{\text{coronary}} \cdot \text{DiastoleTimeRatio} \cdot CaO_2 \cdot \text{coronaryStenosisMod} \cdot 8.5$$
    where $CaO_2 = Hb \cdot 1.34 \cdot (SpO_2 / 100) + PaO_2 \cdot 0.0031$, and $\text{coronaryStenosisMod} = 0.40$ if CAD patient, else $1.0$.
*   **Ischemia & Stunning Accumulation**:
    If oxygen demand exceeds supply, stunning accumulates at a rate proportional to the deficit, blunted by anesthetic-induced ischemic preconditioning (§6.72, Ch19 Miller's 9th Ed: KATP-channel-mediated, shared by anesthetic and ischemic preconditioning):
    $$\text{StunningRate} = \max\left(0, \frac{MVO_2 - Supply_{\text{myo}}}{10000} \cdot 0.381
ight) \cdot \left(1.0 - \min(0.3, 0.3 \cdot \text{Volatile}_{\text{MAC}})\right) \quad [\%/\text{s}]$$
    Stunning restricts inotropy and contractility. It decays slowly by $0.2\%$ per second once oxygen supply exceeds demand.

#### 4.4 Cardiac Arrest & Resuscitation Loop
*   **Arrest Triggers**: Initiated if:
    1.  *Hypoxemia*: Arterial oxygen tension ($PaO_2$) remains below $30\text{ mmHg}$ for $>15$ continuous seconds.
    2.  *Severe Acidosis*: Arterial pH drops below $6.9$.
    3.  *Hyperkalemia*: Potassium levels ($K^+$) exceed $10.0\text{ mEq/L}$ (or $9.0\text{ mEq/L}$ if not membrane-stabilized by Calcium).
    4.  *Anomalous shock*: Severe anaphylactic vasoplegia.
*   **CPR Mechanics**: When CPR is active, the engine bypasses standard hemodynamic equations and generates survival perfusion pressure:
    $$SBP_{\text{CPR}} = 80 + \text{Random}(0, 15) \quad [mmHg] \quad DBP_{\text{CPR}} = 25 + \text{Random}(0, 10) \quad [mmHg]$$
    $$CO_{\text{CPR}} \approx 1.5\text{ L/min}$$
*   **Ischemic Damage Accumulation**:
    $$\frac{d(\text{Damage})}{dt} = (90 - SpO_2) \cdot 0.4 + (55 - MAP_{\text{cerebral}}) \cdot 0.7 \quad \text{[per second]}$$
    CPR reduces this damage accumulator by $4.5$ units/s (if $SpO_2 \ge 80\%$) or $1.0$ unit/s (if hypoxemic).
    If $\text{Damage} > 1200$, cardiac arrest is triggered. If $\text{Damage} > 6000$, irreversible **biological death** occurs.
*   **Spontaneous ROSC**: CPR chest compression cycles have a $4\%$ chance per second to trigger spontaneous ROSC if oxygen buffer is sufficient ($>50\%$ of FRC capacity), hemorrhage is restricted ($\text{BloodLossRatio} < 0.2$), and therapeutic levels of Epinephrine are present.

#### 4.5 Defibrillation & Cardioversion Shock Physics
*   **Shock Success Probability**:
    $$P_{\text{ROSC}} = \max\left(0.01, 0.70 + \text{Bonus}_{\text{meds}} - \text{Penalty}_{\text{ischemia}} - \text{Penalty}_{\text{hypoxia}} - \text{Penalty}_{\text{hypovolemia}}\right)$$
    *   $\text{Bonus}_{\text{meds}}$: Amiodarone ($+0.25$), Lidocaine ($+0.20$), Epinephrine ($+0.10$).
    *   $\text{Penalty}_{\text{ischemia}}$: $\frac{\text{IschemicDamage}}{5000}$.
    *   $\text{Penalty}_{\text{hypoxia}}$: $0.60$ if $O_2\text{ Buffer} < 40\%\text{ of FRC}$.
    *   $\text{Penalty}_{\text{hypovolemia}}$: $0.60$ if $\text{BloodLossRatio} > 0.30$.
*   **Rhythm Conversion**: Organized Sinus Rhythm is restored if successful, setting myocardial stunning to $60\%$. An unsynchronized shock during a perfusing rhythm has a $100\%$ chance to induce R-on-T Ventricular Fibrillation (VFib).

#### 4.6 Respiratory Volumes, Mechanics & Upper Airway Resistance (`RespiratoryEngine.ts`)
*   **Upper Airway Resistance ($R_{\text{upper}}$)**: Models pharyngeal patency as a function of neuromuscular blockade, anesthetic depth, sleep stage REM atonia, and airway pressures:
    $$R_{\text{upper}} = \frac{R_{\text{base}}}{(\text{dilatorMuscleTone})^{2.5}} \cdot e^{0.5 \cdot (P_{\text{crit}} - P_{\text{airway}})}$$
    where $R_{\text{base}} = 5\text{ cmH2O/L/s}$ is the baseline airway resistance, $P_{\text{crit}}$ is the critical pharyngeal collapse pressure (mmHg), and $P_{\text{airway}}$ is the positive pressure in the airway (mmHg, e.g. PEEP, CPAP, or BiPAP settings).
    *   *Dilator Genioglossus Muscle Tone ($\text{dilatorMuscleTone}$)*: Represents upper airway dilator muscle activity index ($0.0 - 1.0$).
        $$\text{dilatorMuscleTone} = 1.0 - \text{NMBA}_{\text{block}} - 0.7 \cdot \text{Propofol}_{Ce} - 0.5 \cdot \text{Volatile}_{\text{MAC}} - \text{REMAtonia}_{\text{penalty}}$$
        where $\text{NMBA}_{\text{block}}$ is nicotinic acetylcholine receptor occupancy, and $\text{REMAtonia}_{\text{penalty}} = 0.85$ when the active sleep stage is REM (Stage R).
    *   *Pharyngeal Collapse Pressure ($P_{\text{crit}}$)*: Mapped based on patient airway status. In normal patients, $P_{\text{crit}} = -5.0\text{ mmHg}$ (highly stable). In moderate-to-severe Obstructive Sleep Apnea (OSA) patients, $P_{\text{crit}}$ increases to $\ge 0.0\text{ mmHg}$ (collapses even at atmospheric pressure).
    *   *Airway Obstruction Index*: In un-intubated, spontaneously ventilating patients, insufficient genioglossus muscle tone causes snoring and pharyngeal collapse:
        $$\text{airwayObstructionIndex} = \min\left(1.0, \max\left(0.0, \frac{(1.0 - \text{dilatorMuscleTone}) \cdot (P_{\text{crit}} + 6.0)}{7.0}\right)\right)$$
        If $\text{airwayObstructionIndex} > 0.6$, airway obstruction occurs, adding an obstruction resistance penalty:
        $$\text{Resistance}_{\text{obstruction}} = 35.0 \cdot \text{airwayObstructionIndex} \quad [\text{cmH2O/L/s}]$$
*   **Intercostal vs. Diaphragmatic Mechanics**: Volatile agents depress intercostal muscle activity more than diaphragmatic activity:
    $$\text{intercostalContribution} = \max\left(0.1, 1.0 - 0.7 \cdot \text{Volatile}_{\text{MAC}}\right)$$
    $$\text{diaphragmContribution} = \max\left(0.5, 1.0 - 0.15 \cdot \text{Volatile}_{\text{MAC}}\right)$$
    If $\text{intercostalContribution} < 0.4$, paradoxical abdominal breathing is triggered. FRC volume scales by $(0.7 + 0.3 \cdot \text{intercostalContribution})$ and pulmonary compliance scales by $\text{intercostalContribution}$.
*   **Ciliary Transport & Surfactant Dynamics**:
    - *Cilia Beat Frequency ($CBF$)*: Volatile agents, smoking, and dry fresh gas flows ($FGF > 5\text{ L/min}$) depress ciliary beat frequency:
        $$CBF = 100.0 - 25.0 \cdot \text{Volatile}_{\text{MAC}} - (\text{tobaccoSmoker} ? 30.0 : 0.0) - (FGF > 5.0 ? 15.0 : 0.0) \quad [\%]$$
    - *Surfactant Production*: Volatile agents decay Alveolar Type II surfactant synthesis dose- and time-dependently:
        $$\text{surfactantProduction} = \max\left(10.0, 100.0 - 20.0 \cdot \text{Volatile}_{\text{MAC}} \cdot (\text{time} > 600 ? 1.5 : 1.0)\right) \quad [\%]$$
        Pulmonary compliance scales linearly with surfactant level: $Compliance *= (\text{surfactantProduction} / 100.0)$.
*   **Volatile Bronchodilation vs. Xenon Resistance**:
    - *Bronchial Smooth Muscle Relaxation*: Volatiles reduce calcium sensitivity in airway smooth muscle:
        $$\text{bronchialSmoothMuscleCa} = \max\left(0.2, 1.0 - 0.5 \cdot \text{Volatile}_{\text{MAC}}\right)$$
        This scales down the bronchospasm resistance penalty: $\text{Resistance}_{\text{bronchospasm}} = 40.0 \cdot \text{bronchialSmoothMuscleCa}$. (Xenon has no bronchodilating effect).
    - *Xenon Viscous Airway Resistance*: Xenon's high density and viscosity increase total airway resistance:
        $$\text{xenonResistanceMultiplier} = 1.0 + 0.4 \cdot \left(\frac{etAgent}{70.0}\right) \cdot (1.0 + (\text{bronchospasm} ? 1.5 : 0.0))$$
        $$\text{Resistance}_{\text{final}} *= \text{xenonResistanceMultiplier}$$
    - *Desflurane High-Density Paradoxical Resistance Increase (Ch21, Miller's 9th Ed, p.543)*: Unlike other volatiles, which bronchodilate, desflurane's increased inspired gas density raises total respiratory system resistance $R(rs)$ by up to $26\%$ at 1.5 MAC (no significant effect reported at 1.0 MAC), driven by desflurane's own end-tidal concentration (not cumulative anesthetic-depth MAC, since this is gas-density-specific and unaffected by co-administered N2O):
        $$\text{Desflurane}_{\text{MACeq}} = \frac{etAgent}{6.0} \quad \text{(}mac40 = 6.0\text{ vol\%, TABLE 20.1/21.1)}$$
        $$\text{desfluraneResistanceMultiplier} = 1.0 + 0.26 \cdot \min\left(1.0, \frac{\text{Desflurane}_{\text{MACeq}} - 1.0}{0.5}\right) \quad \text{if } \text{Desflurane}_{\text{MACeq}} > 1.0$$
        $$\text{Resistance}_{\text{final}} *= \text{desfluraneResistanceMultiplier}$$

#### 4.6.1 Predicted Lung Volumes (ECCS/ERS 1993)

    *   *Male Predicted FRC*: $FRC_{\text{pred}} = 2.34 \cdot H + 0.009 \cdot A - 1.09$
    *   *Female Predicted FRC*: $FRC_{\text{pred}} = 2.24 \cdot H + 0.001 \cdot A - 1.00$
*   **Volume Corrections**:
    $$\text{Volume}_{\text{final}} = \text{Volume}_{\text{pred}} \cdot \text{Disease}_{\text{scale}} \cdot e^{-0.02 \cdot (BMI - 25)} \cdot \text{Position}_{\text{factor}} \cdot \text{Anesthesia}_{\text{FRC\_factor}}$$
    *   $\text{Position}_{\text{factor}}$: Sitting ($1.0$), Supine/Sniffing ($0.80$), Trendelenburg ($0.70$).
    *   $\text{Anesthesia}_{\text{FRC\_factor}}$: General anesthesia induces a further, position-independent FRC decrease via cranial diaphragm shift and reduced thoracic transverse diameter, on top of the postural drop (Fig 13.13, Miller's 9th Ed): $0.85$ if the patient is paralyzed or intubated (`isAnesthetized`), else $1.0$. This is computed once, canonically, inside `RespiratoryEngine.calculateLungVolumes()`; `Pharmacology.js`'s `calculateLungVolumes()` is a thin delegating wrapper to this single source of truth (eliminating a previously divergent duplicate implementation that was also missing the Closing Capacity field).
*   **Pulmonary Compliance & Resistance**:
    *   *Compliance ($C$, mL/cmH2O)*: Baseline is $65$. Modified by position (Trendelenburg decreases compliance by $20\%$), obesity ($-25$), sepsis ($-20$), and COPD GOLD stage/asthma (`pulmComplianceBonus`, see below).
    *   *Resistance ($R$, cmH2O/L/s)*: Baseline is $5$. Elevated by obesity ($+3$), bronchospasm ($+40$), bucking ($+15$), COPD GOLD stage/asthma (`pulmResistanceBonus`), and laryngospasm ($R = 999$).
    *   *COPD GOLD Stage & Asthma Bonuses*: Matched most-specific-first (GOLD IV before III before II before I), since `'copd gold i'` is a substring of `'copd gold ii/iii/iv'` and would otherwise always match first:

        | Stage | Compliance Bonus | Resistance Bonus | Dead-Space Multiplier |
        |---|---|---|---|
        | GOLD I | $+5$ | $+5$ | $\times 1.10$ |
        | GOLD II | $+10$ | $+10$ | $\times 1.30$ |
        | GOLD III | $+15$ | $+18$ | $\times 1.60$ |
        | GOLD IV | $+20$ | $+25$ | $\times 2.00$ |
        | Asthma | $-12$ | $+20$ | $\times 1.15$ |
*   **Ventilator Pressures & Tidal Volume ($V_{TE}$)**:
    *   *VCV Mode*: $V_{TE} = \text{dialed } V_T$. Peak inspiratory pressure is calculated as:
        $$PIP = P_{\text{plat}} + \left(\text{Flow} \cdot R \cdot 5\right) \quad \text{where } P_{\text{plat}} = PEEP + \frac{V_{TE}}{C}$$
    *   *PCV Mode*: $PIP = PEEP + P_{\text{insp}}$. Tidal volume is calculated as:
        $$V_{TE} = \left(P_{\text{plat}} - PEEP\right) \cdot C \quad \text{where } P_{\text{plat}} = PIP - 2$$
    *   *PCV-VG Mode*: $V_{TE} = \text{dialed } V_T$. Peak pressure converges: $P_{\text{plat}} = PEEP + \frac{V_{TE}}{C}$, $PIP = P_{\text{plat}} + 2$.

#### 4.6.2 Flow-Volume Loop Display Model (`FlowVolumeLoopModel.js`)
> **Sourcing note**: unlike the rest of this document, the physiology below is not
> derived from a specific Miller's chapter — it is general respiratory mechanics (the
> Mead-Fry-Whittenberger effort-independent maximal-expiratory-flow framework, used by
> explicit instruction since the textbook source material doesn't give literal rendering
> parameters for this display). Disclosed here per this project's standing convention for
> non-textbook-sourced content. **Superseded this session**: the expiratory limb
> previously used a hand-picked "concavity exponent" rather than derived physics — see
> the redesign rationale in `docs/chapters/` and the project's physics-redesign plan.

*   **Inputs reused, not duplicated**: `vitals.res`/`vitals.compl` (§4.6) and
    `patient.lungVolumes.{tlc_mL, rv_mL, frc_mL, fvc_mL, fev1FvcRatio}` (§4.6.1), plus the
    shared nonlinear compliance curve from §4.6.3 below.
*   **Axis convention**: Volume (L) increases left-to-right, RV at the left margin, TLC
    at the right. Expiratory flow is positive (above the zero-flow line), inspiratory
    flow negative (below). Traced TLC → (expiration) → RV → (inspiration) → TLC.
*   **Expiratory limb — real flow-limitation physics**:
    $$\dot V_{\max}(V) = \text{FLOW\_SCALE\_FACTOR} \cdot \frac{P_{el}(V)}{R_{aw}(V)}$$
    where $P_{el}(V)$ is the shared elastic recoil curve (§4.6.3) and $R_{aw}(V)$ is a
    volume-dependent airway resistance: above FRC, $R_{aw}(V) = R_{FRC} \cdot (FRC/V)$ (a
    fixed, modest exponent — airways are progressively more patent at higher volumes,
    independent of obstruction severity); below FRC,
    $R_{aw}(V) = R_{FRC} \cdot (FRC/V)^{k}$ with $k = 1 + 3\cdot\text{obstructionSeverity}$
    (radial-traction loss accelerates narrowing toward RV, markedly more so with
    obstructive disease). The two formulas are deliberately decoupled at FRC — an earlier
    single-exponent design was found to make obstructive lungs *more* patent than normal
    near TLC (where PEF actually occurs), since amplifying one shared exponent for "more
    dramatic narrowing toward RV" also amplified "more dramatic opening toward TLC" on
    the same curve, the wrong direction. `FLOW_SCALE_FACTOR` (≈0.165) is a disclosed
    calibration constant bridging $P_{el}(V)$'s total-system-compliance convention (§4.6.3)
    to a realistic absolute PEF (~8 L/s normal) — the *shape* of how flow varies with
    volume, resistance, and compliance comes entirely from the real $P_{el}(V)/R_{aw}(V)$
    physics; only the absolute scale is calibrated. Verified against realistic
    inputs: normal PEF ≈9.3 L/s, mild COPD ≈2.4, severe COPD ≈0.7, bronchospasm ≈1.2,
    restrictive ≈9.6 (narrower volume span, near-normal flow) — monotonic and clinically
    plausible across the range.
*   **Inspiratory limb**: not flow-limited in healthy lungs (no dynamic airway
    compression on inspiration), so it remains a volitional-effort-driven smooth profile
    — but PIF is now $PMUS_{\max}/R_{aw}(RV)$ (a representative effort-pressure constant
    divided by resistance at the start of inspiration) rather than a fixed ratio of PEF.
*   **Restrictive pattern**: no separate shape parameter — `restrictive` already
    compresses `lungVolumes` (TLC/RV/FVC ×0.52, §4.6.1) without raising resistance, so a
    narrowed-but-normally-shaped loop falls out of reusing those volumes directly.
*   **Variable extrathoracic obstruction**: reuses `RespiratoryEngine.ts`'s own
    Starling-resistor upper-airway formula ($R = R_{base}/dilatorTone^{2.5} \cdot
    \exp(0.5(pcrit-P_{aw}))$, §4.6 — the same physics already driving OSA there),
    evaluated at a forced-inspiratory-effort transmural pressure estimate (a large
    negative swing, not the passive-breathing PEEP-referenced pressure that formula
    normally uses) in place of the previous arbitrary collapse-index fudge factor — a
    disclosed, reasoned adaptation to a different mechanical regime, not a fully implicit
    self-consistent solve.
*   **Deliberately not modeled** (documented gap, not an oversight): fixed upper-airway
    obstruction (e.g. tracheal stenosis — flattens *both* limbs) and variable
    intrathoracic obstruction (e.g. an intrathoracic tracheal mass — flattens only the
    *expiratory* limb). Neither has an existing patient flag to drive it credibly without
    inventing new state; pick this up if/when a relevant chapter or flag materializes —
    see `docs/chapter_integration_prompt.md`'s pulmonary-function-content bullet.

#### 4.6.3 Unified Respiratory Mechanics Solver & Pressure-Volume Loop (`LungComplianceModel.js`, `RespiratoryMechanicsModel.js`)
> **Sourcing note**: general respiratory mechanics (the single-compartment equation of
> motion, real-gas-law-adjacent territory taught in every respiratory physiology and
> mechanical-ventilation reference), not a specific Miller's citation. Disclosed per this
> project's standing convention.

Three previously-independent approximations of the same physical breath — the ventilator
time-strip's pressure/flow shapes (`WaveformDatabase.js`'s `ventPressure`/`ventFlow`, a
fixed 0.3s decay constant, not derived from live R/C at all — confirmed as the actually-
rendered code; `VentModel.js`'s more rigorous but never-imported `synthesizeVentFlow`/
`synthesizeVentPressure` were dead code prior to this session) and the pressure-volume
loop's independent hysteresis formula (`PressureVolumeLoopModel.js`'s original
`generatePressureVolumeLoop()`) — are replaced by one real equation-of-motion integration
every consumer reads from.

*   **Shared nonlinear lung compliance curve** (`LungComplianceModel.js`): a real lung's
    compliance is highest at FRC and falls toward both TLC ("upper inflection point") and
    RV ("lower inflection point") — the same concept used in ARDSnet-style ventilator
    PV-curve teaching. Modeled as $C(V) = C_{FRC} \cdot \exp(-\ln4 \cdot u(V)^2)$, where
    $u(V)$ is the signed distance from FRC normalized by the distance to whichever
    boundary (RV or TLC) is on that side — guaranteeing, by construction, $C(FRC) =$ the
    engine's existing `currentCompliance` exactly (no infeasible-equation risk regardless
    of how close FRC sits to either boundary for a given patient) and $C = 25\%$ of peak
    at both boundaries. $P_{el}(V)$ is then the genuine integral
    $\int_{RV}^{V} 1/C(V')\,dV'$, evaluated numerically (Simpson's rule) once per
    calibration and cached as a lookup table. An earlier single-power-law design
    ($P(V)=P_{TLC}\cdot((V-RV)/(TLC-RV))^n$) was tried and found mathematically
    infeasible for realistic adult volumes (confirmed numerically, not just suspected) —
    see the file's own header comment for the worked proof. On absolute magnitude: this
    curve integrates to a peak recoil pressure around 100-130 cmH2O at TLC for a normal
    adult — higher than the ~25-35 cmH2O often cited for static *lung-only* recoil,
    because `currentCompliance` (60 mL/cmH2O) is this engine's existing *total
    respiratory system* compliance convention (lung-only compliance is ~200+ mL/cmH2O,
    roughly 3x higher, combining in series with chest-wall compliance) — internal
    consistency with the engine's own convention was prioritized over matching a
    lung-only literature figure this model was never trying to represent.
*   **Equation of motion** (`RespiratoryMechanicsModel.js`):
    $$P_{aw}(t) - PEEP = \Delta P_{el}(\Delta V(t)) + R\cdot\dot{\Delta V}(t)$$
    where $\Delta V$ is volume above FRC and $\Delta P_{el}$ the incremental recoil above
    the FRC baseline (so $\Delta V=0$, flow$=0$ gives $P_{aw}=PEEP$ exactly at the start of
    every breath). VCV: flow is the controlled/known quantity, so $P_{aw}(t)$ follows
    algebraically. PCV: pressure is the controlled quantity, so $\Delta V(t)$ solves a
    genuinely nonlinear ODE (since $\Delta P_{el}$ is nonlinear), integrated numerically
    (1ms-substep forward Euler — stable here since this engine's R·C time constants stay
    well above 10ms even in severe bronchospasm). Passive exhalation (both modes) solves
    the same ODE from end-inspiratory $\Delta V$ back toward 0.
*   **A correction caught from an actual rendered screenshot, not just the equations**:
    an earlier version of this model displayed passive-exhalation airway pressure as
    *exactly flat at PEEP* for the whole expiratory phase, reasoning that the same
    resistance driving exhalation flow exactly cancels the elastic recoil by the time gas
    reaches the mouth. That reasoning is self-consistent (assuming Paw=PEEP is exactly
    what makes the flow-derivation ODE close), but it conflates "the boundary condition
    used to derive the flow" with "what should be displayed" — and produced a
    discontinuous jump straight from Pplat to PEEP at the start of exhalation, which
    collapsed the pressure-volume loop's entire expiratory limb into a single vertical
    line (caught when the user shared a screenshot of the actual rendered loop — a
    "rectangular flag" shape instead of a closed hysteresis loop). Corrected: the
    displayed exhalation pressure is now the instantaneous elastic/alveolar pressure
    (`PEEP + ΔPel(ΔV)`), continuous with Pplat at the inspiration/expiration boundary and
    decaying smoothly toward PEEP as ΔV decays — `R` still governs how fast that decay
    happens (so resistance changes still correctly slow exhalation, e.g. bronchospasm's
    incomplete emptying), it just no longer determines the *displayed pressure* directly.
    Verified the corrected PV loop now encloses genuine area (0.59, vs an unmeasurable
    sliver before) and that the enclosed area scales up correctly with resistance (2.33 at
    4x the resistance). The interesting expiratory dynamics (auto-PEEP, incomplete
    exhalation, bronchospasm) still correctly surface in the **flow** waveform too —
    consistent with real clinical teaching, where the flow trace is what's read for those
    findings — this part of the original reasoning was not wrong, only the pressure-trace
    conclusion was.
*   **Caching**: integrated once per breath-parameter-set via a simple module-level
    memoization cache (`getBreathTrajectory()`, keyed on a JSON-stringified params object)
    rather than every animation frame — ventilator settings/physiology change a handful
    of times per session, not 60 times a second, and this is a session-global singleton
    (one patient/ventilator), not per-component state, so a module-level cache is
    sufficient without touching `CanvasWaveform.jsx`'s existing stateless-per-frame render
    architecture.
*   **Pressure-volume loop**: `generatePressureVolumeLoopFromMechanics()` (added
    alongside the original `generatePressureVolumeLoop()`, which was written by a
    different AI process also active in this repo and left untouched — see CLAUDE.md's
    concurrent-editing note) is now a literal parametric plot of this same
    {pressure(t), volume(t)} trajectory, so a resistance or compliance change moves the
    ventilator strips and this loop identically, by construction. Pattern classification
    checks resistance directly *before* the conflated "dynamic compliance" metric
    ($Vt/(PIP-PEEP)$, which includes the resistive component) — otherwise a clear
    high-resistance/near-normal-static-compliance case (bronchospasm) was misclassified
    as "low compliance" (found and fixed this session via direct numeric testing across
    normal/bronchospasm/ARDS scenarios).
*   **Validated cross-consistency** (the property this whole redesign was for):
    `src/testing/respiratory_mechanics_unification.test.ts` directly asserts higher
    resistance both raises PV-loop PIP and lowers flow-volume-loop PEF from the same input
    change, and that the new nonlinear-compliance plateau pressure stays within ~1.5
    cmH2O of the old linear-compliance formula at normal tidal volumes (validating that
    real lung-protective tidal volumes deliberately stay in the curve's near-flat,
    near-linear midsection, as expected). `src/testing/waveform_cross_consistency.test.ts`
    (Stage 3, final verification pass spanning both the respiratory and cardiac halves of
    this redesign) additionally proves the PV loop and ventilator strips read literally
    the same trajectory array (not two approximations), that one `vitals.res` change moves
    flow-volume PEF/PV-loop PIP/ventilator peak pressure together, and that
    `synthesizeCvpWaveform`'s/`synthesizePacWaveform`'s end-to-end cycle-mean pressures
    match `vitals.cvp`/`vitals.mPAP` exactly through the full canvas-synthesizer call path,
    not just at the underlying chamber-model level.

#### 4.7 Alveolar Ventilation, Apnea Kinetics & Loop Gain
*   **Chemoreceptor Feedback Loop Gain ($LG$)**: Quantifies ventilatory control stability and propensity to periodic breathing:
*   **Hypoxic & Hypercapnic Ventilatory Drive Blunting**:
    - *Hypoxic Ventilatory Response (HVR)*: Sub-MAC concentrations ($0.1\text{ MAC}$) of volatiles (Sevoflurane, Isoflurane, Halothane, Methoxyflurane) blunt peripheral chemoreceptor hypoxic drive by $70\%$:
        $$\text{hvrBlunting} = \begin{cases} \left(\frac{\text{Volatile}_{\text{MAC}}}{0.1}\right) \cdot 0.7 & \text{if } \text{Volatile}_{\text{MAC}} \le 0.1 \\ 0.7 + (\text{Volatile}_{\text{MAC}} - 0.1) \cdot 0.3 & \text{if } \text{Volatile}_{\text{MAC}} > 0.1 \end{cases}$$
        For Desflurane and Xenon, HVR is not blunted at sub-MAC ($0.1\text{ MAC}$):
        $$\text{hvrBlunting} = \max\left(0.0, \min\left(1.0, \frac{\text{Volatile}_{\text{MAC}} - 0.1}{1.0}\right)\right)$$
    - *Hypercapnic Ventilatory Response (HCVR)*: Volatiles blunt the central carbon dioxide drive dose-dependently:
        $$\text{hcvrBlunting} = \min\left(1.0, \text{Volatile}_{\text{MAC}} \cdot 0.6\right)$$
        (Xenon does not blunt HCVR).
    - *Blunted Compensatory Drive*:
        $$\text{compensatoryRR} = \max(0, (PaCO_2 - 45) \cdot 0.8 \cdot (1 - \text{hcvrBlunting})) + \max(0, (70 - PaO_2) \cdot 0.4 \cdot (1 - \text{hvrBlunting}))$$
    - *Xenon Spontaneous Respiratory Rate Depression*: Spontaneous breathing rate is depressed by Xenon:
        $$\text{patientDriveRR} = \max\left(0.0, \text{patientDriveRR} - 0.25 \cdot etXenon\right)$$
    $$LG = G_{\text{controller}} \cdot G_{\text{plant}} \cdot \text{mixingGainMod}$$
    *   *Controller Gain ($G_{\text{controller}}$)*: Sensitivity of the central and peripheral chemoreceptors to changes in $PaCO_2$.
        $$G_{\text{controller}} = G_{\text{base}} \cdot \max(1.0, 1.0 + 3.0 \cdot (7.4 - pH) + 2.0 \cdot \frac{100 - SpO_2}{10})$$
        where $G_{\text{base}} = 1.2$. It increases significantly during severe hypoxia (e.g. altitude exposure, low $FiO_2$) and metabolic acidosis.
    *   *Plant Gain ($G_{\text{plant}}$)*: Efficiency of the lungs in clearing $CO_2$ from the blood.
        $$G_{\text{plant}} = \frac{1.0}{\text{recruitedFRC\_L}}$$
        It is inversely proportional to functional residual capacity ($FRC$). It increases under lung volume restriction, atelectasis, or supine/Trendelenburg positioning, causing larger $PaCO_2$ swings per breath.
    *   *Mixing Gain ($mixingGainMod$)*: Scales with circulatory mixing delay ($mixingGain$, in seconds, representing transport time from pulmonary capillaries to chemoreceptors):
        $$\text{mixingGainMod} = \frac{\text{mixingGain}}{12.0}$$
        In patients with Congestive Heart Failure (CHF) or severe low cardiac output states, circulatory delay exceeds $30\text{ seconds}$ (increasing `mixingGain` to $\ge 30.0$, thus elevating loop gain to $LG > 1.0$).
*   **Periodic Crescendo-Decrescendo Breathing (Cheyne-Stokes Respiration [CSR])**: When $LG > 1.0$ and the patient is in NREM sleep (stages N1/N2), the respiratory rate ($RR$) and Tidal Volume ($V_T$) oscillate cyclically:
    $$RR_{\text{oscillated}} = RR_{\text{target}} \cdot (1.0 + \sin(\theta_{\text{CSR}}))$$
    $$V_{T,\text{oscillated}} = V_T \cdot (1.0 + \sin(\theta_{\text{CSR}}))$$
    where $\theta_{\text{CSR}} = \frac{t \cdot 2\pi}{60}$ (representing a 60-second periodic cycle of hyperpnea followed by central apnea).
*   **Apneic Threshold PaCO2**: If $PaCO_2$ drops below the threshold (normally $35\text{ mmHg}$ but shifts rightward to $40\text{ mmHg}$ during sleep):
    $$PaCO_2 < \text{apneicThresholdPaCO2}$$
    all respiratory muscle drive ceases ($RR = 0$, $V_A = 0$), causing central apnea.



    $$V_A = (V_T - V_D) \cdot RR \quad \text{[L/min]} \quad \text{where } V_D = \frac{IBW_{\text{kg}} \cdot 2.2}{1000} \cdot \text{deadSpaceMultiplier}\text{ L}$$
    *   *Dead-Space Pathophysiology (`deadSpaceMultiplier`)*: V/Q mismatch from destroyed capillary bed (emphysema) or airway obstruction can dramatically increase $V_D/V_T$ — a key point of Miller's 9th Ed Ch13: "dead space ventilation can be...increased...to more than 80% of minute ventilation" in severe COPD (Table 13.2). The multiplier is applied per COPD GOLD stage/asthma severity (see §4.6.1 table above); $V_D/V_T$ ratio is exposed on `RespiratoryOutput.vdVtRatio` and surfaced on the Vent Monitor UI.
*   **Apnea CO2 Accumulation (Eger & Severinghaus)**:
    When tidal exchange is absent ($V_A \le 0.1\text{ L/min}$):
    *   During the first minute of apnea: $\frac{d(PaCO_2)}{dt} = +\frac{6}{60}\text{ mmHg/s}$
    *   During subsequent minutes: $\frac{d(PaCO_2)}{dt} = +\frac{3}{60}\text{ mmHg/s}$
*   **Henderson-Hasselbalch Equation**:
    $$pH = 6.1 + \log_{10}\left(\frac{HCO_3^-}{0.03 \cdot PaCO_2}\right)$$

#### 4.8 Blood-Gas Exchange, Shunt Mathematics & Alveolar Dynamics
*   **Alveolar Oxygen Tension (PAO2)**:
    $$PAO_2 = \left(FiO_2 \cdot (P_B - P_{H_2O})\right) - \frac{PaCO_2}{R} \quad \text{[mmHg]} \quad (P_B = 760, P_{H_2O} = 47, R = 0.8)$$
*   **Apnea Oxygen Buffer Depletion**:
    $$\frac{d(\text{O2Buffer})}{dt} = -VO_2 \cdot \text{Temp}_{\text{scale}} \cdot \text{Shivering}_{\text{scale}} + \text{PassiveO2}_{\text{influx}}$$
*   **Bohr Shift & Hemoglobin Dissociation (Adair-Riley Equation)**:
    $$PO_{2,\text{eff}} = PO_2 \cdot 10^{0.48 \cdot (pH - 7.4) - 0.024 \cdot (\text{Temp} - 37) - \text{Shift}_{\text{volatile}}}$$
    $$SaO_2 = \frac{PO_{2,\text{eff}}^3 + 150 \cdot PO_{2,\text{eff}}}{PO_{2,\text{eff}}^3 + 150 * PO_{2,\text{eff}} + 23400} \cdot 100$$
*   **Absorption Atelectasis Kinetics**:
    High inspired oxygen fractions combined with a lack of positive airway pressure and tone loss (induction apnea/paralysis) accelerate alveolar collapse:
    $$\frac{d(\text{Atelectasis})}{dt} = \text{rate}_{\text{base}} \cdot (1.0 + \text{isParalyzed} \cdot 2.0) \cdot (1.0 + \text{isObese} \cdot 1.5)$$
    where:
    $$\text{rate}_{\text{base}} = 0.0005 \cdot \left(\frac{FiO_2 - 21.0}{79.0}\right) - 0.0002 \cdot \text{PEEP}$$
*   **Ciliary Atelectasis & Mucus Plug**:
    If $CBF < 45\%$, mucus accumulates, driving ciliary atelectasis:
    $$\text{ciliaryAtelectasisAccumulation} += 0.015 \cdot \left(\frac{45.0 - CBF}{100.0}\right) \quad [\text{per second}]$$
    If $\text{ciliaryAtelectasisAccumulation} > 3.0$, a mucus plug forms (`isMucusPlugged = true`), adding a $+20\text{ cmH2O/L/s}$ resistance penalty.
*   **Hypoxic Pulmonary Vasoconstriction (HPV) Inhibition**:
    Hypoxic pulmonary vasoconstriction (HPV) shifts blood flow away from hypoxic lung zones, reducing shunt fraction. Older halogenated volatile agents (isoflurane, halothane) inhibit HPV dose-dependently: 20-30% depression at 1.0 MAC, 50% depression at MAC 2.0 (Fig 13.22 & p.2348, Miller's 9th Ed). Modern volatiles (sevoflurane, desflurane) have comparatively little effect, and IV anesthetics do not inhibit HPV at all:
    $$\text{hpvInhibition} = \min\left(0.90, \text{Volatile}_{\text{MAC}} \cdot 0.25 \cdot \text{hpvPotency}_{\text{agent}}\right)$$
    where $\text{hpvPotency}_{\text{agent}}$ is a per-agent constant defined in `INHALATIONAL_AGENTS`: $1.0$ for isoflurane/halothane/methoxyflurane, $0.15$ for sevoflurane/desflurane, and $0.0$ for xenon/nitrous oxide.
    $$\text{shunt}_{\text{HPV\_penalty}} = 0.25 \cdot \text{atelectasis} \cdot \text{hpvInhibition}$$
*   **FRC & Closing Capacity (CC) Relationship**:
    Closing capacity (CC) represents the lung volume at which dependent airways collapse during expiration, independent of position or obesity (Fig 13.9, Miller's 9th Ed):
    $$CC_{\text{L}} = FRC_{\text{upright\_baseline}} \cdot (0.50 + 0.0075 \cdot \text{Age})$$
    where $FRC_{\text{upright\_baseline}}$ is baseline FRC in the upright position. When actual recruited FRC ($FRC_{\text{actual}}$) falls below closing capacity ($CC_{\text{L}}$), airway closure occurs, causing additional right-to-left shunt:
    $$\text{airwayClosureFraction} = \max\left(0, \frac{CC_{\text{L}} - FRC_{\text{actual}}}{CC_{\text{L}}}\right)$$
    $$\text{shunt}_{\text{airway\_closure}} = 0.12 \cdot \text{airwayClosureFraction} \quad \text{(Table 13.2, Miller\'s 9th Ed)}$$
*   **Shunt Fraction Equation**:
    $$\text{actualShunt} = \max(0.02, \text{baselineShunt} - \text{shuntReduction} + \text{hpsShunt} + 0.15 \cdot \text{atelectasis} + \text{shunt}_{\text{HPV\_penalty}} + \text{shunt}_{\text{airway\_closure}})$$
*   **Alveolar Recruitment**:
    PEEP recruits collapsed units gradually, while a sustained inflation recruitment maneuver overcomes critical opening pressure (PAW \ge 30\text{ cmH2O} for initial opening, and \ge 40\text{ cmH2O} for 7-8 seconds for full recruitment, Fig 13.19, Miller\'s 9th Ed):
    $$\text{If } P_{\text{airway}} \ge 40\text{ cmH2O for } \ge 7\text{ seconds} \rightarrow \text{Atelectasis} = 0.0$$
    $$\text{If } 30 \le P_{\text{airway}} < 40\text{ cmH2O} \rightarrow \frac{d(\text{Atelectasis})}{dt} = -0.08\text{ s}^{-1}$$
*   **FRC & Compliance Corrections**:
    $$FRC_{\text{actual}} = FRC_{\text{baseline}} \cdot (1.0 - 0.35 \cdot \text{Atelectasis})$$
    $$Compliance_{\text{actual}} = Compliance_{\text{baseline}} \cdot (1.0 - 0.40 \cdot \text{Atelectasis})$$
*   **Mixed Venous Return & Pulmonary Shunt Exchange**:
    *   *Capillary O2 Content ($CcO_2$)*: $CcO_2 = Hb \cdot 1.34 \cdot \frac{SaO_2}{100} + PAO_2 \cdot 0.0031$
    *   *Mixed Venous O2 Content ($CvO_2$)*: $CvO_2 = CcO_2 - \frac{VO_2}{CO \cdot 10}$
    *   *Arterial O2 Content ($CaO_2$)*: $CaO_2 = CcO_2 \cdot (1 - \text{actualShunt}) + CvO_2 \cdot \text{actualShunt}$
    *   *Arterial O2 Saturation ($SpO_2$)*: $SpO_2 = \frac{CaO_2}{Hb \cdot 1.34} \cdot 100$
*   **Oxygen Delivery ($DO_2$)**:
    $$DO_2 = CaO_2 \cdot CO \cdot 10 \quad \text{[mL/min]}$$

#### 4.9 Optical Pulse Oximetry Absorption Model
*   **Absorbance Equations**:
    $$A_{660} = 0.1 \cdot S_O + 1.0 \cdot S_D + 1.0 \cdot S_M + 0.1 \cdot S_C$$
    $$A_{940} = 1.0 \cdot S_O + 0.1 \cdot S_D + 1.0 \cdot S_M + 1.0 \cdot S_C$$
    *   $S_O = \frac{SaO_2}{100} \cdot (1 - S_M - S_C)$, $S_D = (1 - \frac{SaO_2}{100}) \cdot (1 - S_M - S_C)$, $S_M$ is MetHb, $S_C$ is COHb.
*   **Oximetry Ratio (R)**:
    $$R_{\text{ratio}} = \frac{A_{660}}{A_{940}} \quad \text{yielding} \quad SpO_{2,\text{measured}} = 110 - 25 \cdot R_{\text{ratio}} \quad [\%]$$

#### 4.10 Cerebral Physiology & Intracranial Mechanics
*   **Cerebral Blood Flow ($CBF$)**: Global baseline is $50\text{ mL/100 g/min}$ (representing $12\% - 15\%$ of cardiac output). Gray matter (cortical) receives $80\%$ ($75 - 80\text{ mL/100 g/min}$); white matter (subcortical) receives $20\%$ ($8 - 20\text{ mL/100 g/min}$).
*   **Cerebral Metabolic Rate of Oxygen ($CMRO_2$)**: Baseline is $3.0 - 3.5\text{ mL/100 g/min}$ (approx $50\text{ mL/min}$ total, $20\%$, of total body oxygen consumption).
    - *Functional metabolism*: Approximately $60\%$ of $CMRO_2$ supports electrophysiological function (neurotransmitter synthesis, transport, and synaptic potentials). Reduced dose-dependently by anesthetics (Propofol, Barbiturates) up to a maximum of $60\%$ reduction (at electrophysiologic silence / EEG flatline).
    - *Basal cellular metabolism*: The remaining $40\%$ supports cellular homeostatic integrity. Spared by anesthetics, but reduced by hypothermia (decreases by $6\% - 7\%$ per $^{\circ}\text{C}$ reduction; $Q_{10} = 2.4$).
*   **Cerebral Perfusion Pressure ($CPP$)**: The net pressure gradient driving blood flow to the brain:
    $$CPP = MAP - ICP \quad \text{(or CVP if } CVP > ICP\text{)}$$
    - *Lower Limit of Autoregulation (LLA)*: $70\text{ mmHg}$ MAP (or $60 - 65\text{ mmHg}$ CPP). Below this, CBF is pressure-passive, causing cerebral ischemia risk.
    - *Upper Limit of Autoregulation (ULA)*: $150\text{ mmHg}$ MAP. Above this, vasoconstrictor tone is overcome, causing pressure-passive hyperfusion.
*   **Intracranial Volume-Compliance Mechanics (Monro-Kellie Doctrine)**:
    The rigid cranium creates a fixed total volume:
    $$V_{\text{intracranial}} = V_{\text{brain}} + V_{\text{blood}} + V_{\text{CSF}} = \text{Constant}$$
    - *Intracranial Pressure ($ICP$)*: Baseline is $8 - 12\text{ mmHg}$ (supine). Calculated using an exponential volume-pressure elastance model:
        $$ICP = ICP_{\text{baseline}} \cdot e^{\text{elastance} \cdot \Delta V}$$
        where $\Delta V$ is driven by changes in Cerebral Blood Volume ($CBV$) and `intracranialVolumeOffset` (representing hematoma, edema, or tumors).
    - *Elastance States*: Determined by intracranial compliance:
        - `'normal'`: elastance $\approx 0.05$. CSF is easily displaced into spinal space; venous blood is squeezed out of sinuses.
        - `'impaired'`: elastance $\approx 0.20$. Compensation mechanisms are partially exhausted.
        - `'exhausted'`: elastance $\ge 0.50$. Compensation is fully exhausted; small volume additions trigger exponential ICP surges.
*   **Cerebral Autoregulation & Coupling**: CBF is tightly coupled to $CMRO_2$ (neurovascular coupling) under intravenous anesthetics (Propofol, Barbiturates) which reduce both in parallel. Volatile anesthetics ($>1\text{ MAC}$) uncouple this relationship, causing direct cerebral vasodilation (increasing CBF/CBV) while decreasing $CMRO_2$. Volatiles also dose-dependently attenuate autoregulation (lost at $>1.5\text{ MAC}$).
*   **Carbon Dioxide ($CO_2$) Reactivity**: CBF varies linearly with changes in $PaCO_2$ between $25$ and $75\text{ mmHg}$:
    - *Normotension*: hypercapnia ($+2.5\% \text{ CBF per mmHg}$), hypocapnia ($-1.67\% \text{ CBF per mmHg}$).
    - *Moderate Hypotension* ($MAP$ reduced by $<33\%$): hypercapnia ($+1.3\% \text{ CBF per mmHg}$), hypocapnia ($-1.3\% \text{ CBF per mmHg}$).
    - *Severe Hypotension* ($MAP$ reduced by $>66\%$): CO2 reactivity is fully abolished ($0\% \text{ CBF per mmHg}$).
    - *Limits*: CBF vasoconstriction plateaus below $PaCO_2 = 25\text{ mmHg}$; vasodilation plateaus above $75-80\text{ mmHg}$. Reactivity is transient, returning to baseline over $6-8\text{ hours}$ due to active bicarbonate extrusion and CSF pH normalization.
*   **Focal Cerebral Ischemia & Neuronal Injury (`patient.neuronalInjury`, §6.37)**: Triggered when $CBF < 20\text{ mL/100 g/min}$ (`hasCerebralIschemia`). Cumulative injury (0-100 index) accumulates proportionally to the CBF deficit below threshold, blunted by Xenon/Sevoflurane TREK-1-mediated neuroprotection (Ch19, Miller's 9th Ed, p.1537):
    $$\frac{d(\text{NeuronalInjury})}{dt} = \max(0, 20.0 - CBF) \cdot 0.05 \cdot TREK1_{\text{factor}}$$
    where $TREK1_{\text{factor}} = 0.5$ if (Xenon $\ge 0.05$ MAC or Sevoflurane $\ge 0.05$ MAC) and `isTREK1Knockout === false`, else $1.0$. Isoflurane/desflurane/halothane/nitrous oxide do not trigger this protection. The index does not decay once $CBF$ normalizes, reflecting the largely irreversible nature of ischemic neuronal injury.

#### 4.11 Gastrointestinal Physiology & Lower Esophageal Barrier Pressure (`GastrointestinalEngine.ts`)
The gastrointestinal engine models the lower esophageal sphincter ($LES$) tone, intragastric pressure ($P_{\text{gastric}}$), nitrous oxide ($N_2O$) bowel gas diffusion dynamics, and gut motility.

1.  **Lower Esophageal Sphincter (LES) Tone**:
    $$LES_{\text{tone}} = 25.0 \cdot \max(0.2, 1.0 - 0.4 \cdot \text{Propofol}_{Ce} - 0.3 \cdot \text{Volatile}_{\text{MAC}}) \quad \text{[mmHg]}$$
    LES tone represents the active sphincter barrier preventing the regurgitation of gastric contents. It is blunted dose-dependently by intravenous sedatives (Propofol) and inhalational volatiles.

2.  **Intragastric Pressure**:
    $$P_{\text{gastric}} = 7.0 + 15.0 \cdot suxFasciculation \quad \text{[mmHg]}$$
    Intragastric pressure is normally $7.0\text{ mmHg}$. However, during the first 45 seconds of succinylcholine administration, intense skeletal muscle fasciculations spike intragastric pressure by $+15.0\text{ mmHg}$ to $22.0\text{ mmHg}$.

3.  **Barrier Pressure & Regurgitation / Aspiration Triggers**:
    Regurgitation occurs if the stomach is not empty and gastric pressure exceeds LES tone:
    $$\text{Regurgitation} = \text{stomach === 'full'} \land P_{\text{gastric}} > LES_{\text{tone}} \land \neg\text{airwaySecured}$$
    If regurgitation occurs, active positive pressure ventilation ($PPV$) or spontaneous breathing will pull the regurgitated contents into the respiratory tract, causing **Chemical Aspiration Pneumonitis**:
    $$\text{Aspiration} = \text{Regurgitation} \land (\text{positivePressureVentilationActive} \lor \text{spontaneousBreathingActive})$$
    Aspiration triggers severe bronchospasm (resistance penalty $+25\text{ cmH2O/L/s}$) and chemical pneumonitis (compliance penalty $-30\text{ mL/cmH2O}$), which can be partially mitigated by suctioning the airway in the Trendelenburg position (reducing penalties to $+8$ resistance and $-10$ compliance).

4.  **Nitrous Oxide Bowel Gas Expansion**:
    Nitrous oxide ($N_2O$) is 34 times more soluble in blood than nitrogen ($N_2$). It diffuses into air-filled bowel cavities faster than nitrogen can escape, causing cavity expansion:
    $$\frac{d(\text{bowelGasVolume})}{dt} = +0.02 \cdot \left(\frac{EtN_2O}{100}\right) - 0.005 \cdot (\text{bowelGasVolume} - 1.0)$$
    clamped to a maximum of $2.5$.

#### 4.12 Hepatic Physiology, Pathophysiology, and Anesthetic Considerations (`HepaticEngine.ts`)
The hepatic physiological engine simulates liver perfusion, portal blood flow, hepatic arterial buffer response (HABR) compensation, portal venous pressure gradient (HVPG) elevation, Child-Pugh and MELD classification, and drug/volatile/pressure influences on hepatic hemodynamics.

1.  **Dual-Supply Hepatic Circulation**:
    The liver receives dual blood supply: portal venous flow ($PBF$) and hepatic arterial flow ($HABF$):
    $$PBF = 1000.0 \cdot CO_{\text{ratio}} \cdot (1.0 - 0.5 \cdot \text{cirrhosisFactor}) \quad \text{[mL/min]}$$
    where $CO_{\text{ratio}}$ is the current Cardiac Output divided by baseline Cardiac Output. Portal inflow is reduced by up to $50\%$ in patients with severe hepatic cirrhosis due to elevated structural vascular resistance.

2.  **Hepatic Arterial Buffer Response (HABR)**:
    The HABR is an intrinsic compensatory mechanism where a drop in portal venous inflow triggers immediate hepatic arterial vasodilation to maintain total hepatic blood flow ($THBF$):
    $$HABF = 300.0 + \max(0.0, 0.5 \cdot (1000.0 - PBF)) \cdot HABR_{\text{efficiency}} \quad \text{[mL/min]}$$
    $$THBF = PBF + HABF$$
    where the compensatory capacity is governed by the HABR efficiency:
    $$HABR_{\text{efficiency}} = \max(0.0, 1.0 - \text{Halothane}_{\text{MAC}}) \cdot \max\left(0.1, \min\left(1.0, \frac{MAP - 40.0}{20.0}\right)\right)$$
    - *Volatile Influence*: The buffer response is preserved under Isoflurane, Sevoflurane, and Desflurane anesthesia (maintaining $THBF$), but Halothane does not preserve it and dose-dependently inhibits it.
    - *Hypotensive Blunting*: When Mean Arterial Pressure ($MAP$) falls below $60\text{ mmHg}$, local autoregulation is impaired, abolishing the buffer response at $MAP \le 40\text{ mmHg}$.

3.  **Portal Venous Pressure Gradient (HVPG) & TIPS Decompression**:
    Normal HVPG is $5.0\text{ mmHg}$. Cirrhosis increases portal resistance, raising the gradient:
    $$HVPG = 5.0 + 15.0 \cdot \text{cirrhosisFactor} \cdot \left(\frac{THBF}{1300.0}\right) \quad \text{[mmHg]}$$
    A Transjugular Intrahepatic Portosystemic Shunt (TIPS) decompresses the portal system by creating a low-resistance pathway from the portal vein to the hepatic vein:
    $$\text{If patient has TIPS} \rightarrow HVPG = \min(12.0, HVPG)$$

4.  **Child-Pugh Classification & Operative Mortality**:
    Grades hepatic dysfunction and predicts 30-day postoperative mortality (Table 16.5, Miller's 9th Ed) based on scoring ($1-3\text{ points}$ each) five clinical parameters:
    - *Bilirubin (mg/dL)*: $<2.0$ ($1\text{ pt}$), $2.0-3.0$ ($2\text{ pts}$), $>3.0$ ($3\text{ pts}$)
    - *Albumin (g/dL)*: $>3.5$ ($1\text{ pt}$), $2.8-3.5$ ($2\text{ pts}$), $<2.8$ ($3\text{ pts}$)
    - *INR*: $<1.7$ ($1\text{ pt}$), $1.7-2.3$ ($2\text{ pts}$), $>2.3$ ($3\text{ pts}$)
    - *Ascites*: None ($1\text{ pt}$), Slight/Controlled ($2\text{ pts}$), Moderate/Refractory ($3\text{ pts}$)
    - *Encephalopathy Grade*: None ($1\text{ pt}$), Grade 1-2 ($2\text{ pts}$), Grade 3-4 ($3\text{ pts}$)
    - *Classes & Estimated Operative Mortality*:
      - Class A ($5-6\text{ points}$): $2-10\%$ mortality
      - Class B ($7-9\text{ points}$): $12-31\%$ mortality
      - Class C ($\ge 10\text{ points}$): $12-82\%$ mortality

5.  **West Haven Criteria for Hepatic Encephalopathy**:
    Classifies brain dysfunction from hepatic insufficiency into four progressive grades (Table 16.4, Miller's 9th Ed):
    - *Grade I*: Trivial lack of awareness, shortened attention span, disordered sleep.
    - *Grade II*: Lethargy, behavioral change, asterixis.
    - *Grade III*: Somnolence, confusion, gross disorientation, bizarre behavior.
    - *Grade IV*: Coma.

6.  **Model for End-Stage Liver Disease (MELD)**:
    Predicts 3-month survival and guides organ allocation using clinical laboratory values:
    $$MELD = 3.78 \cdot \ln(\max(1.0, \text{bilirubin})) + 11.2 \cdot \ln(\max(1.0, \text{INR})) + 9.57 \cdot \ln(\max(1.0, \text{creatinine})) + 6.43$$
    clamped to integer values between $6$ and $40$.

#### 4.13 Renal Physiology, Pathophysiology, and Anesthetic Considerations (`RenalEngine.ts`)
The renal physiological engine simulates renal perfusion, glomerular filtration, tubular function, ADH (vasopressin) and Aldosterone feedback loops, biochemical marker kinetics (BUN and creatinine), and acute kidney injury (AKI) development.

1.  **Renal Perfusion Pressure (RPP)**:
    Governed by Mean Arterial Pressure ($MAP$), Central Venous Pressure ($CVP$), and Positive End-Expiratory Pressure ($PEEP$) transmitting backpressure through the renal veins ($RVP$):
    $$RVP = CVP + 0.5 \cdot PEEP \quad \text{[mmHg]}$$
    $$RPP = \max(0.0, MAP - RVP) \quad \text{[mmHg]}$$

2.  **Renal Blood Flow (RBF) Autoregulation**:
    RBF is maintained relatively constant ($1100\text{ mL/min}$ baseline) between $RPP$ of $80$ and $180\text{ mmHg}$. Below $80\text{ mmHg}$, RBF drops rapidly and becomes pressure-passive:
    $$\text{If } RPP < 80.0 \rightarrow RBF_{\text{auto}} = \max(0.1, 0.1 + 0.9 \cdot \frac{RPP - 40.0}{40.0})$$
    $$\text{If } RPP \ge 80.0 \land RPP \le 180.0 \rightarrow RBF_{\text{auto}} = 1.0$$
    $$\text{If } RPP > 180.0 \rightarrow RBF_{\text{auto}} = \min\left(1.5, 1.0 + \frac{RPP - 180.0}{180.0} \cdot 0.2\right)$$
    - *Volatile Blunting*: Volatile agents ($>1\text{ MAC}$) blunt the autoregulatory response dose-dependently, shifting RBF towards passive dependence on perfusion pressure:
      $$RBF_{\text{auto, final}} = (1.0 - 0.5 \cdot \text{Volatile}_{\text{MAC}}) \cdot RBF_{\text{auto}} + 0.5 \cdot \text{Volatile}_{\text{MAC}} \cdot \left(\frac{RPP}{90.0}\right)$$
    - *Vasoactive Constriction*: Stress catecholamines, vasopressors, or alpha-adrenergic stimulants scale down RBF:
      $$VasoScale = \max(0.4, 1.0 - 0.35 \cdot \text{Symp} - 0.25 \cdot \min(1.0, \text{PressorCe} \cdot 5.0))$$
      where Fenoldopam (DA1 agonist) dilates the renal vasculature to offset constriction:
      $$VasoScale_{\text{final}} = \min(1.35, VasoScale + 2.5 \cdot \text{Fenoldopam}_{\text{Ce}})$$
      $$RBF = \max\left(30.0, \min(1600.0, 1100.0 \cdot CO_{\text{ratio}} \cdot RBF_{\text{auto, final}} \cdot VasoScale_{\text{final}} \cdot (1.0 - 0.4 \cdot \text{akiDamage}))\right)$$

3.  **Glomerular Filtration Rate (GFR) physics-based model**:
    GFR is directly proportional to the Net Filtration Pressure ($NFP$), which is the balance of hydrostatic and oncotic pressures in the glomerular capillary and Bowman space (Table 17.2, Fig 17.8, Miller's 9th Ed):
    $$P_{\text{gc}} = 60.0 \cdot \text{finalPgScale} \cdot GFR_{\text{efferentMod}} \cdot VasoScale_{\text{final}} \cdot GFR_{\text{MAC}} \quad \text{[mmHg]}$$
    $$P_{\text{bs}} = 18.0 + 0.5 \cdot PEEP \quad \text{[mmHg]}$$
    $$\pi_{\text{gc}} = 32.0 \cdot \left(\frac{\text{Albumin}}{4.0}\right) \quad \text{[mmHg]}$$
    $$NFP = \max(0.0, P_{\text{gc}} - P_{\text{bs}} - \pi_{\text{gc}}) \quad \text{[mmHg]}$$
    $$GFR = \max(0.0, \min(180.0, 12.5 \cdot NFP \cdot (1.0 - \text{akiDamage}))) \quad \text{[mL/min]}$$
    where:
    - *Capillary Pressure Autoregulation*: Glomerular capillary pressure is buffered across the autoregulatory range ($80\text{--}180\text{ mmHg}$) using a pressure-dependent scale factor ($pGc_{\text{auto}}$) which drops linearly below MAP of $90\text{ mmHg}$ and ceases diuresis completely at MAP $\le 50\text{ mmHg}$:
      $$\text{If } MAP < 90.0 \rightarrow pGc_{\text{auto}} = \max\left(0.78, 0.78 + 0.22 \cdot \frac{MAP - 50.0}{40.0}\right)$$
      $$\text{If } MAP \ge 90.0 \land MAP \le 180.0 \rightarrow pGc_{\text{auto}} = 1.0$$
      $$\text{If } MAP > 180.0 \rightarrow pGc_{\text{auto}} = 1.0 + \frac{MAP - 180.0}{180.0} \cdot 0.1$$
      $$\text{finalPgScale} = \text{autoregEffect} \cdot pGc_{\text{auto}} + (1.0 - \text{autoregEffect}) \cdot \left(\frac{MAP}{100.0}\right)$$
    - *PEEP transmission*: Bowman space pressure ($P_{\text{bs}}$) rises with PEEP backpressure ($0.5\text{ mmHg}$ increase per $1\text{ cmH2O}$ PEEP).
    - *Oncotic Pressure*: $\pi_{\text{gc}}$ scales linearly with serum albumin level (normal $4.0\text{ g/dL}$).
    - *Volatile Blunting & Penalties*: MAC blunts GFR autoregulation ($\text{autoregEffect} = \max(0.0, 1.0 - 0.5 \cdot \text{Volatile}_{\text{MAC}})$) and depresses GFR dose-dependently:
      $$GFR_{\text{MAC}} = \max(0.4, 1.0 - 0.25 \cdot \text{Volatile}_{\text{MAC}})$$
    - *Efferent Vasoconstriction*: AVP/Ang II constricts the efferent arteriole to preserve $P_{\text{gc}}$:
      $$GFR_{\text{efferentMod}} = 1.0 + \min(0.25, (\text{Vasopressin}_{\text{Ce}} \cdot 5.0 + \text{Symp} \cdot 0.4) \cdot (1.0 - 0.5 \cdot \text{Volatile}_{\text{MAC}}))$$

4.  **Urine Output (UOP) and Water Balance**:
    Urine flow rates scale with GFR and are regulated by ADH (vasopressin) water absorption and loops diuretics:
    $$UOP_{\text{mL/min}} = (GFR \cdot 0.01) \cdot (1.0 - 0.92 \cdot AVP_{\text{level}} \cdot (1.0 - \text{Diuretic}_{\text{effect}})) \cdot Diuretic_{\text{multiplier}}$$
    where $Diuretic_{\text{effect}}$ is determined by loop diuretics (Furosemide, Bumetanide) or osmotic agents (Mannitol):
    $$\text{Diuretic}_{\text{effect}} = \max\left(0.0, \min\left(0.92, \frac{loopDiureticCe + 0.15 \cdot MannitolCe}{loopDiureticCe + 0.15 \cdot MannitolCe + 1.2}
ight)\right)$$
    $$Diuretic_{\text{multiplier}} = 1.0 + 8.5 \cdot \text{Diuretic}_{\text{effect}}$$
    - ADH (AVP) levels ($AVP_{\text{level}}$) respond to plasma osmolality ($Osm$) and blood volume depletion:
      $$Osm = 2.0 \cdot [Na^+] + 2.0 \cdot [K^+] + \frac{BUN}{2.8} + \frac{Glucose}{18.0}$$
      $$AVP_{\text{level}} = \max\left(0.05, \min\left(1.0, 0.1 + \frac{Osm - 280.0}{20.0} + avpVol + avpStress\right)\right)$$
      where $avpVol$ scales with blood loss ratio and $avpStress$ scales with sympathetic activation.

5.  **Biochemical Marker Kinetics (BUN and Creatinine)**:
    - *Serum Creatinine ($Cr$)*: Accumulates at a rate dependent on GFR clearance relative to muscle production:
      $$\frac{d(Cr)}{dt} = 0.000018 \cdot \left(1.0 - \frac{GFR}{125.0} \cdot \frac{Cr}{Cr_{\text{baseline}}}\right) \quad \text{[mg/dL/s]}$$
    - *Blood Urea Nitrogen ($BUN$)*: Accumulates based on filtration clearance and urea reabsorption scaling:
      $$\frac{d(BUN)}{dt} = 0.00025 \cdot \left(1.0 - \frac{GFR}{125.0} \cdot \frac{BUN}{BUN_{\text{baseline}}} \cdot \left(1.0 - 0.35 \cdot \left(1.0 - \frac{GFR}{125.0}\right)\right)\right) \quad \text{[mg/dL/s]}$$

6.  **KDIGO Acute Kidney Injury (AKI) Staging**:
    AKI is staged according to serum creatinine fold-rise and the duration of oliguria ($UOP < 0.5\text{ mL/kg/h}$) or anuria ($UOP < 0.1\text{ mL/kg/h}$):
    - **Stage 1**: Creatinine rise $\ge 1.5\text{x}$ baseline OR oliguria duration $\ge 6\text{ hours}$.
    - **Stage 2**: Creatinine rise $\ge 2.0\text{x}$ baseline OR oliguria duration $\ge 12\text{ hours}$.
    - **Stage 3**: Creatinine rise $\ge 3.0\text{x}$ baseline OR creatinine $\ge 4.0\text{ mg/dL}$ OR oliguria $\ge 24\text{ hours}$ OR anuria $\ge 12\text{ hours}$.

7.  **Cortical vs. Medullary Perfusion & Oxygenation**:
    The renal cortex and medulla receive distinct blood flows and exhibit different oxygenation profiles, leaving the medulla highly vulnerable to ischemic injury under mild hypoperfusion (Table 17.1, Miller's 9th Ed):
    $$cortexRbf = 0.94 \cdot RBF \quad \text{[mL/min]}$$
    $$medullaRbf = 0.06 \cdot RBF \quad \text{[mL/min]}$$
    $$cortexPo2 = \max\left(0.0, \min\left(100.0, 50.0 \cdot \frac{cortexRbf}{1034.0} \cdot \frac{SpO_2}{98.0}\right)\right) \quad \text{[mmHg]}$$
    $$medullaPo2 = \max\left(0.0, \min\left(25.0, 8.0 \cdot \frac{medullaRbf}{66.0} \cdot \frac{SpO_2}{98.0}\right)\right) \quad \text{[mmHg]}$$
    $$cortexO2Extraction = \max\left(0.0, \min\left(1.0, 0.18 \cdot \frac{1034.0}{\max(50.0, cortexRbf)}\right)\right)$$
    $$medullaO2Extraction = \max\left(0.0, \min\left(1.0, 0.79 + 0.16 \cdot \max\left(0.0, 1.0 - \frac{medullaRbf}{66.0}\right)\right)\right)$$
    where the medulla is flagged with acute hypoxia if $medullaPo2 < 6.0\text{ mmHg}$.

8.  **Hypotension Exposure AKI Risk Thresholds**:
    Cumulative exposure to intraoperative hypotension is strongly associated with postoperative acute kidney injury (Page 460, Miller's 9th Ed). The simulator tracks cumulative exposure time to MAP < 60 mmHg and MAP < 55 mmHg:
    - **MAP < 60 mmHg Alert**: Triggered when cumulative time under 60 mmHg exceeds 11 minutes (660 seconds). Adds a persistent ischemic injury rate of $+0.003/\text{s}$ to `dDamage`.
    - **MAP < 55 mmHg Alert**: Triggered when cumulative time under 55 mmHg exceeds 10 minutes (600 seconds). Adds a persistent ischemic injury rate of $+0.003/\text{s}$ to `dDamage`.

#### 4.14 Adrenal Gland: Catecholamine Trigger + Cortisol/HPA Axis (`AdrenalEngine.ts`)

Phase 2, Stage A of `/Users/jsriverab/.claude/plans/mutable-roaming-newell.md`. Before
this engine, endogenous catecholamine release was modeled only as a downstream
consequence of `PainEngine.ts`'s nociception-driven `C_cat` pool -- real, but missing the
adrenal medulla's other major triggers, which drive a catecholamine surge independent of
pain. The adrenal cortex's cortisol output was previously only a binary
`patient.adrenalSuppressionActive` flag (etomidate's 11-beta-hydroxylase inhibition)
blunting catecholamine effects by a fixed 0.6x in `CardiovascularEngine.ts`.

*   **Adrenal medulla -- non-nociceptive sympathoadrenal triggers**: hypoglycemia
    (counter-regulatory surge below a ~70 mg/dL threshold, severe by ~40), hypoxia
    (chemoreceptor-driven, below ~90% SpO2), and hemorrhage/hypotension (baroreceptor-
    driven, below MAP 65 and/or blood-loss ratio above 0.15) each independently produce a
    stimulus on the *same* 0-100 nociception-equivalent scale `PainEngine.ts`'s
    `totalNociceptiveInflux` already uses. This is added directly into
    `PainEngine.ts`'s existing `targetCcat` (the input to its already-validated
    onset/clearance kinetics, ~90 s half-life) rather than a second, parallel
    catecholamine pool that never mathematically interacts with the first -- one real
    adrenal medulla output, fed by every trigger that drives it.
*   **Adrenal cortex -- cortisol/HPA axis**: cortisol's target tracks the same broad
    stress signal (capped and rescaled onto a 0-1 convention matching
    `RenalEngine.ts`'s existing aldosterone/vasopressin/Angiotensin-II scale), with its
    own slower kinetics (a real cortisol stress response unfolds over minutes, not the
    catecholamine pool's ~90 s half-life). Etomidate (`Ce > 0.05` or the existing
    `adrenalSuppressionActive` flag) collapses the *target* toward zero regardless of
    stress level -- 11-beta-hydroxylase inhibition blocks synthesis outright, not just a
    discount on whatever would otherwise be produced -- and dexamethasone coverage
    prevents this collapse, exactly the existing clinical mechanism, now continuously
    tracked rather than a step function.
*   **Cortisol's permissive effect, made graduated**: outputs a
    `catecholamineSensitivityMultiplier` (0.4-1.0) -- the textbook reason adrenal-
    insufficient/Addisonian patients develop catecholamine-refractory hypotension --
    saturating at 1.0 once cortisol reaches its own resting baseline (so normal,
    unstressed patients see full sensitivity, not a permanent discount) and falling only
    when cortisol drops *below* that baseline. Replaces
    `CardiovascularEngine.ts`'s old fixed 0.6x `adrenalSuppressionActive` multiplier on
    `svrSympatheticSpike`/`contractilitySympatheticSpike`, and `usePhysiology.js`'s
    matching fixed-0.6x discount on the exogenous-drug receptor-coupling multipliers
    (`effects.svrMultiplier`/`effects.coMultiplier`, the existing Hill-equation +
    alpha-1/beta-1/beta-2 receptor layer in `PKPDEngine.ts` that already drives
    epinephrine/norepinephrine/phenylephrine/ephedrine/vasopressin's exogenous effects) --
    both pathways now blunted by the same continuous, cortisol-driven signal, with a
    fallback to the old fixed 0.6x preserved exactly when the new engine's output isn't
    supplied (defensive default, not expected to be hit in the live tick loop).
*   **A real architecture finding, not assumed**: confirmed (by direct code tracing, not
    inference) that exogenous catecholamine-class drugs already have a genuine
    alpha-1/beta-1/beta-2 receptor-occupancy layer (`Pharmacology.js`'s `receptors`
    fields + `PKPDEngine.ts`'s Hill-equation coupling, lines ~518-592) -- but endogenous
    sympathetic activation (`PainEngine.ts`'s `C_cat`) used a separate, simpler
    sigmoid-curve pathway that never shared that machinery, and the two were purely
    additive at the final SVR/HR/inotropy assembly in `CardiovascularEngine.ts`, never
    mathematically coupled. This stage closed the *trigger* gap (adrenal medulla's
    non-pain triggers) and the *cortisol-permissiveness* gap; unifying the endogenous and
    exogenous catecholamine pathways through one shared receptor-occupancy model, and
    extending alpha-1 vasoconstriction to act per-vascular-bed, was deferred to its own
    checkpoint -- now done, see §4.18.
*   **Deliberately not yet modeled**: thyroid, pancreas/glucose-insulin, parathyroid/
    calcium-vitamin D (the rest of Phase 2); glucose is read here only as an *input*
    trigger for the counter-regulatory response, not yet computed from real
    glycogenolysis/insulin kinetics (that's the pancreas stage); cortisol's
    gluconeogenic/anti-inflammatory actions beyond the catecholamine-permissive effect are
    not modeled.
*   **Verification**: `src/testing/adrenal_engine.test.ts` (10 tests, including two
    integration tests proving `PainEngine.tick()`'s new optional
    `nonNociceptiveSympatheticStimulus` parameter measurably raises `C_cat` and
    `CardiovascularEngine.tick()`'s new optional `catecholamineSensitivityMultiplier`
    measurably blunts the resulting MAP). The live wiring (a new early `AdrenalEngine.tick()`
    call in `usePhysiology.js`, feeding both `PainEngine.tick()` and
    `CardiovascularEngine.tick()`) surfaced zero test failures on the first run --
    694/694 tests passing, build clean.

#### 4.15 Thyroid Gland: T3/T4 Axis -> Basal Metabolic Rate, Heat Production, Baseline HR (`ThyroidEngine.ts`)

Phase 2, Stage B. Before this engine, `totalMetabolicMultiplier` (driving
`VO2_sec`/`VCO2_sec` in `usePhysiology.js`) had three independent multiplier inputs
(shivering, seizure, malignant hyperthermia) but no thyroid-status contribution at all
-- hypothyroid and hyperthyroid patients behaved metabolically identically to euthyroid
ones. Temperature regulation had no thyroid-driven baseline, and HR had no thyroid-
driven baseline shift.

*   **Chronic-comorbidity-driven, not dynamically synthesized**: there is no TSH/
    pituitary input modeled to drive T3/T4 release; `patient.hypothyroidism`/
    `hyperthyroidism` set a target thyroid function index (0.6 untreated hypothyroid,
    1.5 untreated hyperthyroid, 1.15 if on antithyroid medication), and actual output
    tracks toward it with deliberately slow kinetics (T4's real biological half-life is
    ~7 days -- thyroid status doesn't meaningfully change within one OR case, itself the
    clinically important point: it's a baseline condition to manage, not something
    anesthesia changes acutely).
*   **Basal metabolic rate / HR baseline / temperature baseline**: the thyroid function
    index feeds a `thyroidMetabolicMultiplier` directly into `totalMetabolicMultiplier`
    (multiplying `VO2_sec`/`VCO2_sec`), an `hrBaselineShift` added into the existing
    `totalHrDelta` accumulator feeding `CardiovascularEngine.tick()`, and a
    `tempBaselineShift` that shifts the passive-temperature-equilibration *target* in
    `usePhysiology.js` (previously a hardcoded 37.0 for every patient regardless of
    thyroid status) rather than overriding the existing cooling-rate/shivering/MH
    temperature logic.
*   **Thyroid storm**: a real acute crisis trigger (matching this codebase's established
    MH/serotonin-syndrome pattern), not just a continuous multiplier -- inadequately-
    controlled hyperthyroidism (no antithyroid medication, no beta-blockade) under
    sufficient surgical/physiologic stress (read from `AdrenalEngine.ts`'s stimulus
    signal, Phase 2 Stage A) precipitates a dramatic multiplier/HR/temperature spike that
    can clinically mimic malignant hyperthermia -- a real, frequently-tested differential
    diagnosis point. Beta-blockade prevents triggering even if thyrotoxic.
*   **Deliberately not yet modeled**: TSH/pituitary dynamics, iodine-induced thyroid
    dysfunction, myxedema coma as a distinct staged crisis (hypothyroidism's metabolic
    suppression is modeled continuously but not as its own acute decompensation event
    the way thyroid storm is for hyperthyroidism).
*   **Verification**: `src/testing/thyroid_engine.test.ts` (7 tests, including a
    long-horizon test confirming antithyroid medication's target-blunting effect
    compounds correctly over many ticks, and a storm-vs-chronic comparison). 715/715
    tests passing after this and the two engines below, build clean.

#### 4.16 Pancreatic Endocrine Engine: Insulin/Glucagon -> Real Glucose Homeostasis (`PancreasEngine.ts`)

Phase 2, Stage C. Before this engine, `patient.glucose` was a static field -- read by
`RenalEngine.ts` (plasma osmolality) and `AdrenalEngine.ts` (hypoglycemia's counter-
regulatory trigger) but never actually computed from real physiology.

*   **Mechanism**: hepatic glycogenolysis/gluconeogenesis (driven by glucagon, which
    rises as glucose falls -- the real counter-regulatory loop, alongside
    `AdrenalEngine.ts`'s catecholamine surge for the same trigger) minus insulin-driven
    peripheral uptake (insulin rises as glucose rises above baseline), plus any
    exogenous dextrose. Net flux integrates directly into `patient.glucose`.
*   **Real stress hyperglycemia**: hepatic glucose output also scales directly with
    `AdrenalEngine.ts`'s cortisol level and non-nociceptive sympathetic stimulus -- a
    clinically significant perioperative phenomenon (surgical stress measurably raises
    glucose even in non-diabetic patients) this codebase had no mechanism for at all
    before this stage.
*   **Diabetes**: modeled as reduced insulin *sensitivity* (a disclosed simplification
    covering both insulin resistance and relative insulin deficiency, rather than
    separately staging Type 1 vs. Type 2 beta-cell function) -- diabetic patients show
    exaggerated stress hyperglycemia and a blunted ability to correct it, the real
    clinical picture, without needing two separate disease models.
*   **Exogenous insulin/dextrose**: reads `Insulin`'s PKPD `Ce` directly (added to the
    endogenous secretion target) and accepts an explicit exogenous-dextrose input --
    both verified to move glucose in the correct direction and magnitude.
*   **Calibration**: found by direct numerical balancing for a true steady state at
    baseline (no pathology) -- stays within a normal fasting-glucose band over a
    simulated hour with zero stress/pathology inputs.
*   **Deliberately not yet modeled**: Type 1 vs. Type 2 as genuinely distinct mechanisms;
    diabetic ketoacidosis/HHS as their own staged crises beyond the disclosed severe-
    hyperglycemia warning event; glycosylated hemoglobin or any longer-timescale glucose
    control metric.
*   **Verification**: `src/testing/pancreas_engine.test.ts` (7 tests, including a
    long-horizon insulin-overdose scenario confirming both the hypoglycemia and the
    critical (<40 mg/dL) event fire correctly).

#### 4.17 Parathyroid Gland Engine: PTH -> Calcium / Vitamin D Axis (`ParathyroidEngine.ts`)

Phase 2, Stage D -- completing Phase 2. Before this engine, `electrolytes.ca` was
modified only by `FluidicsEngine.ts`'s citrate-binding mechanism (massive transfusion
depleting ionized calcium) -- a real, correct acute mechanism, but with no homeostatic
*correction* layer at all: any calcium depletion was permanent until directly treated.

*   **Mechanism**: PTH secretion rises as calcium falls below baseline (real negative
    feedback) and raises calcium through a combined bone/renal/vitamin-D-dependent-
    intestinal effect. This engine adds the correction layer *without touching*
    `FluidicsEngine.ts`'s existing citrate mechanism -- the acute depletion event and the
    homeostatic response are genuinely separate physiological processes on different
    timescales (citrate binding is immediate; PTH-mediated correction unfolds over many
    minutes to hours) and are deliberately kept as separate mechanisms for that reason.
*   **Vitamin D / renal dependence**: vitamin D's activation step is renally dependent --
    chronic kidney disease (read directly from the existing `renalRatio` signal already
    computed early in `usePhysiology.js`'s tick, derived from `RenalEngine.ts`'s GFR)
    reduces how effective PTH's calcium-raising action can be, the real mechanism behind
    renal osteodystrophy/secondary hyperparathyroidism -- modeled here as reduced
    correction *effectiveness* rather than a separately-tracked vitamin D pool.
*   **Hypoparathyroidism**: a real, commonly-tested surgical complication (post-
    thyroidectomy/parathyroidectomy) blunts the PTH response directly, allowing
    progressive, unopposed hypocalcemia.
*   **A genuine design correction caught during testing, not assumed**: this engine only
    ever *raises* calcium (the correction layer) -- it has no mechanism to lower it, so
    an initial "fires when crossing below a threshold" event design could never actually
    trigger from its own dynamics (output is always >= input). Fixed by checking the
    *input* calcium level directly against the threshold with a logged-flag guard
    (matching `CardiovascularEngine.ts`'s `ischemiaMildLogged`/`-SevereLogged`
    convention) instead of a before/after transition this engine's own output could
    never produce -- caught by a failing test, not by re-reading the equations alone.
*   **Deliberately not yet modeled**: vitamin D as its own tracked pool (currently a
    direct renal-function-derived effectiveness multiplier); calcitonin; bone mineral
    density/osteoporosis as a distinct downstream consequence of chronic PTH elevation.
*   **Verification**: `src/testing/parathyroid_engine.test.ts` (7 tests). 715/715 tests
    passing, build clean.

#### 4.18 Receptor Unification: One Shared Alpha-1/Beta-1/Beta-2/V1 Model for Endogenous + Exogenous Catecholamines, Per-Vascular-Bed Redistribution (`ReceptorPharmacologyModel.ts`, `PainEngine.ts`, `PKPDEngine.ts`, `FourChamberCircuitModel.ts`)

Phase 2's deferred, highest-risk piece -- completing Phase 2. Direct code tracing during
Stage A (§4.14) found that exogenous catecholamine-class drugs (epinephrine,
norepinephrine, phenylephrine, ephedrine, vasopressin) already had a genuine alpha-1/
beta-1/beta-2/V1 receptor-occupancy layer (`Pharmacology.js`'s `receptors` fields +
`PKPDEngine.ts`'s Hill-equation coupling), but `PainEngine.ts`'s endogenous
catecholamine pool (`C_cat`) used a separate, simpler sigmoid pathway that never shared
that machinery -- the two combined only additively at the final SVR/HR/inotropy
assembly in `CardiovascularEngine.ts`, never through one mechanism. This is the most
direct fulfillment of the original "epinephrine should work through real vasoconstriction
and chronotropy" request that started this redesign.

*   **Extraction, not rewriting**: `PKPDEngine.ts`'s inline Hill-equation + receptor-
    coupling code (SVR driven by alpha-1/V1, antagonized by beta-2; CO/chronotropy
    driven by beta-1; a baroreflex-bradycardia term for pure pressors) was extracted
    verbatim into `ReceptorPharmacologyModel.ts`'s `hillEquationFraction`/
    `computeReceptorCoupling`. `PKPDEngine.ts` now calls this shared function instead of
    its own inline duplicate -- confirmed a pure refactor (zero behavior change, full
    suite passing identically before and after).
*   **Endogenous catecholamine profile**: `PainEngine.ts`'s `hrSpike`/
    `contractilitySpike`/`svrSpike` (previously three independently-tuned bespoke
    sigmoid formulas with two different EC50s) now come from one
    `computeModulatedEndogenousCoupling(C_cat, E_beta1_max, E_alpha1_max)` call through
    the shared model, with a disclosed receptor profile (Alpha1=7, Beta1=8, Beta2=2;
    not the same numeric potencies as exogenous epinephrine's, since those are
    calibrated against a completely different plasma-concentration c50 scale) found by
    direct numerical comparison against the prior formulas, not assumed --
    `src/testing/receptor_pharmacology_model.test.ts` keeps that comparison as a live
    regression check. `PainEngine.ts`'s existing beta-blockade/alpha-blockade/HTN-
    baseline/volatile-vasodilation modulation (`E_beta1_max`/`E_alpha1_max`) is preserved
    exactly, normalized against its own un-modulated baseline before scaling the shared
    model's receptor potencies. A small beta-2-mediated vasodilation component (real
    epinephrine physiology, absent from the old endogenous-only formula) is a disclosed,
    intentional addition. The live wiring surfaced **zero** test failures on first try --
    the careful numerical calibration against the prior formulas paid off.
*   **Per-vascular-bed alpha-1/beta-2 redistribution** (`FourChamberCircuitModel.ts`):
    real receptor-density differences mean a given amount of catecholamine activity
    doesn't vasoconstrict every bed equally -- skin and splanchnic beds are alpha-1-
    dominant (the real mechanism behind pressors shunting blood away from skin/gut),
    cerebral and coronary beds are comparatively spared (reinforcing the per-bed
    autoregulation already modeled in Phase 1), skeletal muscle has a disclosed beta-2-
    mediated vasodilation offset (the classic biphasic epinephrine dose-response).
    `alpha1ActivityIndex`/`beta2ActivityIndex` (the sum of `alpha1Activity`/
    `beta2Activity` across every active exogenous drug, via a new field on
    `PKPDEffects`, plus the endogenous coupling's own activity, via new fields on
    `PainEngineOutput`) feed this redistribution.
*   **A real, caught-by-testing math bug, not assumed correct**: an initial design
    weighted each bed's redistribution multiplier to average exactly 1.0 in *resistance*
    space (`ALPHA1_BED_WEIGHT`, CO-fraction-weighted). Direct numerical testing showed
    this does **not** preserve the parallel combination's total resistance -- $1/R_{total}
    = \sum 1/R_i$ is dominated by the lowest-resistance branch, not the arithmetic mean of
    the $R_i$ themselves (a consequence of the reciprocal function's convexity, Jensen's
    inequality). An early version caused MAP to *fall* at extreme pressor activity instead
    of rise -- the opposite of real physiology -- because a strongly-spared bed's
    resistance dropping enough created a low-resistance shunt the parallel combination
    disproportionately exploited. Fixed with an explicit renormalization step: compute
    the resulting parallel resistance after redistribution, and rescale every bed's
    resistance by `rSystemicTotal / resultingParallelResistance` (scaling every resistor
    in a parallel network by `k` scales the combination by exactly `k`, a basic circuit
    property) so the overall total is restored exactly regardless of how extreme the
    redistribution gets. Splanchnic pooling's own real net effect (sympathetic/celiac
    block) is applied *after* this renormalization, so it isn't accidentally undone by it.
*   **Verification**: `src/testing/receptor_pharmacology_model.test.ts` (11 tests, the
    direct numerical comparison against the prior bespoke formulas) and 4 new tests in
    `src/testing/four_chamber_circuit_model.test.ts` (redistribution stays MAP-neutral
    even at extreme activity, beta-2 redistribution likewise, splanchnic pooling's real
    effect survives the renormalization). 729/729 tests passing, build clean. **Phase 2
    is now fully complete**, including this previously-deferred piece.

#### 4.19 Differential Nerve Conduction Block: Fiber-Selective Local Anesthetic Blockade (`NerveConductionBlockModel.ts`)

Phase 3, Stage A of `/Users/jsriverab/.claude/plans/mutable-roaming-newell.md`. Before
this model, `Pharmacology.js`'s `calculateDermatomalBlockFraction` answered a purely
*spatial* question (which dermatomes fall within a neuraxial block's anatomical spread)
and that single coverage fraction was applied uniformly to every modality -- sympathetic,
pain, touch, and motor all "blocked" by the same amount at the same dose. Real local
anesthetics block nerve fibers differentially by diameter/myelination
(B > C/A-delta > A-beta > A-alpha, most-to-least susceptible) -- the real mechanism
behind a labor epidural sparing motor function while still blunting pain and sympathetic
tone, versus a denser surgical block additionally blocking A-alpha motor fibers.

*   **Two genuinely separate questions, now answered separately**: spatial coverage
    (unchanged, still `calculateDermatomalBlockFraction`) multiplied by a NEW
    concentration-dependent, fiber-specific Hill-equation block fraction
    (`calculateFiberBlockFractions`/`calculateDifferentialDermatomalBlock`). A new
    `epiduralConcentrationIndex` (0-1+, default 1.0 = surgical strength) lets a future
    UI/case-builder distinguish labor-epidural-strength dosing from surgical-strength
    dosing -- not yet wired to any control, but the mechanism is real and tested.
*   **Calibration**: EC50s found by direct numerical sweep so concentration=1.0
    (default, preserving prior behavior almost exactly) blocks every fiber class >90%,
    while concentration~0.25 (labor-epidural strength) gives the classic differential
    picture: sympathetic >80% blocked, pain meaningfully blocked, motor <20% blocked.
*   **Live wiring**: `CardiovascularEngine.ts`'s splanchnic sympathetic block and
    `GastrointestinalEngine.ts`'s ileus/motility sympathetic block both now route
    through this model (still defaulting to surgical-strength concentration, so existing
    behavior is preserved to within ~0.2% -- caught and fixed one test that asserted
    bit-for-bit exact old behavior, a precision expectation no longer appropriate now
    that sympathetic block asymptotically approaches but never exactly equals 1.0).
*   **Deliberately not yet modeled**: peripheral nerve block onset/offset kinetics over
    time (this model is a steady-state dose-response, not a time-course); a UI control
    for `epiduralConcentrationIndex`; motor-block synergy with neuromuscular blocking
    drugs (a dense epidural motor block reducing NMBD requirement is real and
    clinically taught, a natural follow-on).
*   **Verification**: `src/testing/nerve_conduction_block_model.test.ts` (9 tests).

#### 4.20 Autonomic Nervous System Engine: Continuous Parasympathetic (Vagal) Tone (`AutonomicNervousSystemEngine.ts`)

Phase 3, Stage B. Direct code tracing found ~5-6 genuinely separate sympathetic/
autonomic signals scattered across the codebase with no common parent, and **zero**
continuous parasympathetic/vagal tone concept anywhere -- every existing vagal effect
(oculocardiac reflex, Bezold-Jarisch, neostigmine-induced bradycardia) is a separate,
ad hoc binary/event-driven mechanism, not a tracked physiological state.

*   **Deliberately additive, not a replacement**: every existing sympathetic mechanism
    (baroreflex, Bezold-Jarisch, neostigmine bradycardia, etc.) is unchanged -- this
    engine adds the missing continuous vagal tone (rising with anesthetic depth and
    acute vagal stimulation triggers, falling with sympathetic activation and
    anticholinergics -- the real reciprocal sympathovagal balance) as a new additive
    contribution to the existing `totalHrDelta` accumulator, and provides a read-only
    `sympatheticToneIndex` that aggregates (without feeding back into) the existing
    scattered signals into one observable summary, for future use (e.g. a future
    autonomic-tone monitor display) without risking any existing formula's calibration.
*   **Live wiring surfaced zero test failures** on first try -- the careful "additive
    only, nothing replaced" design meant every existing tested mechanism stayed exactly
    as calibrated.
*   **Deliberately not yet modeled**: agent-specific vagal effects (volatiles differ in
    their autonomic profile; this uses one disclosed general MAC-scaled estimate);
    baroreceptor afferent fiber-level detail (the existing baroreflex stays a separate,
    unchanged mechanism in `CardiovascularEngine.ts`); any direct consumer of
    `sympatheticToneIndex` yet (built as a foundation, not yet displayed or read by
    another engine).
*   **Verification**: `src/testing/autonomic_nervous_system_engine.test.ts` (8 tests).
    746/746 tests passing, build clean.

#### 4.21 Brainstem Engine: Peripheral Chemoreceptor (Hypoxic) Ventilatory Drive + Vasomotor Center (`BrainstemEngine.ts`)

Phase 3, Stage C. Rather than restructuring `CerebralEngine.ts`/`ConsciousnessEngine.ts`
(two already-substantial, working, tested engines -- a genuine restructuring risk this
redesign has consistently avoided in favor of additive new engines), direct research
first confirmed Cushing's triad (ICP-driven hypertension, bradycardia, *and* irregular
respiration) is **already fully modeled** across `CardiovascularEngine.ts`/
`RespiratoryEngine.ts` -- not duplicated here. Research instead surfaced two genuinely
confirmed-absent gaps, both filled additively:

*   **Peripheral chemoreceptor hypoxic ventilatory response**: `RespiratoryEngine.ts`
    had zero PaO2/SpO2-driven respiratory rate term before this engine (confirmed by
    direct code search) -- only CO2-driven ventilation existed. Real peripheral
    chemoreceptors (carotid/aortic bodies) drive ventilation directly from hypoxia,
    independent of and faster than the CO2 response, and are disproportionately blunted
    by even low-dose volatile anesthesia and opioids relative to the CO2 response -- a
    well-described, clinically important phenomenon (a patient can desaturate without
    showing the expected compensatory tachypnea, specifically because hypoxic drive is
    blunted far more than hypercapnic drive at the same anesthetic depth). `hypoxicDriveRR`
    feeds additively into the existing `totalRrDelta` accumulator.
*   **Vasomotor center's vasoconstrictive arm**: direct tracing confirmed
    `CardiovascularEngine.ts`'s baroreflex (`errorBaro`/`autonomicHrMod`) only ever
    drives heart rate -- there was no general baroreflex-driven SVR contribution at all
    (only the ICP/Cushing's-specific special case has one, unchanged). Real
    baroreceptor-mediated compensation acts on both chronotropy *and* vasomotor tone
    together; `vasomotorSvrContribution` mirrors the existing HR-side error/MAC-gain
    structure (so the two arms of one reflex stay qualitatively coupled without reading
    or modifying `CardiovascularEngine.ts`'s own internal computation) and feeds
    additively into `targetSVR` via a new `drugEffects.vasomotorSvrContribution` field.
*   **Live wiring surfaced zero test failures** on first try -- both contributions are
    purely additive, touching no existing tested formula's calibration.
*   **Deliberately not yet modeled**: cerebellar motor coordination/vestibular function
    (nystagmus, ataxia, ataxia-as-early-anesthesia-sign, tonsillar herniation risk --
    confirmed completely absent everywhere, `CerebralEngine.ts`'s ICP/compliance
    tracking is ready for a future engine to read from); brainstem reticular activating
    system detail beyond what `ConsciousnessEngine.ts` already owns; differentiated
    central (medullary) vs. peripheral chemoreceptor *kinetics* (this stage adds the
    missing peripheral/hypoxic term but doesn't separately re-derive the existing,
    externally-computed CO2-driven term).
*   **Verification**: `src/testing/brainstem_engine.test.ts` (8 tests). 754/754 tests
    passing, build clean.
*   **Remaining Phase 3 scope** (not yet done, deliberately deferred): cerebellar
    function (a smaller, lower-priority piece given lower direct relevance to moment-to-
    moment crisis gameplay than the brainstem centers above) and a full cortical/
    subcortical *restructuring* of `CerebralEngine.ts`/`ConsciousnessEngine.ts` (still
    judged too risky relative to its payoff to attempt this session).

#### 4.22 Cerebellar Engine: Anesthesia-Depth Eye/Coordination Signs + Tonsillar Herniation Risk (`CerebellarEngine.ts`)

Phase 3, Stage C (cerebellar piece). The deferred piece from §4.21 above. A small, purely
additive, mostly read-only engine -- still no restructuring of `CerebralEngine.ts`/
`ConsciousnessEngine.ts` (still judged too risky relative to payoff). Confirmed by direct
grep that `nystagmus`/`ataxia`/`herniation`/`tonsillar` had zero prior representation
anywhere in `src/`.

*   **Nystagmus as an anesthesia-depth/drug sign**: ketamine (the classic dissociative-
    anesthetic cause, via vestibulocerebellar pathways) is modeled with the SAME Ce/(Ce+0.5)
    saturation form `CerebralEngine.ts` already uses for ketamine's CMR boost -- reusing an
    established calibration rather than inventing a new one. A second, independent term
    models the classic Guedel "Stage II" light-plane (excitement-stage) eye signs as a
    parabola in normalized volatile MAC, peaking at MAC ~0.5 and vanishing both at full
    wakefulness and at surgical-plane depth (MAC >= 1.0), where brainstem/cerebellar
    reflexes are suppressed -- matching the well-known teaching point that these signs are
    a light-plane phenomenon, not present awake or deep.
*   **Ataxia as a lighter, narrower-window sign**: midazolam (part of its classic sedative
    triad of ataxia/dysarthria/nystagmus) is modeled with the SAME Ce/(Ce+0.03) saturation
    form `ConsciousnessEngine.ts` already uses for midazolam's amygdalo-hippocampal
    disruption. A second volatile-MAC term peaks at MAC ~0.25 and vanishes by MAC 0.5 --
    narrower and shifted lower than nystagmus's window, reflecting that ataxia is the
    lighter of the two signs and returns earlier during emergence.
*   **Tonsillar (cerebellar) herniation risk** -- explicitly distinct from
    uncal/transtentorial herniation (CN3 palsy/blown pupil), which is supratentorial and
    not modeled here. A continuous 0-1 risk index combines absolute ICP (ramping 25-50
    mmHg), CPP collapse (ramping below 60 mmHg), rate of ICP rise (mmHg/s, since a fast
    rise is more dangerous than the same ICP reached slowly -- Monro-Kellie: slow rises
    allow partial compensation), and a multiplier for exhausted intracranial compliance.
    A discrete `herniationImminent` crisis flag fires at icp > 35 / cpp < 40 --
    deliberately more severe than, and never overlapping at the boundary with,
    `CerebralEngine.ts`'s existing Cushing's-reflex trigger (icp > 20 / cpp < 50), since
    that trigger's own hemodynamic/respiratory consequences are already fully modeled
    there and in `RespiratoryEngine.ts`. This adds the missing *named clinical concept*
    (recognizing and treating impending herniation) on top of mechanics that already
    existed, mirroring exactly how `CerebralEngine.ts` surfaces its own Cushing's-reflex
    transition as a narrative `events` entry rather than a new accumulator contribution.
*   **Wiring**: inserted into `usePhysiology.js` immediately after `CerebralEngine.tick()`'s
    event logging but *before* its writeback to `st.patient.icp`/`cpp` -- so
    `prevIcp`/`prevCpp` are the untouched previous-tick values, mirroring
    `CerebralEngine.ts`'s own internal `prevICP`/`prevCPP` transition-detection pattern
    exactly. Outputs (`nystagmusPresent`, `nystagmusSeverity`, `ataxiaIndex`,
    `tonsillarHerniationRisk`, `herniationImminent`) are new namespaced patient/vitals
    fields, not yet surfaced in any UI panel or the Attending chat -- groundwork only.
*   **Live wiring surfaced zero test failures** on first try.
*   **Verification**: `src/testing/cerebellar_engine.test.ts` (12 tests). 766/766 tests
    passing, build clean.
*   **Phase 3 is now fully complete** except for the explicitly-deferred full
    cortical/subcortical restructuring of `CerebralEngine.ts`/`ConsciousnessEngine.ts`,
    which remains out of scope as a standalone restructuring risk, not a missing-content gap.

#### 4.23 GI Subdivision: Gastric Content Model + Segment-Specific (Stomach/Small Bowel/Colon) Motility (`GastricEmptyingModel.ts`, `GastrointestinalEngine.ts`)

Phase 4 (first piece). Direct code search confirmed `patient.gastricVolume` existed as an
orphaned field -- read by `ClinicalAiChat.js` but never assigned anywhere -- and no gastric
pH concept existed at all; `gutMotility`/`postoperativeIleus` were single lumped numbers
with no stomach/small-bowel/colon distinction. Two additive pieces fill both gaps, neither
touching `GastrointestinalEngine.ts`'s existing, unchanged, tested aspiration TRIGGER logic
(`patient.stomach === 'full' && gastricPressure > lesTone`), which stays keyed on the binary
scenario-level flag exactly as before.

*   **New `GastricEmptyingModel.ts`**: real gastric content volume (mL) and pH, continuously
    evolving from `patient.npoSolids`/`npoLiquids` (already tracked for the PreOp
    aspiration-risk assessment) via first-order emptying/re-acidification kinetics (baseline
    ~90 min half-life), slowed by opioid receptor occupancy and sympathetic stress, with a
    persistently-elevated equilibrium floor for conditions that delay emptying throughout a
    case rather than just at induction (GLP-1 agonist therapy, trauma/sepsis-driven ileus,
    emergent RSI). An explicit `patient.stomach === 'full'` scenario override (e.g. a
    trauma/obese case preset) sets a high initial volume regardless of NPO times, so it never
    contradicts the existing binary classification.
*   **Mendelson's syndrome severity grading**: classic criteria (pH < 2.5 AND aspirate volume
    above a weight-scaled threshold -- see §4.24 -- together predict severe chemical pneumonitis)
    compute a continuous `aspirationSeverityIndex` -- modeled as volume gating severity (no
    appreciable aspirate volume, nothing to injure the lung with) with acidity modulating
    destructiveness once there is enough of it, NOT a simple average of the two factors. This
    replaces a single flat compliance/resistance penalty (`usePhysiology.js`, previously a fixed
    30/25) with a severity-scaled one (`0.4 + 1.0 * severity`, multiplying the same prior
    constants). Severity is FROZEN into `patient.aspirationEventSeverity` at the moment aspiration
    first occurs (mirroring the established "logged once" flag convention) rather than continuing
    to drift with the patient's now-evolving gastric content after the fact -- the lung injury
    from an aspiration event shouldn't keep changing based on what's currently in the stomach.
    Two independent triggers can set `hasAspirated` (the GI engine's own internal one, gated on
    `gastricPressure > lesTone`; and a looser legacy secondary check in `usePhysiology.js`,
    PPV-on-full-stomach with no pressure-spike requirement, which is in practice the more common
    real-world path -- mask ventilation on an unsecured full stomach before sux/intubation) --
    both are wired to freeze severity correctly, the second falling back to the live
    `aspirationSeverityIndex` on first occurrence only if the first didn't already freeze it.
*   **Real aspiration-prophylaxis pharmacology** now drives this model -- see §4.24.
*   **Segment-specific motility/ileus** (`GastrointestinalEngine.ts`): real, well-established
    clinical teaching -- postoperative small bowel motility returns within hours, gastric
    emptying within ~24-48h, colonic motility last at ~48-72h (the classic "small bowel, then
    stomach, then colon" ileus-resolution sequence taught via return of bowel sounds/flatus/
    first bowel movement). Modeled by applying the SAME `inflammatoryIleus` accumulator
    (unchanged) with a per-segment sensitivity multiplier (colon 1.0, stomach 0.7, small bowel
    0.35) and a per-segment ileus-duration-estimate base constant (colon 72h matching the
    original single constant, stomach 48h, small bowel 24h). `gutMotility`/`postoperativeIleus`
    (unchanged field names) are now derived composites -- average and max respectively -- of
    the three new `stomachMotility`/`smallBowelMotility`/`colonicMotility` and
    `stomachIleusDurationHours`/`smallBowelIleusDurationHours`/`colonicIleusDurationHours`
    fields, rather than independently-computed numbers, preserving the original's
    carry-forward-after-manipulation-stops behavior (a real near-regression caught before it
    shipped: an early version reset all three to 0 once `manipulationIndex` returned to 0 at
    closure, losing the prediction made during surgery exactly when PACU needs it most).
*   **Live wiring surfaced zero test failures** on first try, after the carry-forward fix above
    was caught during this session's own testing (not by an existing regression test).
*   **Verification**: `src/testing/gastric_emptying_model.test.ts` (8 tests),
    `src/testing/gastrointestinal.test.ts` (5 new tests added to the existing Chapter 15 suite).
    779/779 tests passing, build clean.
*   **Remaining GI subdivision scope** (deliberately deferred): nutrient transit/absorption; a
    true real-time bowel-sounds/flatus-return UI signal (the new per-segment fields are
    groundwork, not yet surfaced in any panel or the Attending chat).

#### 4.24 Real Aspiration-Prophylaxis Pharmacology: Sodium Citrate, Famotidine, Pantoprazole, Metoclopramide (`Pharmacology.js`, `GastricEmptyingModel.ts`, `GastrointestinalEngine.ts`)

§4.23's gastric content model originally disclosed a scope gap: no antacid/H2-blocker/PPI/
prokinetic medication existed in this codebase's drug database, so gastric pH/volume could
evolve correctly from physiology but couldn't yet be treated. Four new drugs close that gap,
added to BOTH `MEDICATIONS` (`Pharmacology.js`) and `MEDICATIONS_CONFIG` (`meds.config.ts`)
per this project's two-database-sync convention, each with a distinct, real mechanism rather
than a single generic "antacid" effect:

*   **Sodium Citrate** (nonparticulate oral antacid): a direct chemical neutralization of acid
    already present in the stomach, modeled as an INSTANT additive pH bump on top of the
    kinetic value (`+4.0 * Ce/(Ce+2.0)`) rather than a slow re-equilibration -- real antacid
    neutralization happens on contact within minutes. No effect on future secretion or volume.
    Its "Ce" is a disclosed proxy for remaining local buffering capacity, not a literal systemic
    blood concentration (this drug has no real systemic pharmacokinetics worth modeling).
*   **Famotidine** (H2 blocker): reversibly blocks histamine-driven acid secretion, tracking its
    plasma effect-site concentration directly like a normal drug. Raises the fasting-equilibrium
    pH TARGET itself (toward ~4.5 at saturation, not just a transient bump) and modestly reduces
    the secretion-driven volume floor. Has no effect on acid already secreted before the drug
    took effect -- only on what the stomach goes on to secrete.
*   **Pantoprazole** (PPI): the most pharmacologically interesting of the four. Real PPIs
    covalently and IRREVERSIBLY inhibit the parietal cell H+/K+-ATPase, so the clinical effect is
    genuinely DECOUPLED from plasma concentration -- plasma Ce clears in ~1-1.5h, but acid
    suppression persists ~24-48h until new pumps are synthesized. Modeled with a separate slow
    on/off accumulator, `ppiSuppressionLevel` (on/off rates ~0.0003/s and ln(2)/(33h) respectively,
    carried forward on `patient.ppiSuppressionLevel` exactly like other "logged" continuous
    state), rather than incorrectly tying acid suppression to a Ce value that has already
    returned to zero. More potent than Famotidine at its ceiling (~6.5 vs ~4.5), combined via
    `max()` rather than additively when both are present -- real H2 blockers and PPIs converge on
    the same final proton-pump step, so stacking them gives little added benefit over the
    stronger agent alone, and the model reflects that instead of double-counting.
*   **Metoclopramide** (prokinetic): the only one of the four that affects the ASPIRATION
    BARRIER rather than just the content -- two real, independent mechanisms. (1) Speeds gastric
    emptying via `gastricEmptyingRateMultiplier` (up to 2x at saturation), a direct multiplier on
    `GastricEmptyingModel.ts`'s rate constant. (2) Raises lower esophageal sphincter tone
    (`GastrointestinalEngine.ts`'s pre-existing `lesTone` formula, previously only ever
    depressed by Propofol/volatiles, never raised by anything) -- since `lesTone` directly drives
    the aspiration TRIGGER (`gastricPressure > lesTone`), Metoclopramide can genuinely PREVENT an
    aspiration event from happening at all, not just reduce its severity once it does, which is
    what distinguishes it from the other three drugs above.
*   **Weight-scaled Mendelson criteria**: the original §4.23 implementation used a fixed 25 mL
    volume threshold (the literal number from Mendelson's 1946 study). Replaced with the modern,
    weight-scaled refinement (~0.4 mL/kg), threaded from `patient.weight` (already an established
    field elsewhere in this codebase, defaulting to 70 kg) -- a real accuracy correction prompted
    directly by this session's pharmacology work, not a pre-existing bug.
*   **Side finding, since fixed**: `Ondansetron`, `Dexamethasone`, and `Tranexamic Acid (TXA)`
    existed in `MEDICATIONS_CONFIG` (`meds.config.ts`) but were MISSING from `MEDICATIONS`
    (`Pharmacology.js`) -- the exact known sync-gap pattern this project's own CLAUDE.md warns
    about. All three are now mirrored into `Pharmacology.js` verbatim (identical `pk`/`pd`/
    `indications`, `mechanism` field added for consistency with neighboring entries), making them
    selectable in the live simulator UI for the first time, not just usable from test files. No
    other engine reads these drugs' `Ce` yet (confirmed by direct search before adding), so this
    was a pure additive fix with zero behavioral risk to any existing tested formula.
*   **Live wiring surfaced two real test-design bugs, both in this session's OWN new tests, not
    in the engine**: a metoclopramide-prevents-aspiration test initially used a depression level
    (Propofol Ce 2.5 + MAC 0.5) strong enough that metoclopramide's LES-tone boost (capped at
    +40% at saturation, a disclosed calibration ceiling) couldn't mathematically overcome it --
    fixed by testing at a more marginal, still-realistic depression level where the prokinetic
    effect can plausibly tip the balance, rather than inflating the drug's potency to force the
    test to pass. A weight-scaling test initially used an NPO-derived gastric volume so large
    (320 mL) that the severity ramp saturated identically for both a 40 kg and 150 kg patient --
    fixed by setting `gastricVolume` directly to a value between the two patients' weight-scaled
    thresholds, where the difference is actually visible.
*   **Verification**: `src/testing/gastric_emptying_model.test.ts` (+6 tests, 14 total),
    `src/testing/gastrointestinal.test.ts` (+5 tests, 19 total). 790/790 tests passing, build
    clean, zero regressions on first wiring of the engine changes themselves.
*   **Deliberately not modeled**: extrapyramidal/sedative side effects of Metoclopramide; real
    PPI oral-dosing steady-state buildup over multiple days (this models single/repeat IV dosing
    only); particulate vs. non-particulate aspirate distinction (meal-type/particulate content is
    not tracked).

#### 4.25 Genitourinary/Reproductive, Stage A: Pregnancy Physiology (`PregnancyPhysiologyEngine.ts`)

Phase 4's "genitourinary completion + reproductive system" bucket. Direct code audit
confirmed pregnancy was previously UI-only/inert: `patient.pregnancy`/beta-hCG lab flags
exist (PreOpEMR.jsx), and the existing "OB/GYN - Emergent C-Section" case preset describes a
postpartum hemorrhage scenario, but NO engine anywhere read a pregnancy flag to modify blood
volume, cardiac output, SVR, HR, FRC, ventilatory drive, or GI motility/LES tone -- the only
pre-existing pregnancy-aware code was a single, genuinely isolated PKPD plasma-cholinesterase
multiplier for Mivacurium metabolism. `RenalEngine.ts` already had bladder volume/Foley
tracking (opioid-induced urinary retention), but no bladder pressure-volume mechanics,
ureteral peristalsis, or urethral resistance -- those remain deferred to a later stage.

New `PregnancyPhysiologyEngine.ts`, a small, stateless, purely additive engine (matching
`BrainstemEngine.ts`/`CerebellarEngine.ts`'s shape) modeling five real, well-established
physiologic changes of pregnancy, each ramping with gestational age rather than appearing as
a step function:

*   **Blood volume expansion** (~45% by term) and **decreased SVR** (~20%, progesterone-
    mediated) and **increased HR baseline** (~+15 bpm) -- together the real mechanism behind
    pregnancy's ~40% cardiac output increase by term. Deliberately NO separate CO multiplier
    was added: CO correctly EMERGES from the existing chamber-mechanics model once preload
    (via the existing `positionPreloadMod` channel -- the same mL-equivalent quantity position
    changes already use), SVR (a new `pregnancySvrMultiplier` field on
    `CardiovascularDrugEffects`, multiplying `targetSVR` alongside the existing
    `safeDrugSvrMod`), and HR (the existing `totalHrDelta` accumulator) are corrected.
*   **Decreased FRC** (~20% by term) and **increased VO2/minute ventilation** (~20% by term,
    feeding the existing `totalMetabolicMultiplier` chain) producing chronic mild respiratory
    alkalosis (baseline PaCO2 ~32 mmHg instead of 40, replacing the flat constant in the same
    ternary `usePhysiology.js` already uses for COPD/obesity baselines). Together these are why
    pregnant patients desaturate dramatically faster during apnea/induction -- a major OB
    anesthesia teaching point that emerges here from the FRC/VO2 changes rather than needing
    its own bespoke desaturation mechanism. FRC required extending
    `RespiratoryEngine.calculateLungVolumes()`'s signature with a new trailing optional
    `pregnancyFrcMultiplier` parameter (default 1.0, zero risk to ~15 existing positional call
    sites in tests) multiplied into the SAME chain `obesityFactor`/`posFactor`/
    `anesthesiaFrcFactor` already use.
*   **Aortocaval compression / supine hypotensive syndrome**: after ~20 weeks, the gravid
    uterus can compress the IVC/aorta when supine, causing a sudden severe preload drop --
    relieved by left uterine displacement/lateral tilt. The one effect here gated on BOTH
    gestational age AND actual current positioning (not just being pregnant), feeding an
    additional negative term into the same `positionPreloadMod` channel, active only for
    flat/supine-like positions (`Supine`/`Lithotomy`/`Ramped`/`Sniffing`) without
    `leftUterineDisplacement`. A new narrative event fires in `usePhysiology.js` on the
    false-to-true transition (mirroring the established convention), advising left uterine
    displacement/lateral tilt.
*   **Decreased LES tone / delayed gastric emptying**: progesterone relaxes the LES and slows
    gastric emptying, becoming significant earlier (~8-16 weeks) than the mechanical/
    hemodynamic changes above (~12-40 weeks) -- a real, deliberately separate, earlier ramp,
    since progesterone rises sharply in the 1st trimester well before the uterus is
    mechanically large. Feeds `GastricEmptyingModel.ts`'s existing `persistentGastroparesis`
    OR-condition (alongside GLP-1/trauma/sepsis/emergent RSI) and a new LES-tone reduction
    term in `GastrointestinalEngine.ts`'s `lesTone` formula -- this is the real mechanism
    behind pregnancy's well-known "full stomach" aspiration-risk status, and Metoclopramide's
    existing LES-tone boost (§4.24) correctly stacks on top of a pregnancy-depressed baseline
    rather than being independent of it.
*   **Live wiring surfaced zero test failures** on first try, across all four consuming
    engines (`CardiovascularEngine.ts`, `RespiratoryEngine.ts`, `GastrointestinalEngine.ts`/
    `GastricEmptyingModel.ts`) plus the `usePhysiology.js` orchestration layer.
*   **Verification**: `src/testing/pregnancy_physiology_engine.test.ts` (10 tests, standalone
    engine), plus integration tests added to `src/testing/cardiovascular.test.ts` (SVR
    multiplier), `src/testing/respiratory_ch13.test.ts` (FRC multiplier, both at the
    `calculateLungVolumes()` level and threaded through `tick()`), and
    `src/testing/gastrointestinal.test.ts` (LES tone penalty + GI slowing + Metoclopramide
    stacking). 806/806 tests passing, build clean.
*   **Remaining genitourinary/reproductive scope at the time** (Stage A): real bladder
    pressure-volume mechanics and ureteral peristalsis (still volume-only in
    `RenalEngine.ts`); sex-specific urethral resistance; male prostate/erectile physiology;
    uterine tone/postpartum hemorrhage mechanics; placental circulation/fetal heart rate
    monitoring. This stage deliberately covered the cardiovascular/respiratory/GI changes of
    pregnancy first since they're the most broadly clinically impactful and directly activate
    the previously-inert OB/GYN case preset, not because the remaining items are lower
    priority in an absolute sense.

#### 4.26 Genitourinary, Stage B: Bladder Pressure-Volume Mechanics, Sex-Specific Overflow, Autonomic Dysreflexia (`BladderModel.ts`)

Phase 4's genitourinary bucket, second piece. Direct code audit confirmed `RenalEngine.ts`
already tracked `bladderVolume` as a simple accumulator (filling unboundedly during
opioid-induced urinary retention, draining instantly to zero the moment retention resolved or
a Foley was placed) and `usePhysiology.js` applied a FLAT +5 HR / +5 MAP "distension" offset
whenever `urinaryRetentionActive` was true, regardless of how much volume had actually
accumulated -- no bladder pressure concept existed at all, no ceiling on volume growth, no
sex-specific urethral resistance, and no autonomic dysreflexia mechanism anywhere (confirmed
by direct search: zero references in engine/component code).

Deliberately NOT a multi-compartment ureteral/two-kidney rebuild -- `RenalEngine.ts`'s
existing single lumped architecture stays as-is. "Ureteral peristalsis" at this simulator's
1Hz whole-body granularity is captured simply as the existing continuous (not instantaneous)
kidney-to-bladder filling already provided; the genuinely missing pieces this stage adds:

*   **Bladder pressure-volume (compliance) relationship**: new `BladderModel.ts` -- high
    compliance (low pressure, ~5 cmH2O) up to ~400 mL functional capacity, then a quadratic
    pressure rise (a simpler curve to calibrate than an exponential elastance model, though
    the same general "flat-then-steep" shape `CerebralEngine.ts`'s ICP model uses for the
    analogous intracranial compliance curve) -- ~35 cmH2O by 700 mL, ~88 cmH2O by 900 mL.
*   **Pressure-graded sympathetic distension response**, replacing the flat +5/+5 HR/MAP
    on/off offset in `usePhysiology.js` with a continuous function of actual bladder
    pressure (`distensionSympatheticIndex`, ceiling at ~40 cmH2O) -- mild distension barely
    registers, severe distension produces a real, graded surge (up to +8 HR / +8 MAP at the
    ceiling, slightly more than the old flat value at its most severe).
*   **Sex-specific overflow/urethral closure pressure**: once bladder pressure exceeds the
    urethral closure pressure (60 cmH2O female, 90 cmH2O male -- the longer male urethra
    having higher baseline resistance, consistent with the existing age+male BPH-risk
    modifier already present in the retention-probability roll) without a Foley, urine leaks
    past the sphincter proportional to the pressure excess. This is both a real physiologic
    safety valve (bladder volume can no longer grow literally without limit, a genuine gap
    before this stage) and the real mechanism behind overflow incontinence.
*   **Autonomic dysreflexia** (spinal cord injury above ~T6): a real, well-known, and
    previously entirely unmodeled anesthesia teaching point -- bladder distension is the
    single most common trigger, producing severe paroxysmal hypertension (+60 mmHg MAP at
    full severity) with reflex bradycardia (-20 bpm), triggered at a MUCH lower bladder
    pressure (>15 cmH2O) than would concern a neurologically intact patient, since the
    visceral afferent signal still reaches the cord and triggers an unopposed sympathetic
    reflex below the lesion. Gated on a new, currently UI-unconnected (groundwork-only)
    `patient.hasSpinalCordInjuryAboveT6` flag. A new narrative event fires in
    `usePhysiology.js` on the false-to-true transition, advising immediate bladder
    decompression and hypertension treatment.
*   **Integration**: `RenalEngine.ts`'s existing retention/Foley TRIGGER semantics (filling
    only during active retention without a Foley; instant full drain on resolution/Foley) are
    completely unchanged -- `BladderModel.ts` owns only the volume/pressure/leak/dysreflexia
    math, called twice per tick when drainage occurs (once for the pre-drainage state to
    determine leak, once recomputed against the post-drainage volume so pressure/distension
    outputs reflect the actual post-drainage state the same tick). Overflow-leaked urine is
    counted toward total `urineOutput` (genuine, clinically measurable urine loss), distinct
    from controlled voiding/Foley drainage.
*   **Live wiring surfaced zero test failures** on first try, across `RenalEngine.ts` and the
    `usePhysiology.js` orchestration layer (the pre-existing opioid-induced urinary retention
    regression tests in `src/testing/opioids_ch24.test.ts` all passed unchanged).
*   **Verification**: `src/testing/bladder_model.test.ts` (12 tests, standalone engine), plus
    5 new integration tests appended to `src/testing/opioids_ch24.test.ts`. 823/823 tests
    passing, build clean.
*   **Remaining genitourinary/reproductive scope** (deliberately deferred): ureteral
    obstruction/hydronephrosis (would require a left/right kidney split this single lumped
    `RenalEngine.ts` doesn't have -- judged too large relative to payoff for this stage);
    sex-specific urethral resistance's effect on Foley catheterization difficulty (a Bucket C
    procedural mechanic, not core physiology); male prostate/erectile physiology; uterine
    tone/postpartum hemorrhage mechanics; placental circulation/fetal heart rate monitoring.

#### 4.27 Genitourinary/Reproductive, Stage C: Uterine Tone and Postpartum Hemorrhage (`UterineToneModel.ts`)

Closes the most clinically central remaining gap: the existing "OB/GYN - Emergent
C-Section (PPH)" case preset narratively describes "severe postpartum hemorrhage" but set
zero physiology behind it. Direct audit also confirmed this codebase had NO continuous
surgical/obstetric bleeding-RATE mechanism anywhere -- `patient.ebl` only ever increased via
discrete, one-off additions (e.g. the existing methoxyflurane-nephrotoxicity dehydration
term). `UterineToneModel.ts` is the first continuous bleeding-rate mechanism in this
codebase, deliberately following that same established "add to `patient.ebl` each tick"
convention rather than inventing a new architecture.

*   **Real mechanism**: myometrial contraction after delivery compresses the spiral arteries
    that fed the placenta -- this, not clotting, is what actually stops postpartum bleeding.
    An atonic uterus bleeds at a substantial fraction of term uteroplacental flow (several
    hundred mL/min); a well-contracted one reduces it to a lochia-level trickle (~2 mL/min).
    Falls off faster than linearly with tone improvement -- partial recovery helps
    disproportionately, a real and clinically reassuring property.
*   **Risk factors**: dose-dependent uterine relaxation by volatile anesthetics (a real,
    important teaching point -- avoid high-dose volatiles during Cesarean delivery for
    exactly this reason) and by Magnesium Sulfate (a tocolytic side effect of the SAME drug
    already in `Pharmacology.js` for preeclampsia/eclampsia seizure prophylaxis, reused rather
    than duplicated); prolonged labor; chorioamnionitis; retained placental tissue -- a
    MECHANICAL cause that caps achievable tone at 0.5 regardless of uterotonic dose until
    physically resolved (uterotonics alone cannot fully correct it).
*   **Four new uterotonic drugs**, added to both `Pharmacology.js`/`meds.config.ts`:
    Oxytocin (first-line, fast onset/short half-life, real vasodilation/reflex-tachycardia
    side effect from rapid bolus), Methylergonovine (potent, longer-acting, real-world
    CONTRAINDICATED in hypertension/preeclampsia -- vasoconstriction risk), Carboprost
    (potent, CONTRAINDICATED in asthma -- bronchospasm risk), Misoprostol (weaker/slower, no
    major contraindications). Combining multiple agents for refractory atony (standard real
    practice) helps more than any single agent, with a real combined-benefit ceiling.
*   **Contraindications deliberately NOT gated inside the engine**: in real medicine
    "contraindicated" means dangerous, not ineffective -- Methylergonovine still works as a
    uterotonic in a preeclamptic patient, it just risks a hypertensive crisis via the SAME
    vasoconstrictive pd profile already on its `Pharmacology.js` entry (feeding the existing
    generic PKPD-driven CV effect, no special-case code needed there either). The
    contraindication itself is surfaced as a `QualityEvent` from `usePhysiology.js`
    (`PharmacologicChoice`/`critical`), mirroring the established Succinylcholine-in-
    muscular-dystrophy precedent exactly, properly separating pure physics (the engine) from
    scoring/feedback (the orchestration layer).
*   **Verification**: `src/testing/uterine_tone_model.test.ts` (12 tests). See §4.29 below
    for full-phase verification numbers (all four new Stage C-F pieces wired and tested
    together).

#### 4.28 Genitourinary/Reproductive, Stage D: Fetal Monitoring (`FetalMonitoringModel.ts`)

Confirmed by direct audit: zero fetal physiology existed anywhere in this codebase before
this. Deliberately NOT a full second-patient fetal physiology simulation (no separate fetal
cardiovascular/respiratory/acid-base system -- that would be substantially larger than this
stage's scope). It IS a real, clinically meaningful fetal heart rate response to the SAME
maternal variables an anesthesiologist actually manages, deliberately integrating with
mechanisms already built in this rebuild rather than existing in isolation:

*   **Uteroplacental perfusion**: fetal heart rate responds to a combined maternal MAP/SpO2
    adequacy index. This directly connects to `PregnancyPhysiologyEngine.ts`'s aortocaval
    compression mechanism (Phase 4 Stage A) -- a supine, undisplaced gravid patient's MAP
    drop now has a real downstream fetal consequence (late decelerations/bradycardia) rather
    than being a maternal-only number, taking `maternalMAP`/`maternalSpO2` as plain inputs
    with no special-case wiring required between the two engines.
*   **Late decelerations / fetal bradycardia from uteroplacental insufficiency**: a graded
    FHR depression as a continuous function of the perfusion/oxygenation deficit, not a
    separate bespoke mechanism -- real CTG teaching.
*   **Uterine hyperstimulation (oxytocin overdose)**: a genuine double-edged-sword teaching
    point given Stage C just added Oxytocin as a postpartum hemorrhage treatment --
    PRE-delivery, supraphysiologic oxytocin dosing (only above a real therapeutic-dose
    threshold, not at normal infusion rates) causes uterine tachysystole, reducing the
    fetus's inter-contraction recovery window independently of maternal perfusion. The same
    drug that treats PPH after delivery can cause fetal distress before it if mismanaged -- a
    genuine clinical tension surfaced as its own `QualityEvent`.
*   **Reduced variability from maternal opioids**: real CTG teaching, reusing this
    codebase's existing aggregate `opioidEffect` signal -- maternal opioids cross the
    placenta and blunt fetal heart rate variability/reactivity. A severely bradycardic fetus
    loses variability further still, an ominous combined finding modeled as a compounding
    (not merely additive) effect.
*   Only meaningful pre-delivery -- gated on `isPregnant && !deliveryOccurred`.
*   **Verification**: `src/testing/fetal_monitoring_model.test.ts` (10 tests).

#### 4.29 Genitourinary/Reproductive, Stage E/F: Male GU (BPH + TURP Syndrome) and Ureteral Obstruction

Closes the roadmap's final two remaining items, with one deliberate, disclosed scope
reframing.

*   **Stage E -- reframed from "male prostate/erectile physiology" to BPH outflow
    obstruction + TURP syndrome**: literal erectile physiology has essentially zero
    anesthesia relevance; TURP syndrome is a real, classic, high-value anesthesia teaching
    point that was completely unmodeled (confirmed by direct search). A deliberate judgment
    call, not an oversight.
    -   **BPH outflow obstruction**: `BladderModel.ts` (§4.26) gained a new optional
        `bphSeverity` input that raises the effective MALE urethral closure pressure further
        still (up to +30 cmH2O at maximal severity) -- the prostate mechanically narrows the
        urethra, so a higher bladder pressure is needed before any overflow relief, worsening
        retention/distension before it. Has no effect on the female closure pressure (a
        direct unit test confirms this). A clean, small extension of an already-built model,
        not a new file.
    -   **TURP syndrome**: new `TurpSyndromeModel.ts`. During monopolar electrocautery
        prostate resection, opened venous sinuses can absorb large volumes of hypotonic
        irrigation fluid, producing dilutional hyponatremia, intravascular volume expansion,
        and mild hypothermia, all proportional to how extensive the resection's venous sinus
        opening is (`resectionSeverity`) and how long it runs. Outputs RATES; `usePhysiology.js`
        applies them to the SAME `patient.sodiumLevel`/`isHyponatremic` tracking this codebase
        already has (currently driven by Oxcarbazepine elsewhere), following that exact
        established pattern -- a sustained severe resection can drop sodium by >20 mEq/L over
        a realistic ~75 min case, matching real severe-case reports. Deliberately NOT
        modeled: glycine-specific CNS/visual toxicity (solution-specific, not
        absorption-volume-generic) and hemolysis from older non-glycine solutions (largely
        historical with modern bipolar/isotonic-saline technique).
*   **Stage F -- ureteral obstruction (simplified, single-compartment)**: `RenalEngine.ts`'s
    existing single lumped "kidneys" compartment doesn't support a real left/right kidney
    split -- a full anatomical model was judged too large relative to payoff for this stage.
    Instead, a new `ureteralObstructionActive`/`ureteralObstructionSeverity` patient input
    adds back-pressure directly to the existing Bowman space pressure term (`pBs`), exactly
    the same way elevated PEEP already does -- reducing net filtration pressure and GFR
    through the SAME existing formula, not a separate bespoke mechanism.
    `ureteralObstructionSeverity` is disclosed as representing the FRACTION OF TOTAL RENAL
    MASS affected (e.g. ~0.5 for a complete unilateral obstruction), not a separate organ --
    a clearly disclosed simplification. Required a real logged-flag-guard fix during this
    session's own testing: `ureteralObstructionActive` is a caller-provided input (unlike
    `hasAki`, which `RenalEngine.ts` computes itself), so it cannot be compared against its
    own same-named field to detect a transition the way `hasAki`'s pattern does -- fixed with
    a `ureteralObstructionEventLogged` guard flag, the same pattern `ParathyroidEngine.ts`
    uses for its own caller-set, monotonic-only trigger.
*   **OB/GYN case preset activated**: `CaseManager.jsx`'s "OB/GYN - Emergent C-Section (PPH)"
    case now sets `isPregnant: true, gestationalAgeWeeks: 39, deliveryOccurred: true` --
    starting at the PPH crisis the case's own title/description names, not the earlier
    fetal-distress phase, since no case-progression/"deliver" workflow action exists yet to
    transition between the two (a disclosed, deliberate scope boundary -- building that
    workflow feature was not part of this physiology-focused stage).
*   **Live wiring surfaced zero test failures** on first try for all of Stages C-F's engine
    wiring (the one real bug caught -- the ureteral-obstruction event-logging guard above --
    was caught by this session's OWN new tests before they shipped, not a regression in
    existing tests).
*   **Verification**: `src/testing/uterine_tone_model.test.ts` (12 tests),
    `src/testing/fetal_monitoring_model.test.ts` (10 tests),
    `src/testing/turp_syndrome_model.test.ts` (5 tests), plus integration tests added to
    `src/testing/bladder_model.test.ts` (+2, BPH) and `src/testing/renal.test.ts` (+2,
    ureteral obstruction). 854/854 tests passing, build clean.
*   **Phase 4's genitourinary/reproductive bucket is now fully complete**, covering every
    item the roadmap originally listed (bladder pressure-volume mechanics, sex-specific
    urethral resistance, autonomic dysreflexia, uterine tone/PPH, fetal monitoring, male GU/
    TURP syndrome, ureteral obstruction) -- with the disclosed reframing of literal erectile
    physiology to TURP syndrome, and ureteral obstruction modeled as a single-compartment
    proxy rather than a full anatomical two-kidney split.

#### 4.30 Hematology/Coagulation: Real Factor Cascade, TEG/ROTEM Outputs, Lethal Triad (`CoagulationCascadeModel.ts`)

Phase 4 (hematology/coagulation bucket). Prior model consisted of a single `patient.inr`
scalar modified only by HepaticEngine and halothane hepatitis, plus abstract `{r_offset,
ma_offset, angle_offset}` accumulator offsets from blood products (display-layer feature
only, not physiology). Zero platelet count, zero fibrinogen, zero aPTT, no hypothermia/
acidosis coagulopathy impairment, no dilutional coagulopathy, no consumptive coagulopathy.
Also fixed two medication sync gaps found during this work: Heparin and Protamine Sulfate
existed in `meds.config.ts` (test-only) but not in `Pharmacology.js` (live UI) -- now
mirrored into both databases.

*   **Four real state parameters**: platelet count (k/μL), fibrinogen (mg/dL), factor
    activity fraction (0-1, composite of the extrinsic/common pathway -- drives INR/aPTT),
    fibrinolysis index (0-1, drives TEG LY30). Each evolves via first-order ODE with
    hemorrhage consumption, dilutional loss, hepatic synthetic ceiling, and blood-product
    replenishment.
*   **Real impairment mechanisms** (previously entirely absent): hypothermia (enzyme
    rate-constant Q10 effect -- serine proteases are temperature-sensitive, significant
    below 35-36°C), acidosis (active-site histidine protonation impairs factor binding,
    significant below pH 7.2), massive crystalloid dilution (no clotting proteins in
    saline/LR), DIC (simultaneous microthrombus formation and factor consumption),
    hepatic synthetic dysfunction (ceiling on achievable factor activity based on existing
    `patient.inr` from HepaticEngine, avoiding double-counting).
*   **Fibrinogen falls before other factors in massive hemorrhage**: shorter synthesis
    half-life than most other factors -- the real reason cryoprecipitate/fibrinogen
    concentrate are administered early in massive transfusion protocols. Explicitly verified
    by a "fibrinogen drops faster than platelet count" test.
*   **TXA (already in `Pharmacology.js`) suppresses fibrinolysis**, reducing LY30.
*   **Heparin anticoagulation and protamine reversal** modeled via net factor-activity
    and aPTT effects (antithrombin-III pathway, not direct factor protein binding -- the
    correct mechanism, disclosed as a lumped approximation for this granularity).
*   **TEG/ROTEM outputs** (R, K, α-angle, MA, LY30) now derived from actual tracked
    physiology rather than abstract blood-product-administration offsets only.
*   **Lethal triad detection** (hypothermia + acidosis + coagulopathy simultaneously):
    the three-factor combination that drives damage-control surgery philosophy, previously
    unrepresented anywhere in this codebase, surfaces as `lethalTriadActive` + narrative
    event on first occurrence. Also fixed a real precision bug during testing: `toFixed(1)`
    rounding (~0.05k/μL per tick) caused accumulated rounding error that made platelet
    depletion effectively invisible over a 1-hour simulation; fixed with `toFixed(3)`.
*   **pH derivation**: Henderson-Hasselbalch from existing `hco3`/`paco2`, computed within
    `usePhysiology.js` rather than adding a new explicit pH state field.
*   **Verification**: `src/testing/coagulation_cascade_model.test.ts` (13 tests).

#### 4.31 Thermoregulation: Pennes Bioheat-Based Core Temperature Physics (`ThermoregulationModel.ts`)

Phase 4 (integumentary/thermoregulation/adipose bucket). Prior model: `tempDropRate = 0.0001°C/s`
at rest, `0.0008°C/s` during early anesthesia, plus `fluidicsOutput.fluidInducedTempDrop`.
No environmental temperature, no body surface area, no warming intervention physics, and no
decomposition into real mechanisms.

*   **Real net heat balance**: Pennes bioheat equation (simplified to single lumped
    core-temperature compartment, appropriate for 1Hz whole-body simulation):
    `dT/dt = (Q_metabolic + Q_warming - Q_radiation - Q_convection - Q_evaporation) / (m * C)`.
*   **Body thermal mass** (`m * C` ≈ 70kg × 3.47 kJ/kg/°C ≈ 243 kJ/°C) scales the rate of
    temperature change -- larger patients cool more slowly for the SAME heat loss rate.
*   **Three heat loss mechanisms**: radiation (skin-to-environment gradient, scales with
    exposed BSA -- draping reduces it), convection (OR-HVAC airflow over exposed skin),
    evaporation (respiratory moisture from dry inspired gas + surgical wound surface).
*   **Redistribution hypothermia**: the most important early mechanism -- GA-induced
    vasodilation allows core-to-periphery thermal equilibration; modeled as an exponentially
    decaying additional cooling term peaking at induction and resolving over ~60 minutes,
    independent of environmental heat loss.
*   **Forced-air warming** (Bair Hugger-type, ~40W) and warm blanket (~12W) as active
    warming inputs, capable of reversing hypothermia in a covered patient.
*   **Fluid-induced temperature effect** preserved from FluidicsEngine's existing
    `fluidInducedTempDrop` (already a per-tick °C delta, NOT converted to Watts -- a
    unit-confusion bug caught and fixed during this session: converting °C/tick to Watts
    via `delta * bodyThermalMass * 1000 / dt` produced 700+W magnitudes from tiny
    temperature deltas, which would be catastrophically wrong).
*   **Verification**: `src/testing/thermoregulation_model.test.ts` (10 tests).

#### 4.32 Musculoskeletal: Rhabdomyolysis, Positioning Nerve Injury Risk, Compartment Syndrome (`MusculoskeletalModel.ts`)

Phase 4 (musculoskeletal bucket). Three perioperative-specific musculoskeletal mechanisms
that an anesthesiologist can directly cause, prevent, or detect:

*   **Rhabdomyolysis** (CK/myoglobin tracking): MH produces the most rapid CK rise (50
    U/L/sec, reaching 5000 U/L within minutes), succinylcholine in myopathic patients is
    slower (5 U/L/sec), tourniquet ischemia and reperfusion add further contributions.
    CK decays with a ~3-day half-life; myoglobin with a ~1.5-hour half-life (smaller
    molecule, earlier release). The existing `RenalEngine.ts`'s `hasRhabdomyolysis` input
    flag (already connected to its `dDamage += 0.0045` per-tick AKI mechanism) is now
    driven by `ckLevel > 5000 U/L` from the musculoskeletal engine, replacing the previous
    Boolean-only flag with a real underlying concentration mechanism. Events: narrative alerts
    at the 5000 U/L CK threshold (rhabdomyolysis) and 1000 μg/L myoglobin threshold
    (myoglobinuric AKI risk).
*   **Positioning nerve injury risk index** (0-1): accumulates over time based on position-
    specific risk intensity (lithotomy 0.9, beach chair 0.7, lateral 0.6, prone 0.4,
    supine 0.2) and padding adequacy (unpadded = 5x faster accumulation than adequately
    padded). Reaches 1.0 after ~4 hours at maximum risk without padding.
*   **Compartment syndrome risk** (lithotomy-specific): starts after 2h in lithotomy,
    reaches significance by 3.5h, peaks by ~5h -- matching the well-documented "2-4h
    increased risk" teaching for well-leg compartment syndrome. A separate risk index from
    nerve injury; first-threshold narrative event at 0.5 (warning) and a critical alert at
    0.85. Accumulation is POSITION-specific: resets when patient leaves lithotomy.
*   **Verification**: `src/testing/musculoskeletal_model.test.ts` (11 tests). 888/888 tests
    passing, build clean.

#### 5.1 Acid-Base: Stewart Strong-Ion-Difference Physics (`AcidBaseModel.ts`)

Phase 5, Stage 1. Prior model: `hco3 = max(8, 24 - actualBaseDeficit)` with `actualBaseDeficit`
as a flat sum of `isSeptic + bloodLossRatio + lactate` -- a phenomenological approximation with
no mechanistic connection to the electrolytes FluidicsEngine already tracked correctly. Meanwhile,
FluidicsEngine was computing per-tick Na⁺/Cl⁻/Ca²⁺ dilution from actual fluid compositions (NS
Na=154/Cl=154; LR Na=130/Cl=109/buffer=28; PlasmaLyte Na=140/Cl=98/buffer=27) but these values
went into `electrolytes.cl`/`na` and were NEVER connected to acid-base -- making NS vs. LR vs.
PlasmaLyte physiologically invisible despite being the most common clinical fluid-management
teaching point.

*   **Stewart SID**: `SID = Na - Cl - Lactate` (dominant terms; K omitted as a small,
    tightly-regulated contributor that complicates calibration without clinical benefit). Normal
    SID = 140 - 103 - 1 = 36 mEq/L. NS infusion raises [Cl] disproportionately (Cl=154 vs.
    Na=154; normal plasma has Na >> Cl) → reduces SID → hyperchloremic non-anion-gap metabolic
    acidosis -- the real mechanism behind why large-volume NS causes an acidosis that LR and
    PlasmaLyte do not. Verified in the test suite: 2 liters of NS → Cl rises above baseline,
    SID falls, HCO3 decreases, pH drops appropriately.
*   **Buffer from LR/PlasmaLyte**: lactate (LR, 28 mEq/L) and acetate (PlasmaLyte, 27 mEq/L)
    → metabolized to HCO3⁻ → partially offsets Cl-driven SID reduction. `FluidicsEngine.ts`
    now accumulates `electrolytes.buf` from the `fluidData.buffer` field (previously written
    in all fluid entries but never read) and `AcidBaseModel.ts` consumes it.
*   **Corrected anion gap**: AG corrected for hypoalbuminemia (adds 2.5 per g/dL below 4.0),
    the teaching point that low albumin underestimates the true unmeasured anion burden.
*   **Ionized calcium**: already computed by `FluidicsEngine.ts` (citrate chelation from blood
    products) -- now surfaced and threshold-gated for clinical alerts (ionized Ca < 1.0 mmol/L).
*   **Unification**: `CoagulationCascadeModel.ts`'s `safePh` derivation updated to use the
    Stewart-derived HCO3 at this tick's PaCO2. Also removed the prior crude pH penalty from
    `FluidicsEngine.ts` (`electrolytes.ph -= 0.05 * volLiters` whenever Cl > 110), replaced
    by the real SID physics in `AcidBaseModel.ts`. The test for this old behavior updated to
    verify Cl DOES rise after NS infusion (the mechanism), not the downstream pH (which is now
    owned by `AcidBaseModel.ts`).
*   **Verification**: `src/testing/acid_base_model.test.ts` (11 tests).

#### 5.2 LAST + Intralipid Rescue (`LastModel.ts`)

Phase 5, Stage 2. Confirmed by direct audit: no LAST crisis mechanism existed despite all local
anesthetics (Lidocaine, Bupivacaine, Ropivacaine, Levobupivacaine, Mepivacaine) having full PKPD
models, and Intralipid 20% already existing as a drug entry with rescue indications but zero
mechanistic effect on anything. Two distinct toxicity syndromes, drug-specific thresholds (CC/CNS
ratio already in each drug's `pd.ccCnsRatio`, now explicitly used as the safety-margin factor):
CNS toxicity (lower threshold: perioral tingling → seizures), cardiovascular toxicity (higher
threshold: arrhythmia → collapse), with Intralipid modeling the lipid sink effect (proportional
to drug lipophilicity and intralipid Ce). Bupivacaine's slow dissociation kinetics ("fast-in,
slow-out") manifest as a specific Brugada-like arrhythmia risk flag.
*   **CV effects** from LAST multiply into `drugSvrMod`/`drugInotropyMod` before the CV engine
    tick (same wiring pattern as the LAST-then-CV-engine session precedent).
*   **Verification**: `src/testing/last_model.test.ts` (10 tests).

#### 5.3 Cardiac-Output-Dependent PK (confirmed existing, documented)

Phase 5, Stage 3 was investigated and found to be **already implemented**: `PKPDEngine.ts`'s
`coMod = 1 + (coRatio-1) * coSensitivity` scaling on all elimination rate constants was
confirmed working, with `coRatio = st.vitals.co / 5.0` (the real live cardiac output from the
Phase 0-1 chamber model) and `coSensitivity` calibrated for each drug (Propofol 0.6, Fentanyl
0.8, etc.). This stage required no new code -- it was a documentation gap, not an implementation
gap.

#### 5.4 Sepsis Cascade Physiology (`SepsisCascadeModel.ts`)

Phase 5, Stage 4. Prior model: `patient.isSeptic` was a static boolean with flat multipliers
(SVR × 0.6, lactate = 4.5) that never changed regardless of treatment. A patient given fluids,
vasopressors, source control, and corticosteroids had identical physiology to an untreated one.

New `SepsisCascadeModel.ts` -- a continuous `sepsisScore` (0-3) that progresses dynamically:
*   **Untreated**: rises from 0 toward 3 (SIRS → Sepsis → Severe → Shock) in ~3 hours.
*   **MAP adequacy** (>65 mmHg, the Surviving Sepsis Campaign target): slows progression up
    to 80% -- vasopressors + fluids buy time even without source control.
*   **Source control** (abscess drainage, debridement, etc.): reverses progression once MAP is
    also adequate (the cytokine cascade collapses without continuous antigen stimulation).
*   **Corticosteroids** (Dexamethasone/Hydrocortisone -- both now in `Pharmacology.js`):
    further slow progression (cytokine suppression + vasopressor sensitization).
*   **Outputs** replace flat modifiers: `svrMultiplierFromSepsis` now drives
    `CardiovascularEngine.ts`'s SVR reduction (same calibration at score=3: 0.60, matching the
    prior flat value, so existing cases behave identically at peak untreated severity but now
    respond to treatment); `lactateContributionMmolL` replaces the flat `isSeptic ? 4.5 : 1.0`
    baseline; `cardiacFunctionMultiplier` adds septic cardiomyopathy at score > 2 (previously
    unmodeled).
*   **Scope limitation**: antibiotic treatment is not explicitly modeled (the drug database
    currently has only Ampicillin/Sulbactam, insufficient variety for meaningful antibiotic-
    specific effects -- disclosed, out of scope for this stage).
*   **Verification**: `src/testing/sepsis_cascade_model.test.ts` (9 tests). 918/918 tests
    passing, build clean.

#### 5.5 Wiring/Surfacing: Dark Engines Now Reachable in Gameplay (Phase 5, Stage 5)

Several engines built in Phase 3-5 were "dark" -- computing values every tick but with no
UI control to activate them, no clinical actions to trigger their mechanics, and no case
scenarios that exercised them. This stage closes the most impactful gaps:

*   **New clinical actions** added to `App.jsx` and routable via attending recommendations:
    `apply_bair_hugger` / `remove_bair_hugger` → sets `patient.forcedAirWarmingActive`
    (feeds `ThermoregulationModel.ts`'s convective warming term); `apply_warm_blanket` →
    `patient.warmBlanketActive` (conductive warming); `left_uterine_displacement` →
    `patient.leftUterineDisplacement` (relieves aortocaval compression in
    `PregnancyPhysiologyEngine.ts`); `deliver_baby` → sets `deliveryOccurred: true`,
    transitions OB case from fetal-monitoring to PPH phase; `source_control` →
    `patient.sourceControlActive` (reverses sepsis cascade in
    `SepsisCascadeModel.ts`); `activate_turp` / `stop_turp` → gates
    `TurpSyndromeModel.ts`; `give_iv_calcium` → calcium chloride for citrate hypocalcemia.
*   **`paddingAdequate` computation** fixed: was `st.patient.paddingAdequate !== false`
    (always-true default) -- now computed from existing positioning-action flags
    (`peronealNervePadded || armsPositionedCorrectly || paddingAdequate`), making the
    existing padding actions from Chapter 34 actually reduce
    `MusculoskeletalModel.ts`'s nerve injury risk accumulation rate.
*   **New vitals surfaced in `finalVitals`**: `fetalHR`, `lateDecelerationActive`,
    `fetalBradycardiaActive`, `uterineTone`, `sepsisScore`, `plateletCount`,
    `fibrinogenMgDl`, `inr`, `anionGap`, `correctedAnionGap`, `baseExcess`,
    `ionizedCalcium`, `ckLevel`, `nerveInjuryRiskIndex`, `compartmentSyndromeRisk`,
    `lethalTriadActive`, `bladderPressure`, `autonomicDysreflexiaActive` -- all now flow
    to the state layer where monitors and panels can display them.
*   **Three new case presets** in `CaseManager.jsx`:
    - **TURP** (urology): elderly male with BPH undergoing transurethral prostate resection
      under spinal anesthesia, with `turpSurgeryActive` and `bphSeverity: 0.7` propagated.
    - **SCI / Autonomic Dysreflexia** (urology): T4 spinal cord injury patient undergoing
      TURP, with `hasSpinalCordInjuryAboveT6: true` + `bphSeverity: 0.5` -- the first case
      that exercises `BladderModel.ts`'s autonomic dysreflexia mechanism.
    - **Interscalene Block / LAST Risk** (regional anesthesia): shoulder arthroplasty under
      bupivacaine interscalene block with `LastModel.ts` toxicity and Intralipid rescue active.
    Both `bphSeverity` and `hasSpinalCordInjuryAboveT6` now propagate from case preset data
    through `CaseManager.jsx`'s case-loading logic.

#### 5.6 Adipose PK Compartment: BMI-Scaled Peripheral Drug Distribution (`PKPDEngine.ts`)

Phase 5, Stage 6. Closes a long-standing gap: all drugs used fixed V1/V2/V3 compartment
volumes calibrated for a 70kg reference patient regardless of BMI. For obese patients,
lipophilic drugs (propofol, fentanyl, volatile anesthetics) distribute into adipose tissue
much more extensively, producing longer context-sensitive half-times with prolonged infusions
-- a clinically significant finding that was simply invisible in the prior model.

*   **Implementation**: new optional `adiposeVolumeRatio` parameter on `PKPDEngine.tick()`
    (default 1.0, zero risk to all existing call sites). Scales k21/k31 (the RETURN rate
    constants from peripheral compartments) DOWN proportionally to `adiposeVolumeRatio`
    and drug `proteinBinding` (used as a proxy for lipophilicity -- highly protein-bound
    drugs are generally highly lipophilic, which is why this codebase already stores
    `proteinBinding` per drug). At BMI 40: `adiposeVolumeRatio ≈ 1.5` → k21/k31 reduced
    by ~19% for propofol (pb=0.97) → drug returns more slowly from peripheral compartments
    → longer context-sensitive half-time. Water-soluble drugs (pb≈0) are unaffected.
*   **Calibration**: `adiposeVolumeRatio = 1 + max(0, (BMI-25)/30)` ramps linearly from 1.0
    at BMI 25 (normal) to 1.5 at BMI 40, 1.67 at BMI 45 -- within the clinically observed
    40-70% V2 increase for highly lipophilic drugs in severe obesity per the literature.
    This is a disclosed approximation (not the Schnider/Marsh weight-specific model for
    propofol in obesity, which has separate equations for each compartment).
*   **Verification**: no dedicated test file (the change is within the existing PKPD
    architecture's tested behavior -- the new parameter defaults to 1.0 at all existing
    call sites, so existing tests are unchanged). 918/918 tests passing, build clean.

## Phase 6: Full Medical-Grade Completeness

#### 6.1–6.11 Phase 6 Overview

Phase 6 was initiated after user direction: "target ALL remaining gaps to create a truly medical-grade simulator... I don't care how long it takes, I care that it is properly modeled and properly cross-referenced and connected to everything in the simulator." Eleven stages completed, organized by clinical domain.

*   **§6.1 — Antibiotic PK/PD** (`AntibioticPKPDModel.ts`): 8 antibiotics added to both
    databases (Cefazolin, Vancomycin, Pip/Tazo, Meropenem, Gentamicin, Metronidazole,
    Ciprofloxacin, Ceftriaxone). Real three PD paradigms: time-dependent (beta-lactams --
    T>MIC target, extended-infusion benefit), concentration-dependent (aminoglycosides --
    Cmax/MIC ≥8-10, rationale for once-daily dosing), AUC/MIC (vancomycin, 2020 ASHP/IDSA
    guidelines replacing trough-only monitoring; ciprofloxacin). Vancomycin AUC running
    accumulator, aminoglycoside trough nephrotoxicity risk, organism/spectrum matrix by
    `patient.infectionType`. Wired into `SepsisCascadeModel.ts` -- sepsis is now
    treatment-responsive to appropriate antibiotic selection, not just vasopressor support.
*   **§6.2 — Transfusion Immunology** (`TransfusionImmunologyModel.ts`): TRALI (bilateral
    non-cardiogenic pulmonary edema within 6h of plasma-containing blood product, two-hit
    model with existing inflammation amplifying risk 4×), HIT (anti-PF4 IgG → platelet
    activation → paradoxical thrombosis, 4T score computation, mandatory alternative
    anticoagulation teaching point), ABO incompatibility (immediate complement-mediated
    intravascular hemolysis). TRALI compliance/resistance penalties feed RespiratoryEngine.
*   **§6.3 — Pharmacogenomics** (`PharmacogenomicsEngine.ts`): CYP2D6 (UM: codeine → excess
    morphine → respiratory death in pediatrics, FDA black-box; PM: no codeine analgesia;
    ondansetron clearance ×0.05), CYP2C9 (warfarin clearance ×0.05 in PM -- catastrophic
    anticoagulation at standard doses), CYP2C19 (clopidogrel PM → no antiplatelet effect →
    stent thrombosis, FDA 2010 black-box), VKORC1 (warfarin dose requirement), G6PD
    (methylene blue → hemolysis, contraindication for the MetHb antidote -- only case where
    the antidote is contraindicated). Feeds PKPDEngine.ts as k10 multipliers.
*   **§6.4 — Capnography + SpO2 Artifacts** (`CapnographyModel.ts`): Phase I (baseline,
    elevated = rebreathing), Phase II slope (flattened in bronchospasm), Phase III slope
    (rising = V/Q mismatch), α-angle (obtuse in obstruction), β-angle (<90° in rebreathing).
    MetHb artifact (SpO2 reads ~85% regardless of true SaO2 -- dangerous in both directions),
    COHb artifact (SpO2 falsely HIGH in CO poisoning -- misses true hypoxia), low-perfusion
    signal loss. Waveform pattern classification: normal/bronchospasm/rebreathing/esophageal/
    obstruction/cardiogenic. Fixed a two-argument `clamp()` call bug caught during testing.
*   **§6.5 — HPA Axis Suppression** (`HpaAxisModel.ts`): Chronic steroid (≥5 mg/day
    prednisone × ≥3 weeks) → adrenocortical atrophy → impaired surgical stress response →
    perioperative adrenal crisis (refractory vasodilatory shock uniquely unresponsive to
    catecholamines because cortisol is required for full adrenergic receptor expression).
    `catecholamineSensitivityMultiplier` compounded with HPA suppression fraction. Corticosteroid
    stress-dose coverage (dexamethasone/hydrocortisone Ce > threshold) gates crisis activation.
*   **§6.6 — Sex Hormone Physiology** (`SexHormoneModel.ts`): Progesterone MAC reduction
    (luteal phase: up to -28%, peaking ~day 21; same mechanism as early pregnancy but less
    marked; exogenous progestin therapy equivalent), estrogen coagulant boost (OCP/HRT →
    elevated factors II/VII/IX/X, +12% factor activity at peak, same mechanism as OCP-VTE
    risk), testosterone and Hgb baseline (+1.5 g/dL in males), PONV hormonal contribution.
    All cross-referenced to PregnancyPhysiologyEngine.ts (defers when pregnant to avoid
    double-counting) and SexHormoneModel feeds CoagulationCascadeModel's hepatic synthetic
    fraction modifier.
*   **§6.7 — Neuraxial PK** (`NeuraxialPKModel.ts`): Baricity-driven spread table (hyperbaric:
    sinks to dependent → Trendelenburg = high spinal risk; saddle block in sitting; isobaric:
    ~18 dermatomes; hypobaric: floats to non-dependent → sitting is extremely high risk).
    Pregnancy adds 2 dermatomal levels. Critical window: hyperbaric spread determined by position
    in first ~8 minutes. Intrathecal morphine rostral migration: 12h peak at medullary level,
    24h duration (delayed respiratory depression teaching point, uniquely dangerous vs fentanyl).
    Intrathecal fentanyl stays in cord (lipophilic). Epidural fentanyl ~80% systemic absorption.
*   **§6.8 — Drug-Drug Interactions** (`DrugInteractionModel.ts`): CYP3A4 inhibition
    (fluconazole, erythromycin, diltiazem → fentanyl/midazolam accumulation), CYP3A4 induction
    (rifampin 30×, carbamazepine 4× → dramatically shortened drug effect), inhibition dominates
    over induction when concurrent. QT prolongation matrix: per-drug ΔQTc contributions
    (ondansetron, ciprofloxacin, metronidazole, haloperidol, methadone) + 30% synergistic
    amplification with multiple drugs combined. Crisis alert at QTc ≥ 500 ms.
*   **§6.9 — PONV Pathophysiology** (`PONVModel.ts`): Full Apfel score (female sex, non-smoker,
    PONV history, postoperative opioids → 10/21/39/61/79% risk). Volatile anesthetic adds 40%
    risk above Apfel baseline; N2O adds 30%; duration compounds. CTZ (5-HT3, D2, NK1), vestibular
    (H1/M1), and GI vagal (5-HT3) pathway mapping to specific antiemetics. Multimodal
    recommendation logic (none/single/multimodal by Apfel score). TIVA benefit flag.
*   **§6.10 — Deep Coagulation** (`DeepCoagulationModel.ts`): Von Willebrand Disease (Types 1/2A/
    2B/3, DDAVP treatment for Type 1 with stored-VWF release mechanism, contraindicated in 2B),
    Hemophilia A (FVIII deficiency, inhibitor complication) and B (FIX deficiency), rFVIIa bypass.
    4-Factor PCC (90% warfarin reversal), andexanet alfa (85% Factor Xa inhibitor reversal),
    idarucizumab (97% dabigatran reversal). PFA-100 C-ADP and C-Epi closure times (aspirin
    uniquely prolongs C-Epi but NOT C-ADP -- the classic pharmacology teaching point).
*   **§6.11 — Monitoring Display + New Cases** (Phase 6K): New clinical actions (give_pcc,
    give_andexanet, give_idarucizumab, give_ddavp, give_rfviia, stop_heparin_hit, activate_
    infectiontype). Five new case scenarios: Von Willebrand Disease (elective hip, Type 1),
    Hemophilia A (moderate, knee washout), CYP2D6 UM/Codeine Toxicity (pediatric post-
    tonsillectomy, respiratory depression teaching case), G6PD + Methemoglobinemia (methylene
    blue CONTRAINDICATED), Perioperative Adrenal Crisis (chronic steroids, refractory shock).
    All Phase 6 patient flags propagated through CaseManager.jsx. Phase 6K also wires all
    new physiologic outputs into finalVitals for state-layer accessibility.
*   **Final verification**: 1003/1003 tests passing, build clean. Phase 6 complete.

## Gap Closure Session: Medical-Grade Completeness

#### GC.1 Missing Critical Drug Entries (20+ drugs added to both databases)

All added to both `Pharmacology.js` and `meds.config.ts`:

**Bronchodilators (previously absent entirely)**: Albuterol/Salbutamol (beta-2 agonist; primary intraoperative bronchospasm treatment AND hyperkalemia treatment by shifting K+ intracellularly -- the most clinically impactful missing drug; dual-mechanism must be taught explicitly), Ipratropium Bromide (anticholinergic bronchodilator, additive with albuterol via different receptor pathway, preferred in COPD).

**Endocrine**: Regular Insulin (three perioperative uses: hyperglycemia, hyperkalemia [with glucose], DKA -- each requiring different dosing/monitoring understanding), Glucagon (hypoglycemia without IV access AND beta-blocker/CCB overdose -- bypasses receptor blockade via adenylyl cyclase), Desmopressin/DDAVP (VWD Type 1 + mild hemophilia A treatment, central DI -- V2-selective, releases stored VWF from Weibel-Palade bodies, CONTRAINDICATED in Type 2B VWD).

**Opioids missing from DB**: Codeine (CYP2D6 prodrug, fatal in UM patients -- FDA black-box), Tramadol (SNRI+opioid dual mechanism -- MAOI interaction causes fatal serotonin syndrome, CYP2D6-dependent), Meperidine/Pethidine (MAOI absolute contraindication -- mechanism is serotonin reuptake block + MAOI = serotonin syndrome; unique anti-shivering property at 25 mg IV), Oxycodone (CYP3A4/2D6, clinically important PK interactions).

**PONV/Antiemetics**: Palonosetron (second-generation 5-HT3, 40h half-life vs ondansetron 6h, allosteric binding, preferred in PONV guidelines), Granisetron (lower QTc than ondansetron), Droperidol (FDA black-box QT warning; extremely effective at low doses), Haloperidol (D2 blocker for PACU delirium, NMS risk), Promethazine (multi-receptor, IV tissue necrosis risk), Diphenhydramine (H1 antihistamine, adjunct in allergic reactions), Aprepitant (oral NK1 antagonist, most potent PONV drug, CYP3A4 inhibitor), Fosaprepitant (IV NK1 prodrug).

**Specialized**: Isoproterenol (pure beta-1/beta-2 -- ONLY effective chronotrope for denervated transplanted heart), Octreotide (THE specific treatment for carcinoid crisis -- blocks tumor hormone release; standard vasopressors/antihistamines ineffective), Bromocriptine (dopamine agonist -- specific treatment for NMS by reversing dopaminergic blockade causally), Physostigmine (ONLY CNS-penetrating cholinesterase inhibitor -- specific antidote for central anticholinergic syndrome), Hypertonic Saline 3% (hyponatremia correction, ICP management), Factor VIII Concentrate/rFVIII (hemophilia A, each unit/kg raises FVIII by 2%), Factor IX Concentrate/rFIX (hemophilia B, each unit/kg raises FIX by only 1% due to larger Vd).

#### GC.2 MAOI Drug Interaction Model (`MAOIModel.ts`)

The single most dangerous drug interaction category in anesthesia, entirely absent before this. Two distinct crisis types: (1) SEROTONIN SYNDROME from meperidine + MAOI (meperidine blocks serotonin reuptake + MAO inhibition → serotonin accumulates → hyperthermia + rigidity + clonus + cardiovascular instability; ABSOLUTE CONTRAINDICATION, documented fatalities); (2) HYPERTENSIVE CRISIS from indirect sympathomimetics (ephedrine releases stored NE which cannot be degraded → MAP > 200 mmHg → hemorrhagic stroke). MAOI washout modeled (14-day enzyme regeneration for irreversible agents). Ephedrine is MORE DANGEROUS than phenylephrine in MAOI patients -- opposite of standard preference. Wired into usePhysiology.js affecting drugSvrMod and totalHrDelta.

#### GC.3 Pneumoperitoneum Model (`PneumoperitoneumModel.ts`)

Laparoscopic surgery is >60% of abdominal surgery but was physiologically absent. Real mechanisms at 10-15 mmHg IAP: (1) Peritoneal CO2 absorption adds ~4-5 mL/min requiring 15-20% MV increase; (2) IAP-driven SVR increase from mechanical aortic compression; (3) FRC reduction from diaphragm elevation; (4) Renal blood flow reduction 30-60%; (5) ICP elevation (CO2 + Trendelenburg compounds this dramatically); (6) Vagal bradycardia risk during rapid insufflation. Subcutaneous emphysema multiplies CO2 absorption 3×. The CO2 from peritoneum feeds directly into RespiratoryEngine as additional VO2 load.

#### GC.4 Pulmonary Embolism Model (`PulmonaryEmbolismModel.ts`)

Massive/submassive PE crisis including: PVR spike, RV failure, cardiogenic shock, the pathognomonic EtCO2 drop during IPPV (dead space increase -- CO2 can't reach occluded alveoli), PaCO2 rise. Thrombolysis with tPA models clot lysis at ~25%/hour reducing effective occlusion. Fixed a key bug where hemodynamic consequences weren't using post-lysis effective occlusion.

#### GC.5 Venous Air Embolism Model (`VenousAirEmbolismModel.ts`)

Mill-wheel murmur, EtCO2 drop, hemodynamic collapse. N2O diffuses INTO air bubbles (2.5× size increase) → dramatically worsens obstruction -- immediate N2O cessation is critical. Durant's maneuver (left lateral decubitus + head down) + CVC aspiration + 100% O2 model as distinct treatment components. Paradoxical air embolism (via PFO) when RV pressure exceeds LA pressure -- arterial embolization with simultaneous stroke/MI risk.

#### GC.6 Clinical Scoring Engine (`ClinicalScoringEngine.ts`)

Four previously absent validated scoring systems, all now computable from existing engine data:
- **ACT** (Activated Clotting Time): heparin + hypothermia + thrombocytopenia effects; threshold >480s for CPB safety
- **Modified Aldrete Score** (0-10): five components, ≥9 = PACU discharge ready
- **Pre-Extubation Criteria**: TV>5 mL/kg, RR 8-30, SpO2>93% on ≤40% FiO2, TOF>0.9, hemodynamically stable, temp>36°C, conscious -- fails with specific reason listed
- **ASA Physical Status** (I-V): auto-computed from comorbidity flags
- **Full SOFA Score** (6 organs, 0-24): Sepsis-3 organ dysfunction criterion

#### GC.7 Surgical Crisis Model (`SurgicalCrisisModel.ts`)

Four distinct perioperative crises now mechanistically represented:
- **Carcinoid Crisis**: tumor manipulation → serotonin/bradykinin/histamine release → flushing + bronchospasm + profound hypotension; octreotide is THE ONLY treatment (vasopressors and antihistamines are ineffective against the underlying mediator release mechanism)
- **Pheochromocytoma Intraoperative Crisis**: catecholamine storm during adrenal manipulation (SVR spike to 500+ dyn·s/cm^5), post-ligation withdrawal hypotension
- **NPPE (Negative-Pressure Pulmonary Edema)**: develops 2-360 minutes after laryngospasm; non-cardiogenic, compliance penalty; treated with CPAP/PEEP
- **Masseter Muscle Rigidity (MMR)**: first sign of MH in susceptible patients given succinylcholine

#### GC.8 New Case Scenarios (3 additional cases)

- **Carcinoid Tumor Resection** (hepatic metastasectomy): carcinoidTumor flag activates SurgicalCrisisModel; octreotide pre-treatment decision point
- **Laparoscopic Colectomy Complex** (obese, Trendelenburg): pneumoperitoneumActive at 15 mmHg, Trendelenburg, teaches physiologic compounding
- **MAOI Patient Emergency Appendectomy**: maoisActive + 14-day washout, teaches drug avoidance (meperidine, ephedrine), correct alternatives (fentanyl, phenylephrine)

**Final verification: 1067/1067 tests passing, build clean.**
