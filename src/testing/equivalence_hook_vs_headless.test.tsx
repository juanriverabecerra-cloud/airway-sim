// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
// @ts-ignore - JS module without types
import { usePhysiology } from '../engine/usePhysiology.js';
import { createHeadlessSim, stepN } from './harness/headlessSim';

/**
 * Layer 1B RIGOR — the one-time equivalence proof. Drive the REAL React hook (usePhysiology) under
 * fake timers and assert its per-tick vitals trajectory is IDENTICAL to the headless
 * createInitialSimState + runPhysicsStep path. Both derive the seeded RNG from the same seed, so an
 * exact match proves the extraction preserved behavior — the formal justification for the refactor.
 */

const SEED = 20260731;
const VENT = { mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, fio2: 21 };
const GAS = { agent: 'sevoflurane', dial: 0, o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 };

// activeCase carries rngSeed on the patient so the hook's lazy ensureRng seeds deterministically,
// matching what createHeadlessSim({ seed }) sets explicitly.
const CASE = {
  id: 'equiv_healthy',
  baseVitals: { hr: 72, sys: 120, dia: 80, spo2: 99, rr: 12, temp: 37.0, etco2: 0 },
  patient: {
    age: 38, sex: 'male', height: 175, weight: 80, position: 'Supine',
    isObese: false, isSeptic: false, trauma: false, gfr: 100, ef: 60,
    rngSeed: SEED,
  },
};

const KEYS = ['hr', 'sys', 'dia', 'map', 'spo2', 'bis', 'paco2', 'etco2', 'temp', 'co', 'svr'];
const pick = (v: any) => {
  const o: Record<string, number> = {};
  for (const k of KEYS) o[k] = Math.round((v?.[k] ?? 0) * 1000) / 1000;
  return o;
};

const N = 40;

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Layer 1B — hook == headless equivalence proof', () => {
  it(`produces an identical ${N}-tick trajectory in React and headless`, () => {
    // --- Headless reference ---
    const headlessSim = createHeadlessSim(CASE, { seed: SEED, ventSettings: { ...VENT }, gasSettings: { ...GAS } });
    const headlessTraj = stepN(headlessSim, N, KEYS).map((row) => {
      const o: Record<string, number> = {};
      for (const k of KEYS) o[k] = Math.round((row[k] ?? 0) * 1000) / 1000;
      return o;
    });

    // --- Real React hook under fake timers ---
    vi.useFakeTimers();
    const props = {
      activeCase: CASE,
      isRunning: true,
      setIsRunning: () => {},
      isPaused: false,
      ventSettings: { ...VENT },
      gasSettings: { ...GAS },
      logEvent: () => {},
      msmaidsComplete: true,
    };
    const { result } = renderHook((p: any) => usePhysiology(p), { initialProps: props });
    // Flush the init + setup effects so stateRef is populated before the first interval fires.
    act(() => { vi.advanceTimersByTime(0); });

    const hookTraj: Record<string, number>[] = [];
    for (let i = 0; i < N; i++) {
      act(() => { vi.advanceTimersByTime(1000); }); // scale=1 -> one interval == one tick
      hookTraj.push(pick(result.current.vitals));
    }

    // Compare tick-by-tick. Report the first divergence for diagnosis.
    for (let i = 0; i < N; i++) {
      expect(hookTraj[i], `divergence at tick ${i + 1}: hook=${JSON.stringify(hookTraj[i])} headless=${JSON.stringify(headlessTraj[i])}`)
        .toEqual(headlessTraj[i]);
    }
  });
});
