export interface HepaticPatientState {
  cirrhosisFactor?: number;       // 0.0 - 1.0
  bilirubin?: number;             // mg/dL, normal 1.0
  inr?: number;                   // normal 1.0
  creatinine?: number;           // mg/dL, normal 1.0
  albumin?: number;              // g/dL, normal 4.0
  encephalopathyGrade?: number;   // 0 - 4 West Haven criteria
  ascitesDegree?: number;         // 0 (none), 1 (slight), 2 (moderate/refractory)
  surgicalProcedure?: string;     // e.g., 'hepatic_resection'
  varicealBleedingActive?: boolean;
  varicealBleedTime?: number;
  hasPoPHCollapse?: boolean;
  hasTIPS?: boolean;
}

export interface HepaticVitalsState {
  mPAP?: number;
  HVPG?: number;
  pbf?: number;
  habf?: number;
  thbf?: number;
  renalArteryResistance?: number;
}

export interface HepaticOutput {
  pbf: number;
  habf: number;
  thbf: number;
  HVPG: number;
  mPAP: number;
  renalArteryResistance: number;
  creatinine: number;
  varicealBleedingActive: boolean;
  varicealBleedTime: number | null;
  hasPoPHCollapse: boolean;
  activeBleedRate: number; // in mL/s
  childPughScore: number;
  childPughClass: string;
  meldScore: number;
  hpsShunt: number;
  events: string[];
}

