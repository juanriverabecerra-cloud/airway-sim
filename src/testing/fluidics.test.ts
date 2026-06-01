import { describe, it, expect } from 'vitest';
import { FluidicsEngine, FluidicLine, FluidicsPatientState, ElectrolytesState, CoagsState, FluidicsVitalsState } from '../engine/FluidicsEngine';

describe('Fluidics & Resuscitation Engine Regression Tests', () => {

  const createBaselineState = (): {
    patient: FluidicsPatientState;
    electrolytes: ElectrolytesState;
    coags: CoagsState;
    vitals: FluidicsVitalsState;
    time: number;
  } => ({
    patient: {
      weight: 70,
      isSeptic: false,
      trauma: false,
      accessLines: [
        {
          name: 'Left Forearm 18G PIV',
          category: 'PIV',
          type: '18G',
          length: 32.0,
          radius: 0.60, // radius in mm
          venousPressure: 10,
          veinResistance: 500,
          fluidLine: 'gravity',
          failed: false,
          activeInfusions: [],
          activeMedInfusions: []
        }
      ],
      bloodBank: {
        status: 'none',
        unitsInOR: 0,
        deliveryCountdown: 0,
        totalDeliveryTime: 0,
        pendingUnits: 0,
        preOpWorkup: 'none'
      }
    },
    electrolytes: {
      k: 4.0,
      na: 140,
      cl: 100,
      ca: 2.2, // ionized calcium in mmol/L
      ph: 7.40
    },
    coags: {
      r_offset: 0,
      ma_offset: 0,
      angle_offset: 0
    },
    vitals: {
      temp: 37.0
    },
    time: 0
  });

  describe('1. Poiseuille Fluidics and Viscosity Scaling', () => {
    it('should verify that gravity NS flow rate is faster than highly viscous PRBC flow rate', () => {
      const stateNS = createBaselineState();
      stateNS.patient.accessLines[0].activeInfusions = [{ name: 'Normal Saline (0.9% NS)', remainingVolume: 1000 }];

      const statePRBC = createBaselineState();
      statePRBC.patient.accessLines[0].activeInfusions = [{ name: 'Packed Red Blood Cells (PRBC)', remainingVolume: 300 }];

      const outNS = FluidicsEngine.tick(1, stateNS);
      const outPRBC = FluidicsEngine.tick(1, statePRBC);

      // Extract rate in mL/hr from line
      const rateNS = outNS.accessLines[0].activeInfusions[0].currentRate || 0;
      const ratePRBC = outPRBC.accessLines[0].activeInfusions[0].currentRate || 0;

      expect(rateNS).toBeGreaterThan(0);
      expect(ratePRBC).toBeGreaterThan(0);

      // Normal Saline (viscosity = 1.0) must infuse faster than Packed RBCs (viscosity = 3.5)
      expect(rateNS).toBeGreaterThan(ratePRBC);
    });

    it('should verify Belmont infuser caps flow rate at 500 mL/min through a wide CVC line', () => {
      const state = createBaselineState();
      // Wide 14G CVC line
      state.patient.accessLines[0] = {
        name: 'Right IJ CVC 14G',
        category: 'CVC',
        type: '14G',
        length: 150.0,
        radius: 1.05,
        venousPressure: 8,
        veinResistance: 300,
        fluidLine: 'belmont', // Belmont infuser (300 mmHg)
        failed: false,
        activeInfusions: [{ name: 'Normal Saline (0.9% NS)', remainingVolume: 1000 }],
        activeMedInfusions: []
      };

      const out = FluidicsEngine.tick(1, state);
      const rate = out.accessLines[0].activeInfusions[0].currentRate || 0;

      // Belmont cap is 500 mL/min = 30,000 mL/hr
      expect(rate).toBeCloseTo(30000, 1);
    });
  });

  describe('2. Pressure Blowout Rules', () => {
    it('should blowout a narrow PIV line (22G) when connected to a Belmont Rapid Infuser', () => {
      const state = createBaselineState();
      state.patient.accessLines[0] = {
        name: 'Right Hand 22G PIV',
        category: 'PIV',
        type: '22G', // narrow IV!
        length: 25.0,
        radius: 0.35,
        venousPressure: 12,
        veinResistance: 600,
        fluidLine: 'belmont', // Belmont!
        failed: false,
        activeInfusions: [{ name: 'Normal Saline (0.9% NS)', remainingVolume: 1000 }],
        activeMedInfusions: []
      };

      const out = FluidicsEngine.tick(1, state);

      // Line must be blown out, failed = true, and name modified
      expect(out.accessLines[0].failed).toBe(true);
      expect(out.accessLines[0].name).toContain('[BLOWN OUT]');
      expect(out.accessLines[0].activeInfusions).toHaveLength(0);

      // Event log should contain blowout warning
      expect(out.events).toHaveLength(1);
      expect(out.events[0].msg).toContain('🚨 CLINICAL CATASTROPHE: Belmont Rapid Infuser connected to');
      expect(out.events[0].type).toBe('error');
    });

    it('should blowout an Intraosseous (IO) line when connected to a Belmont Rapid Infuser', () => {
      const state = createBaselineState();
      state.patient.accessLines[0] = {
        name: 'Humeral Head IO',
        category: 'IO', // IO category!
        length: 45.0,
        radius: 0.75,
        venousPressure: 20,
        veinResistance: 800,
        fluidLine: 'belmont',
        failed: false,
        activeInfusions: [{ name: 'Normal Saline (0.9% NS)', remainingVolume: 1000 }],
        activeMedInfusions: []
      };

      const out = FluidicsEngine.tick(1, state);

      expect(out.accessLines[0].failed).toBe(true);
      expect(out.events[0].msg).toContain('bone/vascular blowout, leading to severe extravasation');
    });
  });

  describe('3. Resuscitation Dilution & Electrolyte shifts', () => {
    it('should bind calcium and cause hypocalcemia when PRBC (citrate-heavy) is transfused', () => {
      const state = createBaselineState();
      // Increase flow by using Belmont infuser on 18G
      state.patient.accessLines[0].fluidLine = 'belmont';
      state.patient.accessLines[0].activeInfusions = [{ name: 'Packed Red Blood Cells (PRBC)', remainingVolume: 1000 }];

      // Tick for 60 seconds of high-flow transfusion
      let currentState = state;
      for (let sec = 1; sec <= 60; sec++) {
        const out = FluidicsEngine.tick(1, currentState);
        currentState.patient.accessLines = out.accessLines;
        currentState.electrolytes = out.electrolytes;
        currentState.coags = out.coags;
        currentState.time = sec;
      }

      // Calcium should drop below 2.2 mmol/L due to citrate binding load
      expect(currentState.electrolytes.ca).toBeLessThan(2.2);
    });

    it('should induce dilutional hyperchloremic metabolic acidosis when large volumes of Normal Saline are infused', () => {
      const state = createBaselineState();
      state.patient.accessLines[0].fluidLine = 'belmont';
      state.patient.accessLines[0].activeInfusions = [{ name: 'Normal Saline (0.9% NS)', remainingVolume: 2000 }];

      let currentState = state;
      for (let sec = 1; sec <= 120; sec++) {
        const out = FluidicsEngine.tick(1, currentState);
        currentState.patient.accessLines = out.accessLines;
        currentState.electrolytes = out.electrolytes;
        currentState.coags = out.coags;
        currentState.time = sec;
      }

      // NS has Cl = 154. Dilutional acidosis drop: Cl > 110 drops pH by 0.05 per liter of NS infused
      expect(currentState.electrolytes.ph).toBeLessThan(7.40);
    });
  });

  describe('4. Blood Bank Time-Locked Delivery Countdown', () => {
    it('should decrement countdown, trigger midway milestone, and deliver blood cooler units at 0', () => {
      const state = createBaselineState();
      state.patient.bloodBank = {
        status: 'ordered',
        unitsInOR: 0,
        deliveryCountdown: 300, // 5 minutes (Type & Screen)
        totalDeliveryTime: 300,
        pendingUnits: 4,
        preOpWorkup: 'screen'
      };

      // Tick forward by 150 seconds to cross the halfway mark
      let currentState = state;
      let halfwayEventFound = false;

      for (let sec = 1; sec <= 150; sec++) {
        const out = FluidicsEngine.tick(1, currentState);
        currentState.patient.bloodBank = out.bloodBank;
        currentState.time = sec;
        
        if (out.events.length > 0 && out.events.some(ev => ev.msg.includes('Cooler is halfway to the OR'))) {
          halfwayEventFound = true;
        }
      }

      expect(currentState.patient.bloodBank.deliveryCountdown).toBe(150);
      expect(halfwayEventFound).toBe(true);

      // Tick by 90 seconds more (reaches 240s, 60s remaining)
      let sixtyEventFound = false;
      for (let sec = 151; sec <= 240; sec++) {
        const out = FluidicsEngine.tick(1, currentState);
        currentState.patient.bloodBank = out.bloodBank;
        currentState.time = sec;
        
        if (out.events.length > 0 && out.events.some(ev => ev.msg.includes('Cooler arriving in 60 seconds'))) {
          sixtyEventFound = true;
        }
      }

      expect(currentState.patient.bloodBank.deliveryCountdown).toBe(60);
      expect(sixtyEventFound).toBe(true);

      // Tick by remaining 60 seconds to reach 0 (delivery completion)
      let arrivalEventFound = false;
      for (let sec = 241; sec <= 300; sec++) {
        const out = FluidicsEngine.tick(1, currentState);
        currentState.patient.bloodBank = out.bloodBank;
        currentState.time = sec;
        
        if (out.events.length > 0 && out.events.some(ev => ev.msg.includes('Cooler has arrived in the OR'))) {
          arrivalEventFound = true;
        }
      }

      // Check final blood bank state
      expect(currentState.patient.bloodBank.deliveryCountdown).toBe(0);
      expect(currentState.patient.bloodBank.status).toBe('available');
      expect(currentState.patient.bloodBank.unitsInOR).toBe(4);
      expect(arrivalEventFound).toBe(true);
    });
  });
});
