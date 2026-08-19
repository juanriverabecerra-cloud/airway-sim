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

### Type-gate grind — PRODUCTION now 100% type-clean
Drove the type-error count **213 → 52** with the suite staying green (1913/1913). **All `src/engine` production
code type-checks with zero errors.** Fixed production defects (missing `types.ts`, PostopPain dead ERAS check,
Pediatric boolean|number, `lastCvSeverity`/`weightKg`/`hasRenalInsufficiency`/`nsaidContrib` gaps, VitalsState/
RespiratoryVitalsState/VentSettings/PainVitalsState/RespiratoryOutput completions, ProceduralEngine/FluidicsEngine
`||{}` fallbacks) and real test bugs (opioids `getEffects` extra arg, gas_kinetics missing 6th arg). The residual
**52 = 42 test partial-object type-gaps** (tests passing incomplete vitals/patient objects — the rigorous fix is
COMPLETING those objects, never weakening core types; left as a burn-down baseline) **+ 10 out-of-scope
`src/knowledge`**.

### CI — added
`.github/workflows/ci.yml`: `npm ci` → **`test` (hard gate, passes 1913)** → `typecheck` + `lint` (reported /
`continue-on-error` until their baselines reach zero). Runs on push to `main`/`audit/**` and on PRs.

### Structural — MEDICATIONS dedup done
Removed the **duplicate `verapamil` and `sotalol` keys** in `MEDICATIONS` (JS keeps the last, so the later sparser
entries silently shadowed the richer earlier ones; pk/pd were byte-identical → behavior-neutral). Kept the richer
earlier definitions (WPW/β-blocker contraindication notes) and re-synced `MEDICATIONS_CONFIG`'s sotalol `classes`
to match — the `audit_meds` sync invariant caught the drift and now passes.

### Remaining L5 scope
- **Type gate → 0**: complete the 42 test partial-object constructions (burn-down; don't weaken core types), then
  flip CI `typecheck` to blocking.
- **Lint**: extend ESLint to `.ts`/`.tsx` (needs typescript-eslint) and triage the 309 `.js`/`.jsx` findings; flip CI `lint` to blocking.
- **The positioning_ch34 vacuous test** (no assertions + wrong tick args, F55): rewrite as a real prone-supports→compliance assertion.

_Status: substantially advanced — production type-clean, F6 gate + CI + dedup done, suite green. Type-gate→0,
lint `.ts`, and the vacuous-test rewrite remain as burn-down._
