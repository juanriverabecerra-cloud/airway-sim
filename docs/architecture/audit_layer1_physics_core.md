# Audit Initiative — Layer 1: Deterministic, Headless, Property-Tested Physics Core

> This is an **audit/architecture initiative**, not a chapter-integration session. It does not
> follow the chapter closing-report convention. It DOES touch the engine tick loop, and (Layer 1A
> only) reaches into individual engine files, but never `src/knowledge/`.
>
> Read this doc at the start of every audit session. It is the durable plan; `walkthrough.md` holds
> only the current session's scratch notes. The initiative spans Layers 1–6 (see the root ask); this
> file covers **Layer 1** and will be joined by `audit_layer2_*.md` … as each layer starts.

## Why Layer 1 exists (the problem)

The simulator's physics live in a single ~6,700-line `setInterval` callback inside the React hook
`usePhysiology.js` (`src/engine/usePhysiology.js`, per-step body ≈ lines 1791–8478). It calls **78
distinct engine `.tick()` functions** and mutates a plain state object `st = stateRef.current`,
flushing to React once after the step loop (≈ lines 8486–8491).

Two structural facts block any serious audit:

1. **It cannot run headless.** The physics are welded to React state via `setInterval` in a
   `useEffect`. Nothing can drive the *integrated* tick outside a browser, so:
   - The 1,741 existing tests all exercise engines **in isolation**; the bugs that live at the
     *seams* between the 78 engines (double-counting, unit mismatch at a boundary, ordering, NaN
     propagation) are untested.
   - `FidelityOracle.evaluateFidelity()` (a strong rule-based invariant checker) is only ever fed
     **hand-crafted** states in `oracle.test.ts`. It has never audited a real running trajectory.
   - `FidelityFuzzer` generates clinical action sequences but nothing runs them against the real
     physics + the oracle. **The fuzzer→physics→oracle loop is open.**

2. **It is nondeterministic.** The step body calls `Math.random()` in ~20 places (stochastic
   complication rolls: PRIS, seizures, penicillin anaphylaxis, halothane hepatitis, airway fire,
   mucus plug, adrenal suppression, emergence delirium, opioid rigidity/pruritus, naloxone surge,
   …) and **17 engine files** call `Math.random()` internally. Consequences:
   - No run can be **replayed** → a reported bug cannot be reproduced by QA; two trainees get
     different complication rolls on the "same" case (a real content/fairness problem for a
     commercial trainer).
   - No **golden-master / regression fixture** can be stable, so we cannot lock behavior before
     refactoring — the single most important safety net for Layers 2–6.

## Target architecture

```
                    ┌────────────────────────────────────────────┐
   React hook  ───► │  runPhysicsStep(ctx)   (module scope,       │
   (view/driver)    │     src/engine/usePhysiology.js)            │
   injects React-   │  • byte-identical physics body              │
   backed ctx       │  • all 78 engine imports in scope for free  │ ◄─── Headless harness
                    │  • reads/writes ctx.stateRef.current         │      injects plain-object
                    │  • side effects via ctx.{logEvent,setX,rng}  │      ctx (no React)
                    └────────────────────────────────────────────┘
```

The physics core becomes a **pure-ish, dependency-injected** function. "Pure-ish" = it mutates the
passed-in `stateRef.current` and emits side effects only through injected callbacks; given the same
state + same `ctx` (including a seeded `rng`) it produces the same next state every time.

### The `ctx` dependency contract (the seam)

Everything the step body closes over that is **not** a module-level import. Bound to real
React-backed objects in the hook; bound to plain-object equivalents in the harness.

| ctx field | Hook binding | Headless binding |
|---|---|---|
| `stateRef` | the hook's `useRef` | `{ current: state }` |
| `ventSettings`, `gasSettings` | props | fields on the seed |
| `logEvent` | prop (narrative log) | push to `events[]` |
| `logQualityEvent` | hook helper | push to `qualityEvents[]` / apply to state |
| `setVitals`, `setElectrolytes`, `setCoags`, `setTotalBodyWaterLiters`, `setIntravascularVolume`, `setSurgicalPhase` | the synchronous wrapper setters (they already write `stateRef.current`) | write straight to the state object |
| `setIsRunning` | prop (fast-forward safety halt) | set a flag |
| `ffRemainingRef`, `ffTotalRef` | `useRef`s | plain `{ current }` |
| **`rng`** *(new, Layer 1A)* | seeded from `state.rngSeed` (falls back to `Math.random`) | seeded deterministic PRNG |

Module-level symbols (all 78 engines, `MEDICATIONS`, `resolveDosingWeight`, `extractTextbookRules`,
`createQualityEvent`, `HERBAL_MEDICINES`, …) stay imported in `usePhysiology.js`, so keeping
`runPhysicsStep` **in the same module** means zero import duplication.

### Edge cases the extraction must preserve (verified during recon)

- **Early `return`s** in the body (e.g. the empty-vitals guard) currently abort the *whole* interval
  callback, skipping the React flush. After extraction, `runPhysicsStep` must return a
  `{ skipped: true }` sentinel and the hook must `return` (skip flush) to match.
