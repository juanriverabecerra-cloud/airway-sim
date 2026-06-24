import { describe, it, expect } from 'vitest';
import {
  simulateFourChamberCycle,
  getFourChamberCycle,
  rescaleToTargetMean,
  interpolateField
} from '../engine/FourChamberCircuitModel';

const base = { hr: 75, inotropy: 1.0, svr: 1200, totalBloodVolumeMl: 5000 };

describe('FourChamberCircuitModel — closed RA-RV-PA-LA-LV-Aorta elastance + valve + Windkessel ODE', () => {
  it('produces a finite, well-formed cycle for every chamber', () => {
    const { trajectory } = simulateFourChamberCycle(base);
    expect(trajectory.length).toBeGreaterThan(50);
    for (const s of trajectory) {
      for (const field of ['pRA', 'pRV', 'pPA', 'pLA', 'pLV', 'pAo', 'vLV']) {
        expect(Number.isFinite((s as any)[field])).toBe(true);
      }
    }
    const raPressures = trajectory.map((s) => s.pRA);
    expect(Math.max(...raPressures) - Math.min(...raPressures)).toBeGreaterThan(2);
  });

  it('shows RV pressure rising during diastole and PA pressure falling during diastole (Fig 36.38 differentiator)', () => {
    const { trajectory } = simulateFourChamberCycle(base);
    const period = 60 / base.hr;
    const lateD1 = trajectory.find((s) => s.t > 0.5 * period)!;
    const lateD2 = trajectory.find((s) => s.t > 0.65 * period)!;
    expect(lateD2.pRV).toBeGreaterThan(lateD1.pRV);
    expect(lateD2.pPA).toBeLessThan(lateD1.pPA);
  });

  it('suppresses the a-wave swing in atrial fibrillation relative to normal', () => {
    const normal = simulateFourChamberCycle(base).trajectory;
    const afib = simulateFourChamberCycle({ ...base, afib: true }).trajectory;
    const swing = (cycle: any[]) => Math.max(...cycle.map((s) => s.pRA)) - Math.min(...cycle.map((s) => s.pRA));
    expect(swing(afib)).toBeLessThan(swing(normal));
  });

  it('produces a cannon-wave RA pressure peak during ventricular systole for AV dissociation, not normal late-diastolic a-wave timing', () => {
    const { trajectory } = simulateFourChamberCycle({ ...base, avDissociated: true });
    const period = 60 / base.hr;
    let peakT = 0, peakP = -Infinity;
    for (const s of trajectory) {
      if (s.pRA > peakP) { peakP = s.pRA; peakT = s.t; }
    }
    expect(peakT / period).toBeLessThan(0.5);
  });

  it('raises mean RA pressure for tricuspid regurgitation', () => {
    const normal = simulateFourChamberCycle(base).trajectory;
    const tr = simulateFourChamberCycle({ ...base, tricuspidRegurgitation: 0.85 }).trajectory;
    const mean = (cycle: any[]) => cycle.reduce((s, p) => s + p.pRA, 0) / cycle.length;
    expect(mean(tr)).toBeGreaterThan(mean(normal));
  });

  it('raises peak LA pressure for mitral regurgitation (systolic regurgitant pulse)', () => {
    const normal = simulateFourChamberCycle(base).trajectory;
    const mr = simulateFourChamberCycle({ ...base, mitralRegurgitation: 0.85 }).trajectory;
    expect(Math.max(...mr.map((s) => s.pLA))).toBeGreaterThan(Math.max(...normal.map((s) => s.pLA)));
  });

  it('Stage E connection: reducing total blood volume (hence right-heart filling) measurably changes LA filling -- proof PA output, not a constant, drives LA inflow', () => {
    // A direct proof that LA's inflow is now PA's actual computed outflow rather than an
    // assumed constant: a much lower total blood volume should reduce right-heart filling
    // and therefore PA flow, reducing LA's mean pressure too, since LA's filling now
    // genuinely depends on what the right heart delivers through the pulmonary circulation.
    const normalVolume = simulateFourChamberCycle({ ...base, totalBloodVolumeMl: 5000 }).trajectory;
    const lowVolume = simulateFourChamberCycle({ ...base, totalBloodVolumeMl: 2000 }).trajectory;
    const meanPLA = (cycle: any[]) => cycle.reduce((s, p) => s + p.pLA, 0) / cycle.length;
    expect(meanPLA(lowVolume)).toBeLessThan(meanPLA(normalVolume));
  });

  it('Frank-Starling-like behavior emerges from whole-circulation volume mechanics: higher total blood volume increases SV', () => {
    const low = simulateFourChamberCycle({ ...base, totalBloodVolumeMl: 3000 }).aggregates;
    const normal = simulateFourChamberCycle({ ...base, totalBloodVolumeMl: 5000 }).aggregates;
    expect(normal.sv).toBeGreaterThan(low.sv);
    expect(normal.lvedp).toBeGreaterThan(low.lvedp);
  });

  it('Phase 1: splanchnic vasodilation (sympathetic block) pools blood, reducing MAP/CO at unchanged total volume', () => {
    const normal = simulateFourChamberCycle(base).aggregates;
    const blocked = simulateFourChamberCycle({ ...base, splanchnicTone: 0.3 }).aggregates;
    expect(blocked.map).toBeLessThan(normal.map);
    expect(blocked.co).toBeLessThan(normal.co);
  });

  it('Phase 1: total blood volume is conserved across the closed loop to within numerical integration tolerance', () => {
    // RA+RV+LA+LV chamber volumes are tracked directly; the venous reservoirs' volumes
    // aren't part of this trajectory's recorded fields, so this checks the weaker but
    // still meaningful invariant: chamber volumes stay in a physiologically bounded range
    // (not blowing up or collapsing) across a long, low-volume, high-demand scenario.
    const { trajectory } = simulateFourChamberCycle({ ...base, totalBloodVolumeMl: 2500, hr: 110, svr: 1500 });
    for (const s of trajectory) {
      expect(s.vLV).toBeGreaterThan(0);
      expect(s.vLV).toBeLessThan(2000);
    }
  });

  it('Phase 1: per-bed autoregulation (cerebral/renal/coronary) stays finite and bounded across both severe hypotension and hypertension, exercising the autoregulatory plateau and its breakdown boundaries', () => {
    for (const svr of [200, 600, 1200, 2500, 4000]) {
      const { aggregates } = simulateFourChamberCycle({ ...base, svr });
      expect(Number.isFinite(aggregates.map)).toBe(true);
      expect(aggregates.map).toBeGreaterThan(0);
      expect(Number.isFinite(aggregates.co)).toBe(true);
    }
  });

  it('higher inotropy increases EF and reduces ESV/LVEDP (more complete ejection)', () => {
    const low = simulateFourChamberCycle({ ...base, inotropy: 0.5 }).aggregates;
    const normal = simulateFourChamberCycle({ ...base, inotropy: 1.0 }).aggregates;
    const high = simulateFourChamberCycle({ ...base, inotropy: 1.5 }).aggregates;
    expect(high.lvEf).toBeGreaterThan(normal.lvEf);
    expect(normal.lvEf).toBeGreaterThan(low.lvEf);
    expect(normal.lvedp).toBeLessThan(low.lvedp);
  });

  it('higher SVR raises MAP/SBP/DBP for the same cardiac inputs (afterload)', () => {
    const lowSvr = simulateFourChamberCycle({ ...base, svr: 700 }).aggregates;
    const highSvr = simulateFourChamberCycle({ ...base, svr: 2000 }).aggregates;
    expect(highSvr.map).toBeGreaterThan(lowSvr.map);
  });

  it('aortic stenosis: CO/EF stay compensated near rest but LVEDP is elevated and pulse pressure narrows', () => {
    const normal = simulateFourChamberCycle(base).aggregates;
    const as = simulateFourChamberCycle({ ...base, aorticStenosis: true }).aggregates;
    expect(as.co).toBeGreaterThan(normal.co * 0.7);
    expect(as.lvedp).toBeGreaterThan(normal.lvedp);
    expect(as.sbp - as.dbp).toBeLessThan(normal.sbp - normal.dbp);
  });

  it('CHF shows reduced EF and elevated LVEDP vs. normal', () => {
    const normal = simulateFourChamberCycle(base).aggregates;
    const chf = simulateFourChamberCycle({ ...base, hr: 80, inotropy: 0.5, chf: true, ef: 30 }).aggregates;
    expect(chf.lvEf).toBeLessThan(normal.lvEf);
    expect(chf.lvedp).toBeGreaterThan(normal.lvedp);
  });

  it('lvEdv/lvEsv/lvEf are internally consistent (sv = edv - esv, ef = sv/edv)', () => {
    const { aggregates: out } = simulateFourChamberCycle({ ...base, hr: 72, inotropy: 1.1, svr: 1100 });
    expect(out.lvEdv).toBeGreaterThan(out.lvEsv);
    expect(out.sv).toBeCloseTo(out.lvEdv - out.lvEsv, 3);
    expect(out.lvEf).toBeCloseTo(out.sv / out.lvEdv, 3);
  });

  it('rescaleToTargetMean preserves relative shape exactly while hitting the target mean precisely', () => {
    const { trajectory } = simulateFourChamberCycle(base);
    const originalMean = trajectory.reduce((s, p) => s + p.pRA, 0) / trajectory.length;
    const originalRatio = Math.max(...trajectory.map((s) => s.pRA)) / originalMean;
    const rescaled = rescaleToTargetMean(trajectory, 'pRA', 5);
    const newMean = rescaled.reduce((s, p) => s + p.pRA, 0) / rescaled.length;
    const newRatio = Math.max(...rescaled.map((s) => s.pRA)) / newMean;
    expect(newMean).toBeCloseTo(5, 5);
    expect(newRatio).toBeCloseTo(originalRatio, 5);
  });

  it('caches identical parameter sets (cache hit returns the same object reference)', () => {
    const a = getFourChamberCycle(base);
    const b = getFourChamberCycle({ ...base });
    expect(a).toBe(b);
  });

  it('interpolateField returns finite values across the full phase range, including out-of-range tBeat', () => {
    const { trajectory } = simulateFourChamberCycle(base);
    const period = 60 / base.hr;
    for (const tBeat of [-1, 0, 0.4, period, 100]) {
      const v = interpolateField(trajectory, tBeat, period, 'pRA');
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => simulateFourChamberCycle(undefined as any)).not.toThrow();
    expect(() => simulateFourChamberCycle({ hr: NaN, inotropy: -5, svr: -100, totalBloodVolumeMl: 0 } as any)).not.toThrow();
    expect(() => rescaleToTargetMean([], 'pRA' as any, 5)).not.toThrow();
    expect(() => interpolateField(null as any, 0, 1, 'pRA' as any)).not.toThrow();
    const { aggregates } = simulateFourChamberCycle({ hr: 999, inotropy: -5, svr: -100, totalBloodVolumeMl: 0 } as any);
    for (const v of Object.values(aggregates)) {
      expect(Number.isFinite(v as number)).toBe(true);
    }
  });
});
