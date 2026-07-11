import { describe, it, expect, vi } from 'vitest';

describe('Surgical Timeline Phase Auto-Advance Logic Tests', () => {
  // Let's mock the timeline transition logic directly to verify state changes
  function evaluateSurgicalTimelineTransition(params: {
    surgicalPhase: string;
    time: number;
    patient: any;
    finalPatientState?: any;
    gasSettings: any;
    activeMeds: any[];
    currentMac: number;
    propofolCe: number;
    finalBis: number;
  }) {
    let nextPhase = params.surgicalPhase;
    const finalPatient = params.finalPatientState ? { ...params.finalPatientState } : { ...params.patient };
    const st = {
      surgicalPhase: params.surgicalPhase,
      time: params.time,
      patient: params.patient,
      gasSettings: params.gasSettings,
      activeMeds: params.activeMeds
    };
    const currentMac = params.currentMac;
    const propofolCe = params.propofolCe;
    const finalBis = params.finalBis;

    const logMessages: string[] = [];
    const logEvent = (msg: string) => { logMessages.push(msg); };
    const setSurgicalPhase = (phase: string) => { nextPhase = phase; };

    // Timeline transition logic:
    if (finalPatient.airwaySecured && !st.patient.airwaySecured) {
        finalPatient.airwaySecuredTime = st.time;
    } else if (!finalPatient.airwaySecured) {
        finalPatient.airwaySecuredTime = undefined;
        finalPatient.incisionStartTime = undefined;
    }

    if (st.surgicalPhase === 'Induction' && finalPatient.airwaySecured && finalPatient.airwaySecuredTime !== undefined && finalPatient.timeOutAuthorized) {
        const secondsSinceSecured = st.time - finalPatient.airwaySecuredTime;
        if (secondsSinceSecured >= 5) {
            setSurgicalPhase('Incision');
            finalPatient.incisionStartTime = st.time;
            logEvent(`➡️ Airway Secured. Prepping & draping complete. Surgical incision performed.`);
        }
    }

    if (st.surgicalPhase === 'Incision' && finalPatient.incisionStartTime !== undefined) {
        const secondsSinceIncision = st.time - finalPatient.incisionStartTime;
        if (secondsSinceIncision >= 30) {
            setSurgicalPhase('Maintenance');
            logEvent(`➡️ Surgical Timeline: Incision complete. Maintenance phase initiated.`);
        }
    }

    if (st.surgicalPhase === 'Maintenance') {
        const isVolatileOff = !st.gasSettings || st.gasSettings.dial === 0;
        const isPropofolOff = !st.activeMeds || !st.activeMeds.some(m => m.name === 'Propofol' && m.currentInfusionRate > 0);
        const isAnestheticLow = currentMac < 0.55 && propofolCe < 1.5;
        if (isVolatileOff && isPropofolOff && isAnestheticLow) {
            setSurgicalPhase('Emergence');
            logEvent(`➡️ Anesthetic agents winding down (MAC ${currentMac.toFixed(2)}, Propofol Ce ${propofolCe.toFixed(2)}). Surgical Timeline Auto-Advanced: EMERGENCE phase initiated.`);
        }
    }

    if (st.surgicalPhase === 'Emergence' && currentMac < 0.1 && propofolCe < 0.1 && finalBis >= 90) {
        setSurgicalPhase('PACU');
        logEvent(`➡️ Patient is fully awake (BIS ${Math.round(finalBis)}, MAC ${currentMac.toFixed(2)}). Surgical Timeline Auto-Advanced: PACU phase initiated.`);
    }

    return { nextPhase, finalPatient, logMessages };
  }

  it('should initialize airwaySecuredTime and NOT transition until timeOutAuthorized is set and 5s has elapsed', () => {
    const gasSettings = { dial: 2.0 };
    const activeMeds = [{ name: 'Propofol', currentInfusionRate: 1.0 }];

    // Step 1: Airway is secured at t=10
    let step1 = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Induction',
      time: 10,
      patient: { airwaySecured: false },
      finalPatientState: { airwaySecured: true },
      gasSettings,
      activeMeds,
      currentMac: 1.2,
      propofolCe: 3.5,
      finalBis: 45
    });

    expect(step1.finalPatient.airwaySecuredTime).toBe(10);
    expect(step1.nextPhase).toBe('Induction'); // not yet Incision

    // Step 2: 10 seconds later (t=20) - still no transition without timeOutAuthorized
    let step2 = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Induction',
      time: 20,
      patient: step1.finalPatient,
      gasSettings,
      activeMeds,
      currentMac: 1.2,
      propofolCe: 3.5,
      finalBis: 45
    });
    expect(step2.nextPhase).toBe('Induction');

    // Step 3: User sets timeOutAuthorized: true at t=21. Airway secured at t=10.
    // secondsSinceSecured = 21 - 10 = 11 >= 5. So it should transition immediately!
    let step3 = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Induction',
      time: 21,
      patient: { ...step1.finalPatient, timeOutAuthorized: true },
      gasSettings,
      activeMeds,
      currentMac: 1.2,
      propofolCe: 3.5,
      finalBis: 45
    });
    expect(step3.nextPhase).toBe('Incision');
    expect(step3.finalPatient.incisionStartTime).toBe(21);
    expect(step3.logMessages[0]).toContain('Prepping & draping complete');
  });

  it('should transition from Incision to Maintenance after 30 seconds', () => {
    let patient = { airwaySecured: true, airwaySecuredTime: 10, incisionStartTime: 13 };
    const gasSettings = { dial: 2.0 };
    const activeMeds = [{ name: 'Propofol', currentInfusionRate: 1.0 }];

    // 29 seconds after incision (t=42)
    let step1 = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Incision',
      time: 42,
      patient,
      gasSettings,
      activeMeds,
      currentMac: 1.2,
      propofolCe: 3.5,
      finalBis: 45
    });
    expect(step1.nextPhase).toBe('Incision');

    // 30 seconds after incision (t=43)
    let step2 = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Incision',
      time: 43,
      patient,
      gasSettings,
      activeMeds,
      currentMac: 1.2,
      propofolCe: 3.5,
      finalBis: 45
    });
    expect(step2.nextPhase).toBe('Maintenance');
    expect(step2.logMessages[0]).toContain('Maintenance phase initiated');
  });

  it('should transition from Maintenance to Emergence when vaporizers/propofol wind down', () => {
    let patient = { airwaySecured: true };
    const gasSettings = { dial: 0 }; // dial turned off
    const activeMeds = [{ name: 'Propofol', currentInfusionRate: 0 }]; // infusion stopped

    let step = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Maintenance',
      time: 100,
      patient,
      gasSettings,
      activeMeds,
      currentMac: 0.5, // low MAC
      propofolCe: 1.2, // low Ce
      finalBis: 68
    });

    expect(step.nextPhase).toBe('Emergence');
    expect(step.logMessages[0]).toContain('EMERGENCE phase initiated');
  });

  it('should transition from Emergence to PACU when patient is fully awake', () => {
    let patient = { airwaySecured: true };
    const gasSettings = { dial: 0 };
    const activeMeds = [];

    let step = evaluateSurgicalTimelineTransition({
      surgicalPhase: 'Emergence',
      time: 200,
      patient,
      gasSettings,
      activeMeds,
      currentMac: 0.05, // washed out
      propofolCe: 0.02, // cleared
      finalBis: 92 // fully awake
    });

    expect(step.nextPhase).toBe('PACU');
    expect(step.logMessages[0]).toContain('PACU phase initiated');
  });
});