- **No bare hook-snapshot closures**: recon found the body reads state via `st.*` / `finalX`, not
  the stale hook consts (`patient`, `vitals`, …) — with a couple of code references to verify
  (`electrolytes` near the K+-shift logic ≈ line 2998). Any real bare read must be added to `ctx`.
- **`break`/`continue`** inside the body target their own inner loops only; the `catch { …; break; }`
  that targets the outer `for (step…)` loop stays in the hook wrapper, not in `runPhysicsStep`.
- `Date.now()` at ≈ line 211 is a display timestamp on a fluidics event — replace with sim `time`
  for determinism (low stakes).

## Phased plan

**Layer 1A — Determinism (prerequisite).**
- Add `src/engine/rng.ts`: a seedable PRNG (`mulberry32`) exposing `Rng = () => number` in `[0,1)`,
  plus `makeRng(seed)` and a `defaultRng = Math.random`.
- Store `rngSeed` (and a running `rngState`) in sim state; the hook derives its `rng` from it.
- Replace every `Math.random()` in the tick body with an injected `rng()`.
- Give every engine `.tick()` that rolls dice an `rng` input (defaulting to `Math.random` so
  production behavior is statistically unchanged and existing tests keep passing); pass the seeded
  `rng` from the hook's call sites.
- **Verify:** `npx vitest run` + `npx vite build` green. Add a determinism test: same seed + same
  action script ⇒ identical trajectory; different seed ⇒ (generally) different.

**Layer 1B — Extraction + safety net.**
- Extract `runPhysicsStep(ctx)` (module scope) — byte-identical body, `ctx` destructured at top.
- Rewire the hook's `for (step…)` loop to call it; preserve the `skipped` sentinel semantics.
- One-time **equivalence proof**: characterize the *real* hook (add `happy-dom` +
  `@testing-library/react`, fake timers) over a fixed scenario, record its trajectory, then assert
  the headless `runPhysicsStep` path reproduces it bit-for-bit. This justifies the refactor; after
  it passes once it can be kept as a slow "characterization" test or retired.
- Record the fast **headless golden-master** trajectory fixture(s) — the regression net for L2–6.
- **Verify:** full suite + build green; equivalence + golden-master green.

**Layer 1C — Closed-loop property harness (the actual Layer 1 deliverable).**
- Headless `simulate(seedState, actions, opts)` that steps `runPhysicsStep` and, every tick, runs
  `evaluateFidelity(state, history)`; **fail on any `CRITICAL` anomaly**.
- Drive it with `FidelityFuzzer.getGuidedFuzzAction` across N seeds × M random walks × K ticks
  (seeded ⇒ any failure is reproducible from its seed). This is metamorphic/property testing and is
  where cross-engine coding bugs surface.
- **Verify:** harness green (or triage real anomalies it uncovers).

## Verification checklist (every audit session ends with)
- [ ] `npx vitest run` green
- [ ] `npx vite build` green (pre-existing chunk-size warning is expected/unrelated)
- [ ] Determinism: fixed seed ⇒ identical trajectory
- [ ] Golden-master fixtures unchanged (or intentionally re-blessed with rationale)
- [ ] Layer status updated in this doc + `walkthrough.md`

## Status log
- 2026-07-30 — Recon complete. Tick body = lines 1791–8478 of `usePhysiology.js`; 78 engines;
  DI-seam extraction validated as feasible; **nondeterminism identified as the gating issue** →
  Layer 1A (seeded RNG) inserted ahead of extraction. Design doc written.
- 2026-07-30 — **Layer 1A core landed and verified (1750/1750 tests, build green).**
  - `src/engine/rng.ts` — counter-based splitmix32 (`makeRng`/`seedRngState`/`ensureRng`), serializable,
    unit-tested in `src/testing/rng.test.ts` (7 tests).
  - Tick body: 19 `Math.random()` → seeded `rng()`; RNG state stored on `st.patient.rng`, pinned onto
    `finalPatient` so it survives the flush→render→`stateRef`-rebuild cycle.
  - 8 tick engines threaded with an injected `rng` (default `Math.random`): Cardiovascular (incl. the
    `deliverShock` ROSC roll), Hepatic, Renal, Pain, Preeclampsia, SickleCell, MultipleAnaphylaxis,
    SpecialSurgery — plus the barbiturate-precipitation roll in the `processMed` handler.
  - **Finding (→ Layer 5):** `vite build` does NOT type-check (esbuild/rolldown strips types); it
    missed an out-of-scope `rng` in `deliverShock` that only the runtime tests caught. This repo has
    no `tsc --noEmit` gate — add one in Layer 5.
  - **Remaining Layer 1A (non-blocking for the vitals golden master):** 6 waveform/display models
    (Ekg/Pleth/ArterialLine/EtCo2/Vent/WaveformDatabase — do not feed vitals) for full *display*
    determinism; `FidelityFuzzer.js` RNG (needed for deterministic fuzzing → do in 1C);
    `ProceduralEngine.js`; and adding `rng` to `createSnapshot`/`restoreSnapshot` for replay across
    snapshot/restore. `Date.now()` display timestamp (≈ line 211) still to swap for sim `time`.
  - Next: **Layer 1B** — extract `runPhysicsStep(ctx)` and stand up the headless golden master.