export class HepaticEngine {
  /**
   * Ticks the hepatic physiological engine forward by 1 second.
   * Pure function, deterministic, headless, and free of side effects.
   */
  static tick(
    dt: number = 1,
    st: { patient: HepaticPatientState; vitals: HepaticVitalsState; time: number },
    activeMeds: { name: string; Ce: number }[],
    inputs: {
      coRatio: number;
      map: number;
      sys: number;
      spo2: number;
      paco2: number;
      temp: number;
      cvp: number;
      surgicalPhase: string;
      renalRatio: number;
      FiO2: number;
    }
  ): HepaticOutput {
    const events: string[] = [];
    const patient = st.patient || {};
    const safeTime = typeof st.time === 'number' && Number.isFinite(st.time) ? st.time : 0;

    // 1. Sanitize factors & baseline patient metrics
    const cirrhosisFactor = typeof patient.cirrhosisFactor === 'number' && Number.isFinite(patient.cirrhosisFactor)
      ? Math.max(0.0, Math.min(1.0, patient.cirrhosisFactor))
      : 0.0;

    let bilirubin = typeof patient.bilirubin === 'number' && Number.isFinite(patient.bilirubin) ? patient.bilirubin : 1.0;
    let inr = typeof patient.inr === 'number' && Number.isFinite(patient.inr) ? patient.inr : 1.0;
    let creatinine = typeof patient.creatinine === 'number' && Number.isFinite(patient.creatinine) ? patient.creatinine : 1.0;
    const albumin = typeof patient.albumin === 'number' && Number.isFinite(patient.albumin) ? patient.albumin : 4.0;
    const encephalopathyGrade = typeof patient.encephalopathyGrade === 'number' && Number.isFinite(patient.encephalopathyGrade)
      ? Math.max(0, Math.min(4, Math.floor(patient.encephalopathyGrade)))
      : 0;
    const ascitesDegree = typeof patient.ascitesDegree === 'number' && Number.isFinite(patient.ascitesDegree)
      ? Math.max(0, Math.min(2, Math.floor(patient.ascitesDegree)))
      : 0;

    // 2. Hepatic Blood Flow Calculations (PBF, HABF, THBF)
    // PBF is reduced by cirrhosis and scales with cardiac output ratio
    const pbf = 1000.0 * Math.max(0.1, inputs.coRatio) * (1.0 - 0.5 * cirrhosisFactor);

    // Volatiles (Sevoflurane/Isoflurane/Desflurane) blunt HABR by up to 60%
    const volatileModel = activeMeds.find(m => m.name === 'Sevoflurane' || m.name === 'Isoflurane' || m.name === 'Desflurane');
    const volatileMac = volatileModel ? 1.0 : 0.0; // simple MAC indicator
    
    // HABR is also blunted by hypotension (MAP < 60 mmHg)
    const mapBlunting = Math.max(0.1, Math.min(1.0, (inputs.map - 40.0) / 20.0));
    const habrEfficiency = Math.max(0.0, 1.0 - 0.6 * volatileMac) * mapBlunting;

    // Hepatic Arterial Buffer Response (HABR): compensates for drops in portal inflow
    const habf = 300.0 + Math.max(0.0, 0.5 * (1000.0 - pbf)) * habrEfficiency;
    const thbf = pbf + habf;

    // 3. Portal Hypertension (HVPG)
    // Normal HVPG is 5 mmHg. If cirrhosis is present, it rises. TIPS decompresses it.
    let HVPG = 5.0 + 15.0 * cirrhosisFactor * (thbf / 1300.0);
    if (patient.hasTIPS) {
      HVPG = Math.min(12.0, HVPG);
    }

    // 4. Variceal Bleeding
    let varicealBleedingActive = !!patient.varicealBleedingActive;
    let varicealBleedTime = typeof patient.varicealBleedTime === 'number' ? patient.varicealBleedTime : null;
    let activeBleedRate = 0.0; // in mL/s

    // Splanchnic vasoconstrictor effect (Terlipressin, Octreotide, Norepinephrine)
    const terlipressinModel = activeMeds.find(m => m.name === 'Terlipressin');
    const octreotideModel = activeMeds.find(m => m.name === 'Octreotide');
    const norepiModel = activeMeds.find(m => m.name === 'Norepinephrine');
    
    const terliCe = terlipressinModel ? terlipressinModel.Ce : 0.0;
    const octCe = octreotideModel ? octreotideModel.Ce : 0.0;
    const norepiCe = norepiModel ? norepiModel.Ce : 0.0;

    const splanchnicConstriction = Math.min(0.85, 0.8 * (terliCe * 5.0 + octCe * 5.0) + 0.15 * Math.min(1.0, norepiCe * 10.0));

    // Bleeding trigger: HVPG > 12 mmHg and sudden systolic pressure spike (> 160 mmHg) or severe stress (C_cat > 30)
    const bleedTriggerPressure = inputs.sys > 160.0 || inputs.map > 115.0;
    if (cirrhosisFactor > 0.5 && HVPG > 12.0 && bleedTriggerPressure && !varicealBleedingActive && !patient.hasTIPS) {
      varicealBleedingActive = true;
      varicealBleedTime = safeTime;
      events.push("🚨 CRITICAL EMERGENCY: Sudden hypertensive pressure surge triggered rupture of gastroesophageal varices! Active massive upper gastrointestinal bleeding has begun.");
    }

    if (varicealBleedingActive) {
      // Bleeding rate scales with HVPG and is blunted by splanchnic vasoconstriction
      const baseBleed = 2.0 * Math.max(0.5, HVPG - 10.0); // mL/s
      activeBleedRate = baseBleed * (1.0 - splanchnicConstriction);

      // Resolution criteria: MAP drops too low (collapses flow, self-limiting) or vasoconstrictors control it for > 60 seconds
      const vasoconstrictorsControlling = splanchnicConstriction > 0.6;
      const timeSinceBleed = varicealBleedTime !== null ? safeTime - varicealBleedTime : 0;

      if (inputs.map < 50.0) {
        varicealBleedingActive = false;
        varicealBleedTime = null;
        events.push("⚠️ CLINICAL UPDATE: Variceal bleeding halted due to profound circulatory collapse (hypotensive stasis).");
      } else if (vasoconstrictorsControlling && timeSinceBleed > 60) {
        varicealBleedingActive = false;
        varicealBleedTime = null;
        events.push("✅ SUCCESS: Splanchnic vasoconstrictor therapy successfully controlled and terminated the variceal hemorrhage.");
      }
    }

    // 5. Hepatorenal Syndrome (HRS)
    // Splanchnic vasodilation in cirrhosis causes compensatory renal vasoconstriction
    const renalArteryResistance = 1.0 + 3.0 * cirrhosisFactor * (1.0 - splanchnicConstriction);
    const dCreatinine = 0.0001 * renalArteryResistance - 0.0001 * inputs.renalRatio;
    creatinine = Math.max(0.4, Math.min(8.0, creatinine + dCreatinine * dt));

    if (creatinine > 1.5 && patient.creatinine <= 1.5) {
      events.push("🚨 CLINICAL UPDATE: Serum creatinine has risen above 1.5 mg/dL, meeting diagnostic criteria for Acute Kidney Injury (AKI).");
    }
    if (creatinine > 2.5 && renalArteryResistance > 2.5 && !terlipressinModel && !octreotideModel) {
      if (safeTime % 30 === 0) {
        events.push("🚨 WARNING: Progressive renal vasoconstriction and rising creatinine indicate active Type 1 Hepatorenal Syndrome (HRS). Administer Albumin and splanchnic vasoconstrictors (Terlipressin/Norepinephrine).");
      }
    }

    // 6. Portopulmonary Hypertension (PoPH) & Right-Sided Cardiac Failure
    // Normal mPAP is 15 mmHg. Cirrhosis increases it.
    const mPAP = 15.0 + 25.0 * cirrhosisFactor;
    let hasPoPHCollapse = !!patient.hasPoPHCollapse;

    if (mPAP > 35.0 && !hasPoPHCollapse) {
      // Acute PVR stressors trigger RV failure & PEA collapse
      const hypoxicStressor = inputs.spo2 < 85.0;
      const hypercapnicStressor = inputs.paco2 > 50.0;
      const acidoticStressor = inputs.temp < 35.0; // severe hypothermia

      if (hypoxicStressor || hypercapnicStressor || acidoticStressor) {
        hasPoPHCollapse = true;
        events.push("🚨 CRITICAL EMERGENCY: Acute pulmonary vasoconstriction stressor (hypoxia/hypercapnia) in a Portopulmonary Hypertension (PoPH) patient has precipitated acute right ventricular overload and cardiovascular collapse (PEA arrest)!");
      }
    }

    // 7. Hepatopulmonary Syndrome (HPS)
    // Causes intrapulmonary vascular dilations resulting in a right-to-left shunt
    const hpsShunt = 0.25 * cirrhosisFactor * (1.0 - 0.2 * (inputs.FiO2 / 100.0));

    // 8. Child-Pugh Score & Class Calculation
    let cpPoints = 0;
    
    // Ascites
    if (ascitesDegree === 0) cpPoints += 1;
    else if (ascitesDegree === 1) cpPoints += 2;
    else cpPoints += 3;

    // Bilirubin
    if (bilirubin < 2.0) cpPoints += 1;
    else if (bilirubin >= 2.0 && bilirubin <= 3.0) cpPoints += 2;
    else cpPoints += 3;

    // Albumin
    if (albumin > 3.5) cpPoints += 1;
    else if (albumin >= 2.8 && albumin <= 3.5) cpPoints += 2;
    else cpPoints += 3;

    // INR
    if (inr < 1.7) cpPoints += 1;
    else if (inr >= 1.7 && inr <= 2.3) cpPoints += 2;
    else cpPoints += 3;

    // Encephalopathy
    if (encephalopathyGrade === 0) cpPoints += 1;
    else if (encephalopathyGrade <= 2) cpPoints += 2;
    else cpPoints += 3;

    let childPughClass = 'A';
    if (cpPoints >= 7 && cpPoints <= 9) childPughClass = 'B';
    else if (cpPoints >= 10) childPughClass = 'C';

    // 9. MELD Score Calculation
    // meld = 3.78*ln(bilirubin) + 11.2*ln(inr) + 9.57*ln(creatinine) + 6.43
    const safeBiliForLn = Math.max(1.0, bilirubin);
    const safeINRForLn = Math.max(1.0, inr);
    const safeCreatForLn = Math.max(1.0, creatinine);
    const rawMeld = 3.78 * Math.log(safeBiliForLn) + 11.2 * Math.log(safeINRForLn) + 9.57 * Math.log(safeCreatForLn) + 6.43;
    const meldScore = Math.max(6, Math.min(40, Math.round(rawMeld)));

    // 10. Low CVP Resection Bleeding
    if (patient.surgicalProcedure === 'hepatic_resection' && inputs.surgicalPhase === 'Resection') {
      const resectionBleedRate = inputs.cvp < 5.0
        ? 0.5 // minimal bleeding if CVP < 5
        : 2.5 + 1.5 * (inputs.cvp - 5.0); // heavy venous back-bleeding if CVP >= 5
      activeBleedRate += resectionBleedRate;
    }

    return {
      pbf: parseFloat(pbf.toFixed(1)),
      habf: parseFloat(habf.toFixed(1)),
      thbf: parseFloat(thbf.toFixed(1)),
      HVPG: parseFloat(HVPG.toFixed(2)),
      mPAP: parseFloat(mPAP.toFixed(1)),
      renalArteryResistance: parseFloat(renalArteryResistance.toFixed(3)),
      creatinine: parseFloat(creatinine.toFixed(5)),
      varicealBleedingActive,
      varicealBleedTime,
      hasPoPHCollapse,
      activeBleedRate: parseFloat(activeBleedRate.toFixed(3)),
      childPughScore: cpPoints,
      childPughClass,
      meldScore,
      hpsShunt: parseFloat(hpsShunt.toFixed(4)),
      events
    };
  }
}
