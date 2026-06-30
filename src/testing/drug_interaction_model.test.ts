import { describe, it, expect } from 'vitest';
import { DrugInteractionModel } from '../engine/DrugInteractionModel';

describe('DrugInteractionModel — CYP3A4 DDI and QT prolongation matrix', () => {
  it('produces unity multipliers with no interacting drugs', () => {
    const out = DrugInteractionModel.tick({});
    expect(out.cyp3a4ActivityMultiplier).toBe(1.0);
    expect(out.qtcProlongationMs).toBe(0);
    expect(out.qtcCritical).toBe(false);
  });

  it('fluconazole (strong CYP3A4 inhibitor) dramatically reduces fentanyl clearance', () => {
    const withFluconazole = DrugInteractionModel.tick({ fluconazoleCe: 5.0 });
    expect(withFluconazole.fentanylClearanceMultiplier).toBeLessThan(0.5);
  });

  it('rifampin (strong CYP3A4 inducer) dramatically accelerates fentanyl clearance', () => {
    const withRifampin = DrugInteractionModel.tick({ rifampicinChronic: true });
    expect(withRifampin.fentanylClearanceMultiplier).toBeGreaterThan(5);
  });

  it('CYP3A4 inhibition dominates over induction when both are present', () => {
    const inhibitionOnly = DrugInteractionModel.tick({ fluconazoleCe: 5.0 });
    const combinedBoth = DrugInteractionModel.tick({ fluconazoleCe: 5.0, rifampicinChronic: true });
    expect(combinedBoth.cyp3a4ActivityMultiplier).toBeCloseTo(inhibitionOnly.cyp3a4ActivityMultiplier, 1);
  });

  it('ondansetron alone causes moderate QTc prolongation', () => {
    const out = DrugInteractionModel.tick({ ondansetronCe: 2.0, baselineQTcMs: 420 });
    expect(out.qtcProlongationMs).toBeGreaterThan(0);
    expect(out.qtcProlongationMs).toBeLessThan(20);
    expect(out.qtcCritical).toBe(false);
  });

  it('combining ondansetron + ciprofloxacin + metronidazole causes synergistic QTc prolongation', () => {
    const single = DrugInteractionModel.tick({ ondansetronCe: 2.0, baselineQTcMs: 450 });
    const combo = DrugInteractionModel.tick({ ondansetronCe: 2.0, ciprofloxacinCe: 2.0, metronidazoleCe: 5.0, baselineQTcMs: 450 });
    expect(combo.qtcProlongationMs).toBeGreaterThan(single.qtcProlongationMs * 2);
  });

  it('fires a QTc critical warning when estimated QTc exceeds 500 ms', () => {
    const critical = DrugInteractionModel.tick({ methadoneCe: 5.0, haloperidolCe: 2.0, baselineQTcMs: 460, prevTorsadesWarningLogged: false });
    expect(critical.qtcCritical).toBe(true);
    expect(critical.estimatedAbsoluteQTcMs).toBeGreaterThan(500);
    expect(critical.events.some(e => e.includes('QTc'))).toBe(true);
  });

  it('torsades risk escalates above QTc 500 ms and more rapidly above 550 ms', () => {
    const moderate = DrugInteractionModel.tick({ methadoneCe: 3.0, baselineQTcMs: 480 });
    const severe = DrugInteractionModel.tick({ methadoneCe: 10.0, haloperidolCe: 3.0, baselineQTcMs: 490 });
    expect(severe.torsadesRisk).toBeGreaterThan(moderate.torsadesRisk);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => DrugInteractionModel.tick(undefined as any)).not.toThrow();
    expect(() => DrugInteractionModel.tick({ fluconazoleCe: NaN, ondansetronCe: NaN } as any)).not.toThrow();
    const out = DrugInteractionModel.tick({ fluconazoleCe: -5, ondansetronCe: -1 });
    expect(Number.isFinite(out.cyp3a4ActivityMultiplier)).toBe(true);
    expect(out.cyp3a4ActivityMultiplier).toBeGreaterThan(0);
  });
});