- 2026-07-31 — **Layer 1B core extraction landed and validated.**
  - `runPhysicsStep(__ctx)` is now a module-scope exported function in `usePhysiology.js` (body moved
    verbatim, lines 1794–8496 of the pre-extraction file). Done via an assert-guarded Node script
    (`scratchpad/extract_step.mjs`), not by hand.
  - **ctx contract (15 fields), confirmed empirically:** `stateRef, ventSettings, gasSettings,
    logEvent, logQualityEvent, setVitals, setElectrolytes, setCoags, setTotalBodyWaterLiters,
    setIntravascularVolume, setSurgicalPhase, setIsRunning, ffRemainingRef, ffTotalRef, electrolytes`.
    `electrolytes` was the only non-obvious one (the body reads/mutates the bare hook snapshot in 29
    places, distinct from `st.electrolytes`).
  - Exactly **one** top-level early return (empty-vitals guard) → returns `{skipped:true}`; the hook
    wrapper `return`s to skip the flush, matching original semantics.
  - **Free-variable safety net = ESLint `no-undef`** (js.configs.recommended). It caught the one thing
    the manual grep missed and, in doing so, **found a real latent bug**: `clamp` was called at 4
    bronchodilator sites but never defined anywhere — a `ReferenceError` the tick's try/catch
    swallowed as "Physics Engine Tick Failed" whenever Albuterol/Ipratropium/Ketamine/Magnesium was
    given. Fixed with a module-scope `clamp` helper (deliberate bugfix, documented).
  - **Runtime validation:** `src/testing/headless_step_smoke.test.ts` — `runPhysicsStep` runs headless
    over 120 steps with no throw, keeps all vitals finite, is deterministic (same seed → identical
    trajectory), and advances the serializable RNG. (Seed is a hand-built healthy adult; the engines
    drive it to extremes because it is not yet a faithful init — that is the next step.)
  - Verification: `no-undef` 0 · `vite build` green · full suite **1753/1753** green.
  - **Next (Layer 1B finish):** extract `createInitialSimState(activeCase, ventSettings, gasSettings)`
    from the init `useEffect` for a faithful seed → record the headless golden-master fixture; then the
    one-time React characterization/equivalence proof. Then **Layer 1C** (fuzz→step→oracle loop).
- 2026-07-31 — **Layer 1B finished (golden master).**
  - Extracted `createInitialSimState(activeCase)` from the init `useEffect` (708-line body moved
    verbatim via `scratchpad/extract_init.mjs`, using local setter shims that collect into a result
    object — same trick as `runPhysicsStep`, zero body surgery). `no-undef` clean; the hook's init now
    calls it and distributes to the real setters.
  - Reusable headless harness: `src/testing/harness/headlessSim.ts`
    (`createHeadlessSim`/`stepN`/`makeHeadlessCtx` + a canonical `HEALTHY_CASE`).
  - Golden master `src/testing/golden_master.test.ts`: a healthy unmedicated adult stays
    physiologically stable for 300s (hr 73–75, map 89–100, spo2 99, bis 98, etco2 38–39, temp 37) —
    proving the faithful seed + drift-free integration — is deterministic, and is frozen as a
    `toMatchSnapshot` regression fixture.
  - Verification: `no-undef` 0 · build green · full suite **1755/1755** green.
  - The React characterization/equivalence proof (happy-dom) remains a tracked rigor item; the
    by-construction extraction + no-undef + stable deterministic golden master already give strong
    evidence. **Next: Layer 1C** (fuzz→step→oracle loop) — also a heavy runtime stress of the extraction.
- 2026-07-31 — **Layer 1C closed loop built (oracle vs. live physics).**
  - `runWithOracle()` in the harness audits every tick of the real running physics with
    `FidelityOracle.evaluateFidelity`. Test `src/testing/oracle_vs_physics_ch1c.test.ts` runs 6 cases
    (healthy + septic/obese/cardiac/copd) × 3 seeds for 240–300s each: **zero CRITICAL** anomalies.
  - The oracle had never audited a live trajectory before; on first contact it surfaced real issues
    (see `audit_findings.md`): **F3** oracle Ohm's-law omitted CVP (fixed), **F4** CRITICAL tolerances
    calibrated on exact hand-crafted states, too tight for live dither/rounding (fixed + two-tier
    severity), **F5** a real ~12–17 mmHg **MAP-CO-SVR coupling drift** in comorbid patients (disease
    MAP modifiers applied directly to MAP, not via SVR) — now a tracked WARNING + regression test,
    deferred to **Layer 2**.
  - Verification: full suite **1772/1772** green; oracle unit tests still catch gross decoupling.
  - **Remaining for Layer 1C:** action-driven perturbation fuzzing (needs `processMed`/`pushMed`/
    `pushFluid` extracted like `runPhysicsStep`) + seeding `FidelityFuzzer`'s RNG; widen `AUDIT_CASES`
    to the full preset bank. Enhancements; the closed loop itself works. Plus the happy-dom equivalence proof.
