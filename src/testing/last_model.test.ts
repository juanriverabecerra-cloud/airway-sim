import { describe, it, expect } from 'vitest';
import { LastModel } from '../engine/LastModel';

describe('LastModel — local anesthetic systemic toxicity and Intralipid rescue', () => {
  it('produces no toxicity at therapeutic local anesthetic concentrations', () => {
    const out = LastModel.tick({ bupivacaineCe: 0.3, lidocaineCe: 1.0 });
    expect(out.cnsToxicityActive).toBe(false);
    expect(out.cvToxicityActive).toBe(false);
    expect(out.seizureFromLast).toBe(false);
  });

  it('bupivacaine produces CNS toxicity at much lower Ce than lidocaine (lower CC/CNS ratio)', () => {
    const bupiCns = LastModel.tick({ bupivacaineCe: 2.0 });
    const lidoCns = LastModel.tick({ lidocaineCe: 2.0 });
    expect(bupiCns.cnsToxicityActive).toBe(true);
    expect(lidoCns.cnsToxicityActive).toBe(false);
  });

  it('CNS toxicity precedes cardiovascular toxicity for all agents (lower threshold)', () => {
    // At Ce=2.5 (between CNS symptom threshold 1.5 and seizure threshold 3.0 for bupivacaine):
    // clearly CNS-symptomatic but not yet at CV collapse territory.
    const bupi = LastModel.tick({ bupivacaineCe: 2.5 });
    expect(bupi.cnsToxicityActive).toBe(true);
    expect(bupi.cvToxicityActive).toBe(false);
  });

  it('bupivacaine cardiovascular toxicity activates at a Ce that would not cause CV toxicity with ropivacaine (CC/CNS 2 vs 4)', () => {
    // Ce=4.5: at bupivacaine's CV collapse threshold but only 12% into ropivacaine's CV zone
    const dangerousBupiCe = 4.5;
    const bupicv = LastModel.tick({ bupivacaineCe: dangerousBupiCe });
    const ropicv = LastModel.tick({ ropivacaineCe: dangerousBupiCe });
    expect(bupicv.cvToxicityActive).toBe(true);
    expect(ropicv.cvToxicityActive).toBe(false);
  });

  it('bupivacaine CV toxicity produces a Brugada-like arrhythmia risk, ropivacaine does not', () => {
    const bupicv = LastModel.tick({ bupivacaineCe: 5.0 });
    const ropicv = LastModel.tick({ ropivacaineCe: 5.0 });
    expect(bupicv.bupivacaineBrugadaArrhythmiaRisk).toBeGreaterThan(0);
    expect(ropicv.bupivacaineBrugadaArrhythmiaRisk).toBe(0);
  });

  it('Intralipid reduces effective local anesthetic concentration, reversing or preventing toxicity', () => {
    const withoutLipid = LastModel.tick({ bupivacaineCe: 5.0, intralipidCe: 0 });
    const withLipid = LastModel.tick({ bupivacaineCe: 5.0, intralipidCe: 4.0 });
    expect(withLipid.cvToxicitySeverity).toBeLessThan(withoutLipid.cvToxicitySeverity);
  });

  it('Intralipid is more effective at rescuing bupivacaine (highly lipophilic) than lidocaine (less lipophilic)', () => {
    const rescuedBupi = LastModel.tick({ bupivacaineCe: 5.0, intralipidCe: 3.0 });
    const rescuedLido = LastModel.tick({ lidocaineCe: 20.0, intralipidCe: 3.0 });
    expect(rescuedBupi.cvToxicitySeverity).toBeLessThan(rescuedLido.cvToxicitySeverity);
  });

  it('CV toxicity impairs hemodynamics (SVR and inotropy), scaled by severity', () => {
    const mild = LastModel.tick({ bupivacaineCe: 4.0 });
    const severe = LastModel.tick({ bupivacaineCe: 7.0 });
    expect(severe.svrModFromLast).toBeLessThan(mild.svrModFromLast);
    expect(severe.inotropyModFromLast).toBeLessThan(mild.inotropyModFromLast);
  });

  it('fires narrative events on first onset only: CNS, seizure, and CV events are transition-gated', () => {
    const cnsonset = LastModel.tick({ bupivacaineCe: 2.5, prevCnsToxicityLogged: false });
    expect(cnsonset.events.some(e => e.includes('LAST'))).toBe(true);

    const cnssteady = LastModel.tick({ bupivacaineCe: 2.5, prevCnsToxicityLogged: true });
    expect(cnssteady.events.some(e => e.includes('LAST'))).toBe(false);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => LastModel.tick(undefined as any)).not.toThrow();
    expect(() => LastModel.tick({ bupivacaineCe: NaN, intralipidCe: NaN } as any)).not.toThrow();
    const out = LastModel.tick({ bupivacaineCe: -5, intralipidCe: -1 });
    expect(Number.isFinite(out.cvToxicitySeverity)).toBe(true);
    expect(out.cnsToxicityActive).toBe(false);
  });
});
