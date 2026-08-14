import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE, makeFuzzHandlers } from './harness/headlessSim';

/**
 * Layer 2 — access-line delivery gating (safety-critical). Verifies that drug delivery respects the
 * venous-access model: no access / a blown line rejects; an ARTERIAL line triggers the intra-arterial
 * injury pathway (barbiturate crystal precipitation, or generic vasospasm); PIV/CVC/IO deliver; and
 * central-preferred drugs still deliver via a PIV but warn. Full audit passed with no findings.
 */
function line(kind: string): any {
  const base = { id: `L-${kind}`, failed: false, activeInfusions: [], activeMedInfusions: [], radius: 0.475, length: 30, venousPressure: 10, veinResistance: 500 };
  const map: Record<string, any> = {
    piv: { category: 'Peripheral IV', type: '18G PIV', name: '18G PIV' },
    cvc: { category: 'CVC', type: 'Triple Lumen CVC', name: 'R IJ CVC' },
    io: { category: 'IO', type: 'Intraosseous', name: 'Tibial IO' },
    art: { category: 'Arterial', type: 'Arterial Line', name: 'L Radial A-line' },
    failed: { category: 'Peripheral IV', type: '18G PIV', name: 'Blown PIV', failed: true },
  };
  return { ...base, ...map[kind] };
}
const mk = (lines: any[]) => { const s = createHeadlessSim(HEALTHY_CASE, { seed: 4 }); s.state.patient.accessLines = lines; s.state.patient.hasIV = lines.some((l: any) => !l.failed && !l.category.includes('Arterial')); return s; };
const give = (s: any, id: string, dose: number, unit: string, lineId: string | null, type = 'Bolus') => makeFuzzHandlers(s).handleProcessMed(id, dose, 'IV', type, unit, lineId);
const has = (s: any, name: string) => (s.state.activeMeds || []).some((m: any) => m.name === name);
const ev = (s: any) => (s.events || []).map((e: any) => (typeof e === 'string' ? e : e?.message || '')).join(' | ');

describe('Layer 2 — access-line delivery gating', () => {
  it('rejects delivery with no venous access', () => {
    const s = mk([]);
    give(s, 'propofol', 100, 'mg', null);
    expect(has(s, 'Propofol')).toBe(false);
    expect(/no venous access/i.test(ev(s))).toBe(true);
  });

  it('rejects delivery through a blown/failed line', () => {
    const s = mk([line('failed')]);
    give(s, 'propofol', 100, 'mg', 'L-failed');
    expect(has(s, 'Propofol')).toBe(false);
    expect(/blown|failed/i.test(ev(s))).toBe(true);
  });

  it('intra-arterial barbiturate triggers crystal precipitation', () => {
    const s = mk([line('art')]);
    s.state.patient.forceBarbituratePrecipitation = true;
    give(s, 'thiopental', 250, 'mg', 'L-art');
    expect(!!s.state.patient.barbiturateArterialPrecipitation).toBe(true);
    expect(/arter/i.test(ev(s))).toBe(true);
  });

  it('intra-arterial injection of a normal drug triggers vasospasm', () => {
    const s = mk([line('art')]);
    give(s, 'rocuronium', 50, 'mg', 'L-art');
    expect(!!s.state.patient.genericArterialSpasm).toBe(true);
  });

  it('PIV, CVC, and IO all deliver', () => {
    for (const k of ['piv', 'cvc', 'io']) {
      const s = mk([line(k)]);
      give(s, 'propofol', 100, 'mg', `L-${k}`);
      expect(has(s, 'Propofol'), `${k} should deliver`).toBe(true);
    }
  });

  it('a central-preferred vasopressor still delivers via PIV but warns of extravasation', () => {
    const s = mk([line('piv')]);
    give(s, 'norepinephrine', 0.1, 'mcg/kg/min', 'L-piv', 'Infusion');
    stepN(s, 5);
    expect(has(s, 'Norepinephrine')).toBe(true);
    expect(/extravasation|necrosis/i.test(ev(s))).toBe(true);
  });
});
