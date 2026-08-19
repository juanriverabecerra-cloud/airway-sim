# Audit — Layer 5: Tooling & Structural Integrity

**Scope.** The non-physiology substrate: does the codebase have the *tooling* to keep itself correct, and
is it *structurally* sound? Where L1-L4 audited behavior, L5 audits the scaffolding — type-checking,
linting, CI, dependency hygiene, dead code, duplicate/inconsistent data, and the invariants the project's
own conventions (CLAUDE.md) declare (e.g. the two medication DBs staying in sync).

**Method.** Establish the missing gates (type-check, lint coverage, CI), run them, then triage the results:
fix genuine defects (type errors frequently reveal real bugs — the F2 out-of-scope var was one), and
configure/justify the rest. Structural scans for duplicate keys, DB drift, and dead signals. Findings
continue the shared `F##` sequence.

**Entry-state audit (measured):**
- **No `tsconfig.json`, TypeScript not a dependency** → the 327 `.ts` engine files have NEVER been
  type-checked (`npx tsc` earlier loaded 0 source files — a vacuous pass). This IS F6.
- **`build` = `vite build`** (esbuild transpiles without type-checking) — no type gate.
- **ESLint covers only `**/*.{js,jsx}`** (325 problems: 309 errors, 16 warnings); the `.ts`/`.tsx` files
  are entirely unlinted (no typescript-eslint parser).
- **No CI** (`.github/workflows` absent) — nothing runs tests/types/lint automatically.
- Known structural debt from earlier layers: duplicate `verapamil`/`sotalol` keys in `MEDICATIONS`
  (F37 note); the `MEDICATIONS` ↔ `MEDICATIONS_CONFIG` sync invariant; the F41 dead-signal class.

## Progress

### Type-check gate (F6) — established
- Added `tsconfig.json` (target ES2022, `moduleResolution: bundler`, `jsx: react-jsx`, `allowImportingTsExtensions`,
  `allowJs`/`checkJs:false` so the untyped `.js` core is imported but not drowned in implicit-any noise, `strict:false`
  as a pragmatic first bar). Excludes `src/knowledge` (out of audit scope).
- Pinned `typescript@5.7.2` as a devDependency; added `"typecheck": "tsc --noEmit"`.
- The gate now RUNS and surfaced **213 real type errors** (was a vacuous 0). See **F55**.

### F55 — defects the type-check revealed
Fixed this pass (213 → 134): musculoskeletal `prevMyoglobinUriaLogged` casing typo (a dead assertion),
`SimHandle` re-export from `metamorphic`, `PediatricPhysiologyEngine` non-pediatric early-return missing a
required field, and the `rr`/`pao2`/`cvp` `RespiratoryVitalsState` gaps. Suite stayed green (1913/1913).

Remaining (scoped for continuation):
- **Vacuous/broken test calls** (highest value): `RespiratoryEngine.tick(…5 args…)` in `gas_kinetics_ch19` +
  `positioning_ch34` (args in wrong positions → garbage inputs), `opioids_ch24 getEffects(1.0,1.0)`,
  `cardiovascular.test currentHb`. Each needs its intent reconstructed — a focused test-repair pass.
- **`PKPDEngine`** imports non-existent `PKParameters`/`PDParameters` types (used 5×) — define or inline them.
- **Mechanical type-declaration backlog** (~120): tests constructing partial objects (missing `cmap`/`bis`/
  `ibw`/`oxygenBuffer`/…) + interfaces missing runtime fields. Add the fields / make optional to reach 0.

### Remaining L5 scope (not yet started)
- **Lint coverage**: ESLint covers only `.js`/`.jsx` (309 errors, 16 warnings) — the `.ts` engines are UNLINTED
  (no typescript-eslint parser). Extend the config to `.ts`/`.tsx`, triage the 309 `.js` findings (unused vars, etc.).
- **CI**: none (`.github/workflows` absent) — add a workflow running `test` + `typecheck` + `lint` on push/PR (the real gate).
- **Structural**: dedupe the duplicate `verapamil`/`sotalol` keys in `MEDICATIONS` (harmless — identical, last wins — but a smell);
  verify the `MEDICATIONS` ↔ `MEDICATIONS_CONFIG` sync invariant programmatically.

_Status: rigorously STARTED — F6 gate established + first F55 defects fixed (suite green). Reaching a passing gate,
lint `.ts` coverage, CI, and the structural cleanups remain._
