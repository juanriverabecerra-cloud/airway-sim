import { describe, it, expect, vi } from 'vitest';
import { usePhysiology } from '../engine/usePhysiology';
import React from 'react';

// Store the callback passed to setInterval
let intervalCallback: (() => void) | null = null;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  const refStore: Record<number, any> = {};
  let refIdx = 0;
  return {
    ...actual,
    useState: (initial: any) => {
      let stateValue = typeof initial === 'function' ? initial() : initial;
      const setter = (newVal: any) => { stateValue = typeof newVal === 'function' ? newVal(stateValue) : newVal; };
      return [stateValue, setter];
    },
    useRef: (initial: any) => {
      const idx = refIdx++;
      if (refStore[idx] === undefined) refStore[idx] = { current: initial };
      return refStore[idx];
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useEffect: (fn: any, _deps: any) => {
      // Execute the effect to trigger setInterval
      fn();
    },
  };
});

// Mock setInterval to capture the callback
vi.stubGlobal('setInterval', (cb: any, _delay: any) => {
  intervalCallback = cb;
  return 123;
});
vi.stubGlobal('clearInterval', (_id: any) => {});

const mockCase = {
  id: 'general',
  name: 'General Case',
  description: 'Test case description',
  baseVitals: { hr: 75, sys: 122, dia: 75, spo2: 99, etco2: 0, rr: 14, temp: 37.0 },
  patient: {
    age: 38, sex: 'male', weight: 80, height: 178, ibw: 73.2, bmi: 25,
    position: 'Supine', airwaySecured: true, ventilationStatus: 'successful',
    lungVolumes: { frc_mL: 2400, frc_L: 2.4 }
  }
};

describe('usePhysiology hook internals', () => {
  it('correctly updates stateRef and executes the tick callback without throwing', () => {
    const ventSettings = { mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40 };
    const gasSettings = { agent: 'sevoflurane', dial: 2.0, o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 };

    let res: any;
    res = usePhysiology({
      activeCase: mockCase as any,
      isRunning: true,
      isPaused: false,
      ventSettings,
      gasSettings,
      logEvent: () => {},
      msmaidsComplete: false
    });

    expect(res).toBeDefined();
    expect(intervalCallback).not.toBeNull();

    // Now, let's run the tick callback and see if it throws!
    if (intervalCallback) {
      expect(() => {
        intervalCallback!();
      }).not.toThrow();
    }
  });
});
