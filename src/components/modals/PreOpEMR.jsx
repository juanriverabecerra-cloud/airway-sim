import React, { useState, useEffect } from 'react';
import { X, Activity, FileText, ClipboardList, CheckSquare, ShieldAlert, Award, Play, ArrowLeft, ArrowRight } from 'lucide-react';
import { calculateLungVolumes, calculateIBW, calculateLBW } from '../../engine/Pharmacology';

export const PreOpEMR = ({ show, close, stagedCase, setStagedCase, onStart, logEvent, intraop = false }) => {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'orders' | 'results' | 'risk' | 'plan'
  
  // Extract patient/case details safely
  const patient = stagedCase?.patient || {};
  const heightCm = patient.height || 170;
  const weightKg = patient.weight || 70;
  const age = patient.age || 40;
  const sex = patient.sex || 'male';
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const ibw = calculateIBW(heightCm, sex);
  const lbw = calculateLBW(heightCm, weightKg, sex);
  const bsa = Math.sqrt((heightCm * weightKg) / 3600); // Mosteller formula
  const ebv = sex === 'male' ? weightKg * 70 : weightKg * 65;

  // Calculate pre-op lung volumes
  const lungVols = calculateLungVolumes(heightCm, age, sex, bmi, 'Sitting');

  // Pre-op Order Entry State
  const [orders, setOrders] = useState({
    labs: {
      cbc: false,
      bmp: false,
      coags: false,
      lfts: false,
      typeAndScreen: false,
      typeAndCross: false,
      hba1c: false,
      pregnancy: false,
      urinalysis: false,
      thyroid: false
    },
    diagnostics: {
      ecg: false,
      cxr: false,
      tte: false,
      pfts: false,
      stressTest: false
    },
    consults: {
      cardiology: false,
      pulmonology: false,
      hematology: false,
      endocrinology: false
    }
  });

  useEffect(() => {
    if (!stagedCase) return;
    const savedOrders = stagedCase.preOpOrders || stagedCase.patient?.preOpOrders;
    if (savedOrders) {
      setOrders(savedOrders);
    }
  }, [stagedCase]);

  useEffect(() => {
    if (!stagedCase) return;
    const verified = stagedCase.patient?.verifiedRisk;
    if (verified && verified.verified) {
      setAssessment({
        rcriHighRisk: verified.rcriHighRisk || false,
        rcriIhd: verified.rcriIhd || false,
        rcriChf: verified.rcriChf || false,
        rcriCva: verified.rcriCva || false,
        rcriInsulin: verified.rcriInsulin || false,
        rcriCr: verified.rcriCr || false,
        mets: verified.mets || '',
        asa: verified.asa || '',
        mallampati: verified.mallampati || '',
        neckMobility: verified.neckMobility || '',
        npoStatus: verified.npoStatus || ''
      });
      setAssessmentVerified(true);
      setAssessmentChecked(true);
    }
  }, [stagedCase]);

  const handleOrderChange = (category, test, value) => {
    if (intraop) return; // Prevent order edits when in surgery
    const updated = {
      ...orders,
      [category]: {
        ...orders[category],
        [test]: value
      }
    };
    setOrders(updated);
    
    // Save to stagedCase state
    if (setStagedCase) {
      setStagedCase(prev => ({
        ...prev,
        preOpOrders: updated
      }));
    }
  };


  // Interactive Clinical Assessment Wizard States & Ground Truths
  const [assessment, setAssessment] = useState({
    rcriHighRisk: false,
    rcriIhd: false,
    rcriChf: false,
    rcriCva: false,
    rcriInsulin: false,
    rcriCr: false,
    mets: '',
    asa: '',
    mallampati: '',
    neckMobility: '',
    npoStatus: ''
  });
  const [assessmentVerified, setAssessmentVerified] = useState(false);
  const [assessmentErrors, setAssessmentErrors] = useState({});
  const [assessmentChecked, setAssessmentChecked] = useState(false);

  const getGroundTruth = () => {
    if (!stagedCase) return {};
    const id = stagedCase.id || '';
    const patient = stagedCase.patient || {};
    
    // 1. Calculate BMI
    const heightCm = patient.height || 170;
    const weightKg = patient.weight || 70;
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    
    // 2. RCRI factors
    // High-risk surgical procedure (intraperitoneal, intrathoracic, or suprainguinal vascular)
    const rcriHighRisk = !!(patient.trauma || patient.isSeptic || ['cardiac', 'thoracic', 'neuro', 'vascular', 'urology', 'transplant', 'obgyn'].includes(id) || ['CABG', 'Craniotomy', 'Laparotomy', 'Thoracotomy', 'AAA Repair', 'Nephrectomy', 'Liver Transplant', 'C-Section'].some(p => (patient.procedure || '').includes(p)));
    
    const rcriIhd = !!(patient.cad || (patient.pmhx || '').toLowerCase().includes('cad') || (patient.pmhx || '').toLowerCase().includes('coronary') || (patient.pmhx || '').toLowerCase().includes('ischemic') || (patient.pmhx || '').toLowerCase().includes('angina') || id === 'cardiac');
    
    const rcriChf = !!(patient.chf || (patient.pmhx || '').toLowerCase().includes('heart failure') || (patient.pmhx || '').toLowerCase().includes('chf') || (patient.ef && patient.ef < 40) || id === 'cardiac' || id === 'bariatric');
    
    const rcriCva = !!(patient.cva || (patient.pmhx || '').toLowerCase().includes('stroke') || (patient.pmhx || '').toLowerCase().includes('cva') || (patient.pmhx || '').toLowerCase().includes('tia'));
    
    const rcriInsulin = !!(patient.insulin || (patient.pmhx || '').toLowerCase().includes('insulin') || id === 'bariatric');
    
    const rcriCr = !!(patient.gfr < 40 || patient.creatinine > 2.0 || (patient.renalComorbidity && !patient.renalComorbidity.includes('stage 1') && !patient.renalComorbidity.includes('stage 2')) || id === 'urology');

    // 3. METs Functional capacity
    let mets = 'adequate';
    if (patient.trauma || patient.isSeptic || patient.chf || patient.cad || patient.copd || patient.cirrhosis || patient.age > 75 || id === 'cardiac' || id === 'transplant' || id === 'urology' || id === 'vascular' || id === 'bariatric' || id === 'thoracic') {
      mets = 'poor';
    }

    // 4. ASA Classification
    let asa = 'ASA II';
    if (patient.trauma || patient.isSeptic || (patient.ef && patient.ef < 40) || patient.childPugh === 'C' || id === 'cardiac' || id === 'transplant') {
      asa = 'ASA IV';
    } else if (patient.chf || patient.cad || patient.copd || patient.gfr < 60 || patient.cirrhosis || bmi >= 35 || id === 'bariatric' || id === 'urology' || id === 'vascular') {
      asa = 'ASA III';
    } else if (id === 'general' || id === 'normal' || (bmi < 30 && patient.age < 40 && !patient.htn && !patient.penicillinAllergy && !patient.chf && !patient.cad && !patient.copd)) {
      asa = 'ASA I';
    }

    // 5. Mallampati
    let mallampati = 'Class I';
    if (patient.mallampati === 2) mallampati = 'Class II';
    else if (patient.mallampati === 3) mallampati = 'Class III';
    else if (patient.mallampati === 4) mallampati = 'Class IV';

    // 6. Neck mobility
    const neckMobility = (patient.neckMobility === 'reduced' || patient.neckMobility === 'limited' || (patient.neckMobility || '').toLowerCase().includes('reduced') || (patient.neckMobility || '').toLowerCase().includes('limited')) ? 'Reduced' : 'Normal';

    // 7. NPO status
    const npoStatus = (patient.emergentRSI || patient.npoSolids < 6 || patient.npoLiquids < 2 || bmi > 40 || patient.trauma || patient.isSeptic || id === 'bariatric') ? 'Aspiration Risk' : 'Compliant';

    // 8. Texts
    const pronounSubject = patient.sex === 'female' ? 'She' : 'He';
    const pronounPossessive = patient.sex === 'female' ? 'Her' : 'His';
    const pronounObject = patient.sex === 'female' ? 'her' : 'him';
    const nameGender = patient.sex === 'female' ? 'female' : 'male';

    let medicalHistory = '';
    if (id === 'normal' || id === 'general') {
      medicalHistory = `You are interviewing a ${patient.age}-year-old ${nameGender} in the pre-operative holding area. ${pronounSubject} is scheduled for an elective ${patient.procedure || 'laparoscopic cholecystectomy'}. When asked about exercise tolerance, ${pronounSubject.toLowerCase()} tells you ${pronounSubject.toLowerCase()} jogs daily without any chest pain, shortness of breath, or dizziness. ${pronounSubject} has never been hospitalized, takes no daily medications, and denies any history of chronic diseases.`;
    } else if (id === 'trauma') {
      medicalHistory = `EMS brings in a ${patient.age}-year-old ${nameGender}, unrestrained passenger from a high-speed motor vehicle collision. ${pronounSubject} is obtunded with a Glasgow Coma Scale of 7, and emergent intubation is requested by the trauma surgery team. ${pronounSubject} is hemodynamically unstable. ${pronounPossessive} family reports that ${pronounSubject.toLowerCase()} has no prior cardiac history, no diabetes, no kidney disease, and was not on any daily medications.`;
    } else if (id === 'urology' && patient.isSeptic) {
      medicalHistory = `You are called to the ICU to evaluate a ${patient.age}-year-old ${nameGender} for emergent source control surgery. The patient is febrile, confused, and on a norepinephrine infusion to maintain blood pressure. Blood cultures have grown Gram-negative rods. ${pronounSubject} has a history of coronary artery disease (prior myocardial infarction) and chronic kidney disease stage III.`;
    } else {
      medicalHistory = `You are evaluating a ${patient.age}-year-old ${nameGender} scheduled for a ${patient.procedure || 'surgery'} in the ${patient.position || 'Supine'} position. ${pronounSubject} has a chronic medical history of ${patient.pmhx || 'no significant chronic diseases'}. ${pronounPossessive} daily medications include ${patient.onBetaBlocker ? 'beta-blockers' : 'standard regimens'}. ${pronounSubject} describes ${pronounPossessive} exercise capacity as ${mets === 'adequate' ? 'adequate (able to climb stairs or walk briskly without symptoms)' : 'poor (severely limited by dyspnea or pain)'}.`;
    }

    let globalHistory = `A ${patient.age}-year-old ${patient.sex || 'patient'} presenting for ${patient.procedure || 'surgery'}. Relevant baseline parameters include a BMI of ${bmi.toFixed(1)} (${bmi > 30 ? 'obese' : 'normal weight'}), and the following documented comorbidities: ${patient.pmhx || 'none'}. The clinical concern for anesthesia is the combination of the patient's physiological state and the ${rcriHighRisk ? 'high-risk surgical stress' : 'intermediate-risk procedure'}.`;

    let airwayExam = '';
    if (id === 'normal' || id === 'general') {
      airwayExam = `You ask the patient to sit upright and open ${pronounPossessive.toLowerCase()} mouth wide. ${pronounSubject} opens widely with full mandibular excursion. You observe the entire soft palate, the fauces, the full uvula from tip to base, and tonsillar pillars (Class I). ${pronounSubject} achieves full atlanto-occipital extension without limitation or pain. Thyromental distance measures approximately 7 cm.`;
    } else if (id === 'trauma') {
      airwayExam = `The patient is obtunded (GCS 7) and cannot follow commands. A rigid cervical collar is in place, preventing neck extension. You attempt to open the mouth and observe massive, active oropharyngeal hemorrhage. Thick blood is pooling in the posterior pharynx, completely obscuring all soft tissue structures (Class IV). Neck extension is mechanically zero due to the C-collar.`;
    } else {
      airwayExam = `Airway evaluation reveals: Mouth opening is ${patient.mallampati <= 2 ? 'adequate (3+ fingerbreadths)' : 'moderately restricted'}. Mallampati classification is assessed as ${mallampati}. Neck extension and atlanto-occipital mobility is ${neckMobility === 'Reduced' ? 'mechanically restricted or limited' : 'normal and full'}. TMD is approximately ${patient.mallampati >= 3 ? '5-6 cm' : '7-8 cm'}.`;
    }

    let npoHistory = `The patient's NPO status is reviewed. Last solid food intake was ${patient.npoSolids || 8} hours ago, and last clear liquid intake was ${patient.npoLiquids || 4} hours ago. `;
    if (npoStatus === 'Aspiration Risk') {
      npoHistory += `This patient is classified as a HIGH ASPIRATION RISK due to ${patient.emergentRSI ? 'emergent surgical status' : patient.npoSolids < 6 ? 'inadequate fasting time for solids' : bmi > 40 ? 'severe obesity (BMI > 40) delaying gastric emptying' : 'delayed gastric motility secondary to acute illness'}. Rapid Sequence Induction (RSI) is highly indicated.`;
    } else {
      npoHistory += `NPO status is fully compliant with standard ASA guidelines (>= 6 hours for solids, >= 2 hours for clear liquids). Aspiration risk is low.`;
    }

    return {
      rcriHighRisk,
      rcriIhd,
      rcriChf,
      rcriCva,
      rcriInsulin,
      rcriCr,
      mets,
      asa,
      mallampati,
      neckMobility,
      npoStatus,
      medicalHistory,
      globalHistory,
      airwayExam,
      npoHistory
    };
  };

  const verifyAssessment = () => {
    const truth = getGroundTruth();
    const errors = {};
    let hasError = false;

    // Check RCRI
    if (assessment.rcriHighRisk !== truth.rcriHighRisk) {
      errors.rcriHighRisk = truth.rcriHighRisk 
        ? "Emergency trauma/septic surgery counts as a high-risk surgical procedure." 
        : "Elective laparoscopic or hernia surgeries are not high-risk procedures (intermediate/low risk).";
      hasError = true;
    }
    if (assessment.rcriIhd !== truth.rcriIhd) {
      errors.rcriIhd = truth.rcriIhd 
        ? "Patient has a documented history of Ischemic Heart Disease (CAD, prior MI)." 
        : "Patient has no history of Ischemic Heart Disease.";
      hasError = true;
    }
    if (assessment.rcriChf !== truth.rcriChf) {
      errors.rcriChf = truth.rcriChf 
        ? "Patient has a documented history of heart failure (EF 35%)." 
        : "Patient has no history of congestive heart failure.";
      hasError = true;
    }
    if (assessment.rcriCva !== truth.rcriCva) {
      errors.rcriCva = "Patient has no history of stroke or cerebrovascular disease.";
      hasError = true;
    }
    if (assessment.rcriInsulin !== truth.rcriInsulin) {
      errors.rcriInsulin = truth.rcriInsulin 
        ? "Patient is on preoperative insulin treatment for diabetes." 
        : "Patient does not have insulin-dependent diabetes.";
      hasError = true;
    }
    if (assessment.rcriCr !== truth.rcriCr) {
      errors.rcriCr = truth.rcriCr 
        ? "Patient's baseline creatinine is > 2.0 mg/dL (CKD Stage III, Cr 2.2)." 
        : "Patient's baseline creatinine is normal (< 2.0 mg/dL).";
      hasError = true;
    }

    // Check METs
    if (assessment.mets !== truth.mets) {
      errors.mets = truth.mets === 'adequate' 
        ? "Correct functional capacity is Adequate (≥ 4 METs) - patient can walk briskly or climb 1-2 flights of stairs without limiting symptoms." 
        : "Correct functional capacity is Poor (< 4 METs / Unknown) - walk capacity is severely limited by dyspnea/pain or patient is comatose/GCS 7.";
      hasError = true;
    }

    // Check ASA
    if (assessment.asa !== truth.asa) {
      errors.asa = `Correct ASA classification is ${truth.asa}. ` + (
        truth.asa === 'ASA I' ? "Healthy patient without systemic illness." :
        truth.asa === 'ASA III' ? "Morbid obesity (BMI 45), severe OSA, insulin-dependent diabetes, and heart failure (EF 35%) qualify as severe, limiting systemic disease (ASA III)." :
        truth.asa === 'ASA IV' ? "Septic shock or acute traumatic hemorrhage with GCS 7 is a severe systemic disease that is a constant threat to life (ASA IV)." : "Mild/moderate systemic illness."
      );
      hasError = true;
    }

    // Check Mallampati
    if (assessment.mallampati !== truth.mallampati) {
      errors.mallampati = `Correct Mallampati class is ${truth.mallampati}. ` + (
        truth.mallampati === 'Class I' ? "Soft palate, fauces, uvula, and pillars are fully visible." :
        truth.mallampati === 'Class II' ? "Uvula and soft palate are partially visible." :
        truth.mallampati === 'Class III' ? "Only the base of the uvula and soft palate are visible." :
        "Airway bleeding completely obscures all visualization of the oral cavity (Class IV)."
      );
      hasError = true;
    }

    // Check Neck Mobility
    if (assessment.neckMobility !== truth.neckMobility) {
      errors.neckMobility = truth.neckMobility === 'Reduced' 
        ? "Correct neck mobility is Reduced (rigid cervical collar in trauma, or severe thick neck fat pad in obesity limits extension)." 
        : "Correct neck mobility is Normal (no anatomical limits to extension).";
      hasError = true;
    }

    // Check NPO
    if (assessment.npoStatus !== truth.npoStatus) {
      errors.npoStatus = truth.npoStatus === 'Aspiration Risk' 
        ? "Correct gastric status is Aspiration Risk: a full stomach is physiologically present due to eating recently, severe shock/sepsis-induced gastroparesis, or active Ozempic/Semaglutide delay." 
        : "Correct gastric status is NPO Compliant: fasted > 8 hours with no delay factors.";
      hasError = true;
    }

    setAssessmentErrors(errors);
    setAssessmentChecked(true);

    if (!hasError) {
      setAssessmentVerified(true);
      const score = (truth.rcriHighRisk?1:0) + (truth.rcriIhd?1:0) + (truth.rcriChf?1:0) + (truth.rcriCva?1:0) + (truth.rcriInsulin?1:0) + (truth.rcriCr?1:0);
      const verifiedData = {
        rcriHighRisk: truth.rcriHighRisk,
        rcriIhd: truth.rcriIhd,
        rcriChf: truth.rcriChf,
        rcriCva: truth.rcriCva,
        rcriInsulin: truth.rcriInsulin,
        rcriCr: truth.rcriCr,
        rcriScore: score,
        mets: truth.mets,
        asa: truth.asa,
        mallampati: truth.mallampati,
        neckMobility: truth.neckMobility,
        npoStatus: truth.npoStatus,
        verified: true
      };
      if (setStagedCase) {
        setStagedCase(prev => ({
          ...prev,
          patient: {
            ...prev.patient,
            verifiedRisk: verifiedData
          }
        }));
      }
    } else {
      setAssessmentVerified(false);
    }
  };

  // Generate dynamic results based on patient demographics and comorbidities
  const generatePreOpResults = () => {
    const res = {
      labs: {},
      diagnostics: {},
      consults: {}
    };

    // LABS
    if (orders.labs.cbc) {
      const isSeptic = patient.isSeptic;
      const hasBleeding = patient.trauma || (patient.ebl && patient.ebl > 0);
      const wbcVal = isSeptic ? 19.4 : 6.8;
      const hbVal = patient.anemia ? 8.9 : (isSeptic ? 11.2 : (hasBleeding ? 10.5 : 14.2));
      const hctVal = hbVal * 3;
      const pltVal = patient.thrombocytopenia ? 75 : (isSeptic ? 88 : 245);
      
      res.labs.cbc = {
        title: 'Complete Blood Count (CBC)',
        values: [
          { name: 'WBC', val: wbcVal.toFixed(1), range: '4.5 - 11.0 x10^3/µL', alert: wbcVal > 11.0 },
          { name: 'Hemoglobin (Hb)', val: hbVal.toFixed(1), range: '12.0 - 17.5 g/dL', alert: hbVal < 12.0 },
          { name: 'Hematocrit (Hct)', val: hctVal.toFixed(1), range: '36.0 - 50.0 %', alert: hctVal < 36.0 },
          { name: 'Platelets', val: pltVal, range: '150 - 450 x10^3/µL', alert: pltVal < 150 }
        ]
      };
    }

    if (orders.labs.bmp) {
      const isSeptic = patient.isSeptic;
      const isCkd = patient.ckd || (patient.renalStage && patient.renalStage > 0);
      const kVal = isCkd ? 5.4 : (patient.trauma ? 4.9 : 4.1);
      const crVal = isCkd ? 2.8 : (isSeptic ? 1.8 : 0.85);
      const glucVal = patient.diabetes ? 195 : (isSeptic ? 165 : 98);
      const bunVal = isCkd ? 48 : (isSeptic ? 28 : 12);
      
      res.labs.bmp = {
        title: 'Basic Metabolic Panel (BMP)',
        values: [
          { name: 'Sodium (Na)', val: '138', range: '135 - 145 mEq/L', alert: false },
          { name: 'Potassium (K)', val: kVal.toFixed(1), range: '3.5 - 5.1 mEq/L', alert: kVal > 5.1 },
          { name: 'Chloride (Cl)', val: '102', range: '96 - 106 mEq/L', alert: false },
          { name: 'CO2 (Bicarbonate)', val: isSeptic ? '17' : '24', range: '22 - 29 mEq/L', alert: isSeptic },
          { name: 'BUN', val: bunVal, range: '7 - 20 mg/dL', alert: bunVal > 20 },
          { name: 'Creatinine (Cr)', val: crVal.toFixed(2), range: '0.70 - 1.30 mg/dL', alert: crVal > 1.3 },
          { name: 'Glucose', val: glucVal, range: '70 - 100 mg/dL', alert: glucVal > 100 }
        ]
      };
    }

    if (orders.labs.coags) {
      const hasCoag = patient.coagulopathy || patient.cirrhosis;
      const inrVal = hasCoag ? 2.3 : 1.0;
      const ptVal = hasCoag ? 26.5 : 12.0;
      const pttVal = hasCoag ? 54.0 : 31.0;
      
      res.labs.coags = {
        title: 'Coagulation Panel',
        values: [
          { name: 'Prothrombin Time (PT)', val: ptVal.toFixed(1) + ' s', range: '11.0 - 13.5 s', alert: hasCoag },
          { name: 'INR', val: inrVal.toFixed(1), range: '0.8 - 1.2', alert: hasCoag },
          { name: 'Partial Thromboplastin Time (PTT)', val: pttVal.toFixed(1) + ' s', range: '25.0 - 35.0 s', alert: hasCoag }
        ]
      };
    }

    if (orders.labs.lfts) {
      const isCirrhosis = patient.cirrhosis;
      const astVal = isCirrhosis ? 134 : 22;
      const altVal = isCirrhosis ? 118 : 25;
      const alkVal = isCirrhosis ? 210 : 68;
      const biliVal = isCirrhosis ? 3.4 : 0.6;
      const albVal = isCirrhosis ? 2.5 : 4.1;

      res.labs.lfts = {
        title: 'Liver Function Tests (LFTs)',
        values: [
          { name: 'AST', val: astVal + ' U/L', range: '10 - 40 U/L', alert: isCirrhosis },
          { name: 'ALT', val: altVal + ' U/L', range: '7 - 56 U/L', alert: isCirrhosis },
          { name: 'Alkaline Phosphatase', val: alkVal + ' U/L', range: '44 - 147 U/L', alert: isCirrhosis },
          { name: 'Total Bilirubin', val: biliVal.toFixed(1) + ' mg/dL', range: '0.2 - 1.2 mg/dL', alert: isCirrhosis },
          { name: 'Albumin', val: albVal.toFixed(1) + ' g/dL', range: '3.5 - 5.0 g/dL', alert: isCirrhosis }
        ]
      };
    }

    if (orders.labs.typeAndScreen) {
      res.labs.typeAndScreen = {
        title: 'Type & Screen',
        values: [
          { name: 'ABO / Rh Type', val: sex === 'male' ? 'A Positive' : 'O Negative', range: 'N/A', alert: false },
          { name: 'Antibody Screen', val: 'Negative', range: 'Negative', alert: false }
        ]
      };
    }

    if (orders.labs.typeAndCross) {
      res.labs.typeAndCross = {
        title: 'Type & Crossmatch',
        values: [
          { name: 'Units Ordered', val: '2 Units PRBC', range: 'N/A', alert: false },
          { name: 'Crossmatch Status', val: 'Compatible - In Blood Bank', range: 'Compatible', alert: false }
        ]
      };
    }

    if (orders.labs.hba1c) {
      const a1c = patient.diabetes ? 8.4 : 5.3;
      res.labs.hba1c = {
        title: 'Glycated Hemoglobin (HbA1c)',
        values: [
          { name: 'HbA1c', val: a1c.toFixed(1) + ' %', range: '< 5.7 %', alert: patient.diabetes }
        ]
      };
    }

    if (orders.labs.pregnancy) {
      const isPregnant = patient.pregnancyStatus === 'pregnant' || patient.isPregnant;
      res.labs.pregnancy = {
        title: 'Pregnancy Screen (beta-hCG)',
        values: [
          { name: 'Urine beta-hCG', val: isPregnant ? 'POSITIVE' : 'NEGATIVE', range: 'NEGATIVE', alert: isPregnant }
        ]
      };
    }

    if (orders.labs.urinalysis) {
      const isSeptic = patient.isSeptic;
      res.labs.urinalysis = {
        title: 'Urinalysis',
        values: [
          { name: 'Appearance', val: isSeptic ? 'Cloudy' : 'Clear', range: 'Clear', alert: isSeptic },
          { name: 'Nitrite', val: isSeptic ? 'Positive' : 'Negative', range: 'Negative', alert: isSeptic },
          { name: 'Leukocyte Esterase', val: isSeptic ? 'Trace' : 'Negative', range: 'Negative', alert: isSeptic },
          { name: 'Protein', val: 'Negative', range: 'Negative', alert: false }
        ]
      };
    }

    if (orders.labs.thyroid) {
      const isHyper = patient.thyroid === 'hyper' || patient.hyperthyroid;
      const isHypo = patient.thyroid === 'hypo' || patient.hypothyroid;
      const tsh = isHyper ? 0.05 : (isHypo ? 14.5 : 1.8);
      const t4 = isHyper ? 3.2 : (isHypo ? 0.4 : 1.2);
      
      res.labs.thyroid = {
        title: 'Thyroid Panel',
        values: [
          { name: 'TSH', val: tsh.toFixed(2) + ' mIU/L', range: '0.40 - 4.00 mIU/L', alert: isHyper || isHypo },
          { name: 'Free T4', val: t4.toFixed(1) + ' ng/dL', range: '0.8 - 1.8 ng/dL', alert: isHyper || isHypo }
        ]
      };
    }

    // DIAGNOSTICS
    if (orders.diagnostics.ecg) {
      let finding = 'Normal sinus rhythm, normal axis, no acute ST-T wave abnormalities.';
      if (patient.cad) {
        finding = 'Sinus rhythm with deep Q waves in anterior leads (V1-V4), consistent with prior anteroseptal MI. Stable compared to prior ECG.';
      } else if (patient.chf || patient.htn) {
        finding = 'Sinus tachycardia, left ventricular hypertrophy (LVH) with lateral repolarization strain pattern. No acute ST elevations.';
      } else if (patient.afib) {
        finding = 'Atrial fibrillation with rapid ventricular response (RVR). Average ventricular rate 110 bpm. Normal axis, no acute ST segment changes.';
      }
      res.diagnostics.ecg = {
        title: '12-Lead Electrocardiogram (ECG)',
        finding
      };
    }

    if (orders.diagnostics.cxr) {
      let finding = 'Lungs are clear. Cardiothoracic ratio is normal. No pleural effusion or pneumothorax.';
      if (patient.chf) {
        finding = 'Cardiomegaly. Prominent pulmonary vasculature and mild peribronchial cuffing, consistent with chronic congestive heart failure. Small bilateral pleural effusions.';
      } else if (patient.copd) {
        finding = 'Hyperinflated lung fields, flattening of the diaphragms, and increased retrosternal clear space, typical of emphysematous changes. No active consolidations.';
      } else if (patient.isSeptic) {
        finding = 'Patchy bibasilar infiltrates, suspicious for early pneumonia. No large effusions or pneumothorax.';
      }
      res.diagnostics.cxr = {
        title: 'Chest X-Ray (PA & Lateral)',
        finding
      };
    }

    if (orders.diagnostics.tte) {
      let finding = 'Normal LV chamber size, EF 60%. No significant valvular disease, normal right ventricular size.';
      if (patient.chf) {
        finding = 'Severely dilated left ventricle, global hypokinesis, LVEF 25%. Moderate mitral regurgitation. Right ventricular systolic pressure elevated (35 mmHg).';
      } else if (patient.as) {
        finding = 'Severe calcific aortic stenosis. Valve area 0.8 cm², mean gradient 44 mmHg, peak velocity 4.2 m/s. Concentric LV hypertrophy, LVEF 55%.';
      } else if (patient.mr) {
        finding = 'Severe mitral regurgitation, posterior leaflet prolapse. LVEF 62%, dilated left atrium (5.1 cm). No pulmonary hypertension.';
      }
      res.diagnostics.tte = {
        title: 'Transthoracic Echocardiogram (TTE)',
        finding
      };
    }

    if (orders.diagnostics.pfts) {
      let finding = 'Normal spirometry: FEV1/FVC ratio 81%, FEV1 96% predicted, FVC 98% predicted.';
      if (patient.copd) {
        finding = 'Severe obstructive defect: FEV1/FVC ratio 44%, FEV1 38% predicted. Minimal improvement post-bronchodilator, indicating fixed obstruction.';
      } else if (patient.restrictive) {
        finding = 'Restrictive pattern: FEV1/FVC ratio 84% (normal), but FVC 48% predicted, TLC 52% predicted, indicating significant restriction.';
      }
      res.diagnostics.pfts = {
        title: 'Pulmonary Function Tests (PFTs)',
        finding
      };
    }

    if (orders.diagnostics.stressTest) {
      let finding = 'No evidence of inducible myocardial ischemia. Patient achieved submaximal target heart rate without symptoms or ECG changes.';
      if (patient.cad && (patient.mets === 'poor' || bmi > 35)) {
        finding = 'Positive Pharmacologic Stress Test: Reversible perfusion defect in the anterior wall and septum, suggestive of significant inducible ischemia in the LAD coronary artery territory.';
      }
      res.diagnostics.stressTest = {
        title: 'Pharmacologic Stress Test (Myocardial Perfusion)',
        finding
      };
    }

    // CONSULTS
    if (orders.consults.cardiology) {
      let advice = 'Low cardiac risk. Cleared to proceed with routine ASA standard monitoring.';
      if (patient.cad || patient.chf || patient.as) {
        advice = 'HIGH RISK CARDIAC PROFILE. 1) Continue aspirin, hold DOAC/Warfarin per guidelines. 2) Ensure beta-blocker and statin taken morning of surgery. 3) Maintain strict hemodynamic parameters: MAP > 65, avoid tachycardia (keep HR < 80). 4) Place pre-induction arterial line for beat-to-beat pressure monitoring. 5) Keep vasoactives (phenylephrine/norepinephrine) in line. 6) Transfusion threshold: Hb < 8.0 g/dL.';
      }
      res.consults.cardiology = {
        title: 'Cardiology Consultation Note',
        specialist: 'Dr. Elizabeth Vance, FACC',
        finding: advice
      };
    }

    if (orders.consults.pulmonology) {
      let advice = 'No active pulmonary concerns. Cleared for general anesthesia.';
      if (patient.copd) {
        advice = 'HIGH RISK OF BRONCHOSPASM & POST-OP VENTILATORY FAILURE. 1) Administer albuterol + ipratropium nebs pre-operatively. 2) Ensure deep plane of anesthesia and complete neuromuscular blockade prior to intubation. 3) Avoid histamine-releasing drugs (e.g. morphine, atracurium). 4) Vent settings: Volume control, tidal volume 6-8 mL/kg IBW, prolonged expiratory phase (I:E = 1:3 or 1:4) to prevent gas trapping / auto-PEEP. 5) Extubate fully awake and reversed.';
      }
      res.consults.pulmonology = {
        title: 'Pulmonology Consultation Note',
        specialist: 'Dr. Aaron Patel, FCCP',
        finding: advice
      };
    }

    if (orders.consults.hematology) {
      let advice = 'No hematological abnormalities noted. Routine surgical coagulation management.';
      if (patient.coagulopathy || patient.thrombocytopenia || patient.cirrhosis) {
        advice = 'HIGH COAGULOPATHY AND BLEEDING RISK. 1) Type & Crossmatch 2 units PRBC and 2 units FFP. 2) Check pre-op platelet count; if Platelets < 50,000, transfuse 1 pool of platelets pre-induction. 3) Avoid neuraxial anesthesia if platelets < 80,000 or INR > 1.5. 4) Use TEG intra-operatively to guide factor/platelet replacement. 5) Keep TXA (1g IV) available in the room.';
      }
      res.consults.hematology = {
        title: 'Hematology Consultation Note',
        specialist: 'Dr. Sarah Lin, MD',
        finding: advice
      };
    }

    if (orders.consults.endocrinology) {
      let advice = 'No active endocrinopathies requiring specialized management.';
      if (patient.diabetes) {
        advice = 'DIABETIC MANAGEMENT PLAN. 1) Check fingerstick blood glucose immediately pre-op. 2) Hold rapid-acting insulin. Take 50% of usual long-acting insulin (glargine/detemir) morning of surgery. 3) Hold oral hypoglycemics (metformin) and GLP-1 agonists (semaglutide) as per guidelines. 4) Intra-op target glucose: 140 - 180 mg/dL. 5) Check glucose Q2 hours intra-op; treat with IV insulin sliding scale if > 180.';
      }
      res.consults.endocrinology = {
        title: 'Endocrinology Consultation Note',
        specialist: 'Dr. Raymond Holt, MD',
        finding: advice
      };
    }

    return res;
  };

  const results = generatePreOpResults();

  // RCRI Score derived from user's assessment selections (NOT auto-computed from patient data)
  const rcriScore = (assessment.rcriHighRisk ? 1 : 0) + (assessment.rcriIhd ? 1 : 0) + (assessment.rcriChf ? 1 : 0) + (assessment.rcriCva ? 1 : 0) + (assessment.rcriInsulin ? 1 : 0) + (assessment.rcriCr ? 1 : 0);

  // Derived Risk Class and ACC/AHA Action Recommendation based on user selections
  let riskClass = '';
  let riskPercent = '';
  let accAction = '';
  let borderClass = '';

  if (rcriScore === 0) {
    riskClass = 'Class I';
    riskPercent = '0.4%';
    accAction = 'LOW RISK: Proceed to surgery without further workup.';
    borderClass = 'border-green-500 bg-green-950/20 text-green-400';
  } else if (rcriScore === 1) {
    riskClass = 'Class II';
    riskPercent = '0.9%';
    if (assessment.mets === 'poor') {
      accAction = 'LOW-INTERMEDIATE RISK: 12-Lead ECG recommended pre-operatively. Proceed with routine precautions.';
      borderClass = 'border-yellow-500 bg-yellow-950/20 text-yellow-400';
    } else {
      accAction = 'LOW RISK: Proceed to surgery.';
      borderClass = 'border-green-500 bg-green-950/20 text-green-400';
    }
  } else if (rcriScore === 2) {
    riskClass = 'Class III';
    riskPercent = '6.6%';
    if (assessment.mets === 'poor') {
      accAction = 'ELEVATED RISK: Pharmacologic Stress Test strongly recommended. Titrate beta-blockers and optimize cardiovascular therapies.';
      borderClass = 'border-orange-500 bg-orange-950/20 text-orange-400';
    } else {
      accAction = 'INTERMEDIATE RISK: Proceed with continuous intra-operative cardiovascular monitoring (A-line recommended).';
      borderClass = 'border-yellow-500 bg-yellow-950/20 text-yellow-400';
    }
  } else {
    riskClass = 'Class IV';
    riskPercent = '11.0%';
    accAction = 'HIGH RISK: Cardiology Consult required. Delay non-emergent surgery. Consider coronary angiography or cath lab referral.';
    borderClass = 'border-red-500 bg-red-950/20 text-red-400 animate-pulse';
  }

  // Accessor for ground truth vignettes (computed once, cached per render)
  const groundTruth = getGroundTruth();

  // Anesthesia Plan State — Multi-Modal
  const [anesthesiaPlan, setAnesthesiaPlan] = useState({
    // Multi-modal anesthesia: multiple techniques can be active simultaneously
    types: {
      GA: false,             // General Anesthesia (endotracheal, LMA)
      regional: false,       // Peripheral Nerve Block (adductor canal, TAP, etc.)
      neuraxial: false,      // Spinal or Epidural (central neuraxial blockade)
      mac: false             // Monitored Anesthesia Care / IV Sedation
    },
    // Airway plan (only relevant if GA is selected)
    airway: 'DL',            // 'DL' | 'VL' | 'AwakeFiberoptic'
    // Comprehensive monitoring: any combination of modalities
    monitors: {
      standard: true,        // Standard ASA monitors (SpO2, ECG, NIBP, EtCO2, Temp) — always on
      aline: false,          // Arterial Line (continuous invasive BP)
      cvc: false,            // Central Venous Catheter (CVP monitoring, vasopressor infusion)
      tee: false,            // Transesophageal Echocardiography
      bispectral: false,     // BIS / Depth of Anesthesia Monitor
      nervStim: false        // Peripheral Nerve Stimulator (twitch monitoring for NMB)
    },
    bloodConfirm: false,
    advisoryDismissed: false  // User has acknowledged and overridden clinical advisories
  });

  // Load saved plan if exists
  useEffect(() => {
    if (!stagedCase) return;
    const savedPlan = stagedCase.preOpPlan || stagedCase.patient?.preOpPlan;
    if (savedPlan) {
      setAnesthesiaPlan(savedPlan);
    }
  }, [stagedCase]);

  const handlePlanChange = (field, value) => {
    if (intraop) return; // Prevent edits when in surgery
    const updated = {
      ...anesthesiaPlan,
      [field]: value,
      // Reset advisory dismissal on any plan change so new advisories are shown
      advisoryDismissed: false
    };
    setAnesthesiaPlan(updated);

    if (setStagedCase) {
      setStagedCase(prev => ({
        ...prev,
        preOpPlan: updated
      }));
    }
  };

  const handleTypeToggle = (typeKey) => {
    if (intraop) return; // Prevent edits when in surgery
    const updated = {
      ...anesthesiaPlan,
      types: { ...anesthesiaPlan.types, [typeKey]: !anesthesiaPlan.types[typeKey] },
      advisoryDismissed: false
    };
    setAnesthesiaPlan(updated);
    if (setStagedCase) setStagedCase(prev => ({ ...prev, preOpPlan: updated }));
  };

  const handleMonitorToggle = (monKey) => {
    if (intraop) return; // Prevent edits when in surgery
    // Standard ASA monitors cannot be deselected
    if (monKey === 'standard') return;
    const updated = {
      ...anesthesiaPlan,
      monitors: { ...anesthesiaPlan.monitors, [monKey]: !anesthesiaPlan.monitors[monKey] },
      advisoryDismissed: false
    };
    setAnesthesiaPlan(updated);
    if (setStagedCase) setStagedCase(prev => ({ ...prev, preOpPlan: updated }));
  };

  // ── Clinical Advisory Rules Engine ──
  // Evaluates the current multi-modal anesthesia/monitoring selections against
  // evidence-based guidelines for the specific patient and surgical context.
  // Returns an array of { severity: 'warning'|'caution'|'info', message: string }
  const getAnesthesiaAdvisories = () => {
    const advisories = [];
    if (!stagedCase) return advisories;
    const { types, monitors, airway } = anesthesiaPlan;
    const id = stagedCase.id || '';
    const isEmergent = id === 'trauma' || id === 'septic';
    const isSeptic = id === 'septic';
    const isTrauma = id === 'trauma';
    const isElective = id === 'normal';
    const hasGA = types.GA;
    const hasRegional = types.regional;
    const hasNeuraxial = types.neuraxial;
    const hasMAC = types.mac;
    const anyTypeSelected = hasGA || hasRegional || hasNeuraxial || hasMAC;
    const verifiedRisk = stagedCase.patient?.verifiedRisk || {};

    // ── No technique selected ──
    if (!anyTypeSelected) {
      advisories.push({
        severity: 'caution',
        message: 'No anesthetic technique selected. At least one modality is required to proceed.'
      });
    }

    // ── GA + MAC redundancy ──
    if (hasGA && hasMAC) {
      advisories.push({
        severity: 'warning',
        message: 'MAC (Monitored Anesthesia Care) is inherently a subset of General Anesthesia. Selecting both is clinically redundant — MAC is only appropriate when GA is NOT being administered. Consider deselecting MAC if you intend to use GA, or deselect GA if you intend sedation-only.'
      });
    }

    // ── MAC-only for emergency/major surgery ──
    if (hasMAC && !hasGA && !hasNeuraxial && isEmergent) {
      advisories.push({
        severity: 'caution',
        message: 'MAC alone is contraindicated for emergent intra-abdominal or trauma surgery. These cases require either GA (with secured airway) or neuraxial anesthesia for surgical relaxation, hemodynamic control, and airway protection in hemodynamically unstable or obtunded patients.'
      });
    }

    // ── Neuraxial in coagulopathic/septic patients ──
    if (hasNeuraxial && isSeptic) {
      advisories.push({
        severity: 'caution',
        message: 'Neuraxial blockade in septic patients is relatively contraindicated due to: (1) Coagulopathy risk — DIC and thrombocytopenia are common in sepsis (ASRA Guidelines: platelet count must be ≥80,000 for epidural, ≥50,000 for spinal). (2) Hemodynamic instability — sympathectomy from neuraxial block will exacerbate vasoplegic shock. (3) Bacteremia — risk of epidural abscess or meningitis is elevated during active bacteremia. Consider GA with vasopressor support instead.'
      });
    }

    // ── Neuraxial in trauma with spinal injury risk ──
    if (hasNeuraxial && isTrauma) {
      advisories.push({
        severity: 'caution',
        message: 'Neuraxial blockade in acute trauma is contraindicated when: (1) Spinal injury has not been cleared (cervical collar in place implies uncleared C-spine). (2) Coagulopathy from hemorrhagic shock increases epidural hematoma risk. (3) Hemodynamic instability — sympathectomy-induced hypotension in hypovolemic trauma patients can be catastrophic. Consider GA with RSI for definitive airway protection.'
      });
    }

    // ── GA + Regional (optimal multi-modal) ──
    if (hasGA && hasRegional && isElective) {
      advisories.push({
        severity: 'info',
        message: 'Excellent multi-modal strategy: GA + Peripheral Nerve Block provides optimal surgical anesthesia with superior post-operative analgesia. This combination reduces opioid requirements by 40-60% (PROSPECT Guidelines), accelerates PACU discharge, and improves patient satisfaction. Consider TAP block or local infiltration for laparoscopic cholecystectomy.'
      });
    }

    // ── GA + Neuraxial (combined general-epidural) ──
    if (hasGA && hasNeuraxial && isElective) {
      advisories.push({
        severity: 'warning',
        message: 'Combined GA + Epidural is typically reserved for major open abdominal, thoracic, or vascular surgery — not laparoscopic cholecystectomy. The risk-benefit ratio of epidural catheter placement (epidural hematoma 1:150,000, abscess, dural puncture headache) does not justify the modest analgesic benefit for a minimally invasive procedure expected to last <90 minutes. Consider GA + TAP block or simple multimodal IV analgesia instead.'
      });
    }

    // ── Regional-only without GA for cases requiring airway protection ──
    if (hasRegional && !hasGA && !hasNeuraxial && !hasMAC) {
      advisories.push({
        severity: 'warning',
        message: 'A peripheral nerve block alone does not provide surgical anesthesia for intra-abdominal or intrathoracic procedures. Peripheral blocks provide analgesia for somatic pain only (abdominal wall, dermatome-specific). You must combine this with GA (for airway control and visceral anesthesia) or neuraxial blockade (for segmental visceral and somatic blockade).'
      });
    }

    // ── Airway mismatch: DL with anticipated difficult airway ──
    if (hasGA && airway === 'DL' && (verifiedRisk.mallampati === 'Class III' || verifiedRisk.mallampati === 'Class IV' || verifiedRisk.neckMobility === 'Reduced')) {
      advisories.push({
        severity: 'caution',
        message: `Direct Laryngoscopy (DL) is a suboptimal first-line approach given the patient's airway assessment: ${verifiedRisk.mallampati || 'Unknown'} Mallampati, ${verifiedRisk.neckMobility || 'Unknown'} neck mobility. ASA Difficult Airway Algorithm recommends Video Laryngoscopy (VL) as first attempt in anticipated difficulty, or Awake Fiberoptic Intubation (AFOI) if multiple predictors are present. DL first-pass success rate drops from ~95% (Class I) to ~60% (Class III-IV) in limited neck extension scenarios.`
      });
    }

    // ── Monitoring advisories ──
    // Missing A-line in high-risk cardiac patients
    if (!monitors.aline && verifiedRisk.rcriScore >= 2) {
      advisories.push({
        severity: 'warning',
        message: `RCRI Score ≥ 2 (Class III–IV) indicates elevated cardiac risk. An arterial line provides continuous beat-to-beat blood pressure monitoring essential for detecting and treating hemodynamic perturbations. ACC/AHA guidelines recommend invasive arterial monitoring for patients with RCRI ≥ 2 undergoing intermediate-to-high risk surgery.`
      });
    }

    // Missing A-line in septic/trauma
    if (!monitors.aline && isEmergent) {
      advisories.push({
        severity: 'warning',
        message: 'Emergent trauma or septic cases with hemodynamic instability require arterial line monitoring for: (1) Continuous invasive BP for vasopressor titration, (2) Frequent intra-operative ABG sampling (lactate trending, acid-base status, serial hemoglobin), (3) Pulse pressure variation for fluid responsiveness assessment.'
      });
    }

    // CVC without clear indication in elective
    if (monitors.cvc && isElective && !monitors.aline) {
      advisories.push({
        severity: 'info',
        message: 'Central venous access is not routinely indicated for elective laparoscopic cholecystectomy. CVC placement carries risks: pneumothorax (1-3%), arterial puncture, catheter-related bloodstream infection. Reserve for patients requiring: (1) Vasopressor infusions, (2) Large-bore central access for massive transfusion, (3) CVP monitoring in heart failure patients, or (4) Inadequate peripheral IV access.'
      });
    }

    // TEE without cardiac indication
    if (monitors.tee && isElective && verifiedRisk.rcriScore < 2) {
      advisories.push({
        severity: 'info',
        message: 'TEE is not routinely indicated for low-cardiac-risk elective surgery. ACC/AHA Practice Advisory recommends intraoperative TEE for: (1) Cardiac surgery, (2) Major vascular surgery with anticipated large fluid shifts, (3) Unexplained persistent hemodynamic instability during surgery, or (4) Patients with known severe valvular disease or ventricular dysfunction. TEE is an invasive esophageal procedure with risks of dental injury and esophageal perforation.'
      });
    }

    // BIS recommended for TIVA or high-risk awareness
    if (hasGA && !monitors.bispectral && (verifiedRisk.asa === 'ASA IV' || isTrauma)) {
      advisories.push({
        severity: 'info',
        message: 'Consider BIS (Bispectral Index) depth-of-anesthesia monitoring. Patients undergoing emergent surgery, hemodynamically unstable patients requiring reduced anesthetic doses, and trauma patients with altered consciousness are at elevated risk of intraoperative awareness (incidence: 0.1-0.2% general population, up to 1-2% in trauma/cardiac). NAP5 recommends processed EEG monitoring in at-risk populations.'
      });
    }

    // Nerve stimulator recommended when NMB planned
    if (hasGA && !monitors.nervStim) {
      advisories.push({
        severity: 'info',
        message: 'Quantitative neuromuscular monitoring (e.g., TOF-Watch, TwitchView) is strongly recommended whenever neuromuscular blocking agents are administered. ASA 2023 and APSF guidelines recommend quantitative monitoring over qualitative (subjective) assessment to prevent residual paralysis, which occurs in 20-40% of patients when qualitative monitoring alone is used. Ensures TOF ratio ≥ 0.9 before extubation.'
      });
    }

    return advisories;
  };

  const handleProceed = () => {
    // Build descriptive log entry from multi-modal selections
    const activeTypes = Object.entries(anesthesiaPlan.types).filter(([,v]) => v).map(([k]) => k);
    const activeMonitors = Object.entries(anesthesiaPlan.monitors).filter(([,v]) => v).map(([k]) => k);
    logEvent(`📋 Pre-Op EMR Evaluation Complete. Plan locked: [${activeTypes.join(' + ')}] with ${anesthesiaPlan.airway} airway plan, monitoring: [${activeMonitors.join(', ')}]. Proceeding to OR.`);
    
    // Inject pre-op lab results into the stagedCase so they are carried forward
    const preOpLabRecords = {};

    const labKeyToTitleMap = {
      cbc: 'CBC',
      bmp: 'CMP',
      coags: 'Coagulation',
      lfts: 'LFTs',
      typeAndScreen: 'Type & Screen',
      typeAndCross: 'Type & Cross',
      hba1c: 'HbA1c',
      pregnancy: 'Pregnancy',
      urinalysis: 'Urinalysis',
      thyroid: 'Thyroid'
    };

    Object.keys(orders.labs).forEach(labKey => {
      if (orders.labs[labKey] && results.labs[labKey]) {
        const title = labKeyToTitleMap[labKey];
        if (!title) return;

        const resultsObj = {};
        const testNames = results.labs[labKey].values.map(v => v.name);
        results.labs[labKey].values.forEach(v => {
          resultsObj[v.name] = { val: parseFloat(v.val) || v.val, range: v.range, alert: v.alert };
        });

        preOpLabRecords[title] = {
          testNames,
          history: [
            { time: 'Pre-Op', results: resultsObj }
          ]
        };
      }
    });

    // Merge everything into the patient object that will be started
    const verifiedRisk = stagedCase.patient?.verifiedRisk || {};
    const updatedCase = {
      ...stagedCase,
      preOpLabs: preOpLabRecords,
      patient: {
        ...stagedCase.patient,
        preOpOrders: orders,
        preOpPlan: anesthesiaPlan,
        // Blood Bank state initialization based on pre-operative workup tier
        bloodBank: orders.labs.typeAndCross
          ? { status: 'available', unitsInOR: 2, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: 'crossmatch' }
          : { status: 'none', unitsInOR: 0, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: orders.labs.typeAndScreen ? 'screen' : 'none' },
        // ── Multi-Modal Anesthesia/Monitoring State Handoff ──
        hasALine: anesthesiaPlan.monitors.aline || anesthesiaPlan.monitors.tee,
        hasCVC: anesthesiaPlan.monitors.cvc,
        hasTEE: anesthesiaPlan.monitors.tee,
        hasBIS: anesthesiaPlan.monitors.bispectral,
        hasNervStim: anesthesiaPlan.monitors.nervStim,
        airwayPlan: anesthesiaPlan.types.GA ? anesthesiaPlan.airway : 'none',
        anesthesiaType: anesthesiaPlan.types,  // Full multi-modal types object
        hasRegional: anesthesiaPlan.types.regional,
        hasNeuraxial: anesthesiaPlan.types.neuraxial,
        // Establish starting hemodynamic parameters based on pre-op findings
        startingHb: orders.labs.cbc ? parseFloat(results.labs.cbc.values.find(v => v.name.includes('Hemoglobin')).val) : 14.2,
        startingGlucose: orders.labs.bmp ? parseFloat(results.labs.bmp.values.find(v => v.name.includes('Glucose')).val) : 98,
        startingPotassium: orders.labs.bmp ? parseFloat(results.labs.bmp.values.find(v => v.name === 'Potassium (K)').val) : 4.1,
        startingCreatinine: orders.labs.bmp ? parseFloat(results.labs.bmp.values.find(v => v.name.includes('Creatinine')).val) : 0.85,
        // ── Verified Risk Assessment State Handoff ──
        stomach: verifiedRisk.npoStatus === 'Aspiration Risk' ? 'full' : 'empty',
        mallampati: parseInt((verifiedRisk.mallampati || '').replace('Class ', '')) || 1,
        neckMobility: (verifiedRisk.neckMobility || 'Normal').toLowerCase(),
        asaClass: verifiedRisk.asa || 'ASA II',
        rcriScore: verifiedRisk.rcriScore || 0,
        mets: verifiedRisk.mets || 'adequate',
      }
    };

    // Close and start
    close();
    onStart(updatedCase);
  };

  if (!show || !stagedCase) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 border-b border-indigo-500/30 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-cyan-400 flex items-center gap-2">
              <ClipboardList className="text-indigo-400 animate-pulse"/> Pre-Operative EMR & Risk Assessment
            </h2>
            <p className="text-xs text-slate-400">Review Patient Chart, Order Pre-Op Workup, Perform Risk Staging, and Lock Anesthesia Plan</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X size={24}/>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 px-4 py-2 flex border-b border-slate-800 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
          {[
            { id: 'chart', label: 'Patient Chart', icon: <FileText size={16}/> },
            { id: 'orders', label: 'Order Entry', icon: <CheckSquare size={16}/> },
            { id: 'results', label: 'Workup Results', icon: <Activity size={16}/> },
            { id: 'risk', label: 'Risk Assessment', icon: <ShieldAlert size={16}/> },
            { id: 'plan', label: 'Anesthesia Plan', icon: <Award size={16}/>, gated: !intraop && !assessmentVerified }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { if (!tab.gated) setActiveTab(tab.id); }}
              disabled={tab.gated}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition whitespace-nowrap ${
                tab.gated
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title={tab.gated ? 'Complete and verify Risk Assessment to unlock' : ''}
            >
              {tab.icon}
              {tab.label}
              {tab.gated && <span className="text-[8px] ml-1 text-yellow-500">🔒</span>}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60 custom-scrollbar">
          
          {/* TAB 1: PATIENT CHART */}
          {activeTab === 'chart' && (
            <div className="space-y-6">
              {/* Demographics Summary Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                  1. Clinical Demographics & Morphometrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Name</span>
                    <span className="text-white font-extrabold text-base">{patient.name || 'John Doe'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Age & Biological Sex</span>
                    <span className="text-white font-extrabold text-base">{age}yo / {sex.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Weight / Height</span>
                    <span className="text-white font-extrabold text-base">{weightKg} kg / {heightCm} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Body Mass Index (BMI)</span>
                    <span className="text-white font-extrabold text-base">
                      {bmi.toFixed(1)} kg/m² ({bmi > 35 ? 'Obese Class II' : bmi > 30 ? 'Obese Class I' : 'Normal'})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mt-6 pt-6 border-t border-slate-800/50">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Ideal Body Weight (IBW)</span>
                    <span className="text-cyan-400 font-extrabold text-base">{ibw.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Lean Body Weight (LBW)</span>
                    <span className="text-cyan-400 font-extrabold text-base">{lbw.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Estimated Blood Volume</span>
                    <span className="text-cyan-400 font-extrabold text-base">{Math.round(ebv)} mL</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">BSA (Mosteller)</span>
                    <span className="text-cyan-400 font-extrabold text-base">{bsa.toFixed(2)} m²</span>
                  </div>
                </div>
              </div>

              {/* Spirometric Lung Volumes & Flow Metrics Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex justify-between">
                  <span>2. Predicted Spirometry & Lung Volumes (ECCS/ERS Reference)</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal italic">Quanjer et al. 1993 · Pelosi et al. 1998 (Obesity) · Rehder et al. 1977 (Position)</span>
                </h3>

                {/* PRIMARY CLINICAL METRIC: FEV1/FVC Ratio */}
                <div className={`mb-4 p-4 rounded-lg border-2 ${
                  lungVols.fev1FvcRatio < 70
                    ? 'border-red-500 bg-red-950/20'
                    : lungVols.fev1FvcRatio > 85
                      ? 'border-yellow-500 bg-yellow-950/15'
                      : 'border-green-500 bg-green-950/15'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">FEV₁/FVC Ratio (Primary Diagnostic Index)</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      lungVols.fev1FvcRatio < 70
                        ? 'bg-red-500/20 text-red-400'
                        : lungVols.fev1FvcRatio > 85
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                    }`}>
                      {lungVols.fev1FvcRatio < 70 ? 'OBSTRUCTIVE DEFECT' : lungVols.fev1FvcRatio > 85 ? 'POSSIBLE RESTRICTIVE PATTERN' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className={`font-black text-3xl ${
                      lungVols.fev1FvcRatio < 70 ? 'text-red-400' : lungVols.fev1FvcRatio > 85 ? 'text-yellow-300' : 'text-green-400'
                    }`}>
                      {lungVols.fev1FvcRatio}%
                    </span>
                    <span className="text-slate-500 text-xs">(Normal ≥ 70% · Obstructive &lt; 70% · Restrictive: normal ratio but ↓↓ FVC)</span>
                  </div>
                  {lungVols.fev1FvcRatio < 70 && (
                    <p className="text-[10px] text-red-300/80 mt-2 leading-tight">
                      ⚠ Obstructive physiology confirmed. Prolonged expiratory phase required during mechanical ventilation (I:E ≥ 1:3). Risk of auto-PEEP, dynamic hyperinflation, and bronchospasm on intubation. Avoid histamine-releasing agents.
                    </p>
                  )}
                  {lungVols.fev1FvcRatio > 85 && lungVols.fvcPercentPredicted < 80 && (
                    <p className="text-[10px] text-yellow-300/80 mt-2 leading-tight">
                      ⚠ Restrictive pattern: FEV₁/FVC ratio preserved but FVC significantly reduced ({lungVols.fvcPercentPredicted}% predicted). Reduced tidal volumes and increased respiratory rate may be required. Monitor for rapid desaturation due to diminished total lung capacity.
                    </p>
                  )}
                </div>

                {/* Flow Metrics Row: FEV1, FVC with % Predicted */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-cyan-400 block text-[10px] uppercase font-bold mb-1">FEV₁</span>
                    <span className="text-white font-extrabold text-lg">{lungVols.fev1_mL} mL</span>
                    <span className={`block text-xs font-bold mt-0.5 ${
                      lungVols.fev1PercentPredicted < 50 ? 'text-red-400' : lungVols.fev1PercentPredicted < 80 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {lungVols.fev1PercentPredicted}% predicted
                    </span>
                    <span className="text-[9px] text-slate-500 block">Forced Exp Vol 1s</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-cyan-400 block text-[10px] uppercase font-bold mb-1">FVC</span>
                    <span className="text-white font-extrabold text-lg">{lungVols.fvc_mL} mL</span>
                    <span className={`block text-xs font-bold mt-0.5 ${
                      lungVols.fvcPercentPredicted < 50 ? 'text-red-400' : lungVols.fvcPercentPredicted < 80 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {lungVols.fvcPercentPredicted}% predicted
                    </span>
                    <span className="text-[9px] text-slate-500 block">Forced Vital Cap</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-indigo-400 block text-[10px] uppercase font-bold mb-1">FRC</span>
                    <span className="text-indigo-300 font-extrabold text-lg">{lungVols.frc_mL} mL</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Func Residual Cap</span>
                    {bmi > 25 && (
                      <span className="text-[8px] text-yellow-500/70 block mt-0.5">Pelosi decay: {lungVols.obesityFactor}</span>
                    )}
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">TLC</span>
                    <span className="text-white font-extrabold text-lg">{lungVols.tlc_mL} mL</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Total Lung Cap</span>
                  </div>
                </div>

                {/* Secondary Volumes Row */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">VC</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.vc_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Vital Cap</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">RV</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.rv_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Residual Vol</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">ERV</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.erv_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Exp Reserve</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">IRV</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.irv_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Insp Reserve</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">V<sub>D</sub></span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.vd_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Dead Space</span>
                  </div>
                </div>
              </div>

              {/* Comorbidities & Medical History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    Comorbidities & System Review
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {patient.cad && <span className="bg-red-950/40 border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-bold">Coronary Artery Disease</span>}
                    {patient.chf && <span className="bg-red-950/40 border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-bold">Congestive Heart Failure</span>}
                    {patient.as && <span className="bg-red-950/40 border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-bold">Severe Aortic Stenosis</span>}
                    {patient.afib && <span className="bg-yellow-950/40 border border-yellow-800 text-yellow-400 px-3 py-1 rounded-md text-xs font-bold">Atrial Fibrillation</span>}
                    {patient.copd && <span className="bg-orange-950/40 border border-orange-800 text-orange-400 px-3 py-1 rounded-md text-xs font-bold">Severe COPD</span>}
                    {patient.asthma && <span className="bg-orange-950/40 border border-orange-800 text-orange-400 px-3 py-1 rounded-md text-xs font-bold">Asthma</span>}
                    {patient.ckd && <span className="bg-purple-950/40 border border-purple-800 text-purple-400 px-3 py-1 rounded-md text-xs font-bold">Chronic Kidney Disease</span>}
                    {patient.cirrhosis && <span className="bg-orange-950/40 border border-orange-800 text-orange-400 px-3 py-1 rounded-md text-xs font-bold">Liver Cirrhosis</span>}
                    {patient.diabetes && <span className="bg-yellow-950/40 border border-yellow-800 text-yellow-400 px-3 py-1 rounded-md text-xs font-bold">Diabetes Mellitus</span>}
                    {patient.mg && <span className="bg-purple-950/40 border border-purple-800 text-purple-400 px-3 py-1 rounded-md text-xs font-bold">Myasthenia Gravis</span>}
                    {patient.isTrauma && <span className="bg-red-950 border border-red-500 text-red-200 px-3 py-1 rounded-md text-xs font-extrabold animate-pulse">LEVEL 1 TRAUMA</span>}
                    {patient.isSeptic && <span className="bg-red-950 border border-red-500 text-red-200 px-3 py-1 rounded-md text-xs font-extrabold animate-pulse">SEVERE SEPSIS</span>}
                    
                    {!patient.cad && !patient.chf && !patient.copd && !patient.ckd && !patient.diabetes && !patient.isTrauma && !patient.isSeptic && (
                      <span className="text-slate-500 italic text-sm">No significant past medical history (ASA I/II equivalent).</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    Medications & Allergies
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold uppercase block mb-1">Active Outpatient Medications</span>
                      <div className="text-slate-300">
                        {patient.diabetes && <span className="block">• Insulin Glargine 15U QHS, Metformin 1000mg BID</span>}
                        {patient.cad && <span className="block">• Aspirin 81mg daily, Atorvastatin 40mg daily</span>}
                        {patient.chf && <span className="block">• Carvedilol 6.25mg BID, Lisinopril 10mg daily, Furosemide 40mg daily</span>}
                        {patient.copd && <span className="block">• Albuterol HFA PRN, Symbicort 160/4.5mcg BID</span>}
                        {patient.afib && <span className="block">• Apixaban (Eliquis) 5mg BID (held 48 hours pre-op)</span>}
                        {!patient.diabetes && !patient.cad && !patient.chf && !patient.copd && !patient.afib && (
                          <span className="text-slate-500 italic">None reported.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase block mb-1">Allergies & Reactions</span>
                      <div className="text-slate-300">
                        {patient.penicillinAllergy ? (
                          <span className="text-red-400 font-bold block">• PENICILLIN (Anaphylaxis - cross reactivity with cephalosporins possible!)</span>
                        ) : (
                          <span className="text-green-400 block">• No Known Drug Allergies (NKDA)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER ENTRY */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 p-4 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                <ShieldAlert className="text-indigo-400 shrink-0" size={24}/>
                <p className="text-xs text-slate-300">
                  <strong className="text-indigo-300">Note:</strong> Pre-operative orders return <span className="text-green-400 font-bold">instantly</span> to populate the Results tab. In-OR labs (ordered intra-operatively) will model realistic point-of-care or central lab turnaround times.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Laboratory Panels */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    I. Laboratory Tests
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'cbc', label: 'Complete Blood Count (CBC)' },
                      { id: 'bmp', label: 'Basic Metabolic Panel (BMP)' },
                      { id: 'coags', label: 'Coagulation (PT / INR / PTT)' },
                      { id: 'lfts', label: 'Liver Function Tests (LFTs)' },
                      { id: 'typeAndScreen', label: 'Type & Screen' },
                      { id: 'typeAndCross', label: 'Type & Crossmatch' },
                      { id: 'hba1c', label: 'Hemoglobin A1c (HbA1c)' },
                      { id: 'pregnancy', label: 'Pregnancy Screen (beta-hCG)' },
                      { id: 'urinalysis', label: 'Urinalysis (UA)' },
                      { id: 'thyroid', label: 'Thyroid Panel (TSH / Free T4)' }
                    ].map(test => (
                      <label key={test.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={orders.labs[test.id]}
                          onChange={(e) => handleOrderChange('labs', test.id, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Diagnostics */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    II. Diagnostic Imaging & Tests
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'ecg', label: '12-Lead Electrocardiogram' },
                      { id: 'cxr', label: 'Chest X-Ray (PA & Lateral)' },
                      { id: 'tte', label: 'Transthoracic Echocardiogram' },
                      { id: 'pfts', label: 'Pulmonary Function Tests (PFTs)' },
                      { id: 'stressTest', label: 'Pharmacologic Stress Test' }
                    ].map(test => (
                      <label key={test.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={orders.diagnostics[test.id]}
                          onChange={(e) => handleOrderChange('diagnostics', test.id, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Consults */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    III. Clinical Consultations
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'cardiology', label: 'Cardiology Consult' },
                      { id: 'pulmonology', label: 'Pulmonology Consult' },
                      { id: 'hematology', label: 'Hematology Consult' },
                      { id: 'endocrinology', label: 'Endocrinology Consult' }
                    ].map(test => (
                      <label key={test.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={orders.consults[test.id]}
                          onChange={(e) => handleOrderChange('consults', test.id, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: WORKUP RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {Object.keys(results.labs).length === 0 &&
               Object.keys(results.diagnostics).length === 0 &&
               Object.keys(results.consults).length === 0 ? (
                <div className="text-center py-20 text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800 border-dashed">
                  <ClipboardList className="mx-auto text-slate-600 mb-3" size={48}/>
                  <p className="text-sm font-bold">No tests have been ordered yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Navigate to the "Order Entry" tab to request preoperative diagnostics.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Labs Results Table */}
                  {Object.keys(results.labs).length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-indigo-950/30 px-4 py-3 font-extrabold text-sm text-indigo-300 border-b border-slate-800">
                        LABORATORY PANELS
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(results.labs).map(([labKey, labData]) => (
                          <div key={labKey} className="p-4">
                            <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-3">{labData.title}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {labData.values.map((v, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                                  <span className="text-xs font-bold text-slate-400">{v.name}</span>
                                  <div className="text-right">
                                    <span className={`text-sm font-black mr-2 ${v.alert ? 'text-red-500 font-bold' : 'text-green-400'}`}>
                                      {v.val}
                                    </span>
                                    <span className="text-[10px] text-slate-500 italic">({v.range})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnostics Results */}
                  {Object.keys(results.diagnostics).length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-indigo-950/30 px-4 py-3 font-extrabold text-sm text-indigo-300 border-b border-slate-800">
                        DIAGNOSTIC FINDINGS
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(results.diagnostics).map(([diagKey, diagData]) => {
                          const vols = calculateLungVolumes(heightCm, age, sex, bmi, 'Sitting', patient.copd || false, patient.restrictive || false);
                          return (
                            <div key={diagKey} className="p-4">
                              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">{diagData.title}</h4>
                              {diagKey === 'pfts' ? (
                                <div className="space-y-4">
                                  <p className="text-sm text-slate-300 italic mb-2 bg-slate-900/40 p-2 rounded border border-slate-800">"{diagData.finding}"</p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                      { label: 'FEV1 (L)', val: (vols.fev1_mL / 1000).toFixed(2), desc: 'Forced Exp. Vol. 1s' },
                                      { label: 'FVC (L)', val: (vols.fvc_mL / 1000).toFixed(2), desc: 'Forced Vital Capacity' },
                                      { label: 'FEV1/FVC Ratio', val: vols.fev1FvcRatio + '%', desc: 'FEV1% (Obstructive <70%)', highlight: vols.fev1FvcRatio < 70 },
                                      { label: 'FEV1 % Predicted', val: vols.fev1PercentPredicted + '%', desc: 'Mild >80% | Mod 50-80% | Sev <50%', highlight: vols.fev1PercentPredicted < 80 },
                                      { label: 'FVC % Predicted', val: vols.fvcPercentPredicted + '%', desc: 'Restriction indicator', highlight: vols.fvcPercentPredicted < 80 },
                                      { label: 'TLC (L)', val: vols.tlc_L.toFixed(2), desc: 'Total Lung Volume', highlight: patient.restrictive }
                                    ].map((card, idx) => (
                                      <div key={idx} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition duration-200">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{card.label}</span>
                                          <span className={`text-xl font-black block mt-1 ${card.highlight ? 'text-red-400' : 'text-emerald-400'}`}>{card.val}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-500 mt-2 block leading-snug">{card.desc}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 italic leading-relaxed">
                                  "{diagData.finding}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Consults Results */}
                  {Object.keys(results.consults).length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-indigo-950/30 px-4 py-3 font-extrabold text-sm text-indigo-300 border-b border-slate-800">
                        CONSULTATION REVIEWS
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(results.consults).map(([consKey, consData]) => (
                          <div key={consKey} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">{consData.title}</h4>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{consData.specialist}</span>
                            </div>
                            <p className="text-sm text-slate-300 bg-slate-900/60 p-4 border border-indigo-900/40 rounded-lg italic leading-relaxed">
                              {consData.finding}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERACTIVE RISK ASSESSMENT GATEWAY */}
          {activeTab === 'risk' && (
            <div className="space-y-6">

              {/* ─── SECTION 1: CARDIAC RISK — RCRI + METs ─── */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/40 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-black text-sm">1</div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Cardiac Risk Evaluation — RCRI & Functional Capacity</h3>
                      <p className="text-[10px] text-indigo-400 mt-0.5">Read the patient history below. Identify the applicable RCRI risk factors and functional METs capacity.</p>
                    </div>
                  </div>
                </div>

                {/* Vignette */}
                <div className="px-5 pt-4 pb-3">
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4">
                    <span className="text-[9px] text-indigo-500 uppercase font-bold tracking-widest block mb-2">💬 Patient History Interview</span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{groundTruth.medicalHistory}"
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* RCRI Checkboxes */}
                    <div className="lg:col-span-2 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select All Applicable RCRI Risk Factors</h4>
                      {[
                        { key: 'rcriHighRisk', label: 'High-risk surgical procedure (Intraperitoneal, Intrathoracic, Vascular, or Suprainguinal)' },
                        { key: 'rcriIhd', label: 'History of Ischemic Heart Disease (CAD, Prior MI, Positive Stress Test, Angina, Q-waves)' },
                        { key: 'rcriChf', label: 'History of Congestive Heart Failure (Reduced EF, Pulmonary Edema, S3, BNP elevation)' },
                        { key: 'rcriCva', label: 'History of Cerebrovascular Disease (Prior Stroke or Transient Ischemic Attack)' },
                        { key: 'rcriInsulin', label: 'Preoperative Treatment with Insulin for Diabetes Mellitus' },
                        { key: 'rcriCr', label: 'Preoperative Serum Creatinine > 2.0 mg/dL' }
                      ].map((factor) => (
                        <div key={factor.key}>
                          <label className={`flex items-start gap-3 text-xs cursor-pointer group py-1.5 px-2 rounded-lg transition ${
                            assessmentChecked && assessmentErrors[factor.key] ? 'bg-red-950/30 ring-1 ring-red-500/50' : 'hover:bg-slate-800/40'
                          }`}>
                            <input
                              type="checkbox"
                              checked={assessment[factor.key]}
                              onChange={(e) => { setAssessment(prev => ({ ...prev, [factor.key]: e.target.checked })); setAssessmentChecked(false); setAssessmentVerified(false); }}
                              className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0 w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
                            />
                            <span className={`${assessment[factor.key] ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-300'} transition`}>{factor.label}</span>
                          </label>
                          {assessmentChecked && assessmentErrors[factor.key] && (
                            <div className="ml-9 mt-1 mb-1 px-3 py-1.5 bg-red-950/50 border border-red-800/60 rounded text-[10px] text-red-300 font-bold leading-relaxed">
                              ✗ {assessmentErrors[factor.key]}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* METs Selection */}
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Functional Capacity (METs)</h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'adequate', label: 'Adequate (≥ 4 METs)', desc: 'Can climb 1–2 flights, walk briskly > 3 mph, or do light housework' },
                            { value: 'poor', label: 'Poor (< 4 METs / Unknown)', desc: 'Cannot walk a block, climb stairs without dyspnea, or comatose' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setAssessment(prev => ({ ...prev, mets: opt.value })); setAssessmentChecked(false); setAssessmentVerified(false); }}
                              className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-lg border text-left transition-all duration-200 ${
                                assessment.mets === opt.value
                                  ? (assessmentChecked && assessmentErrors.mets ? 'border-red-500 bg-red-950/30 text-white shadow-md shadow-red-500/10' : 'border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-500/10')
                                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                              }`}
                            >
                              <span className="text-xs font-bold block">{opt.label}</span>
                              <span className="text-[9px] text-slate-500 block mt-0.5">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                        {assessmentChecked && assessmentErrors.mets && (
                          <div className="mt-2 px-3 py-1.5 bg-red-950/50 border border-red-800/60 rounded text-[10px] text-red-300 font-bold leading-relaxed">
                            ✗ {assessmentErrors.mets}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live RCRI Staging Output */}
                    <div className={`p-5 rounded-xl border flex flex-col justify-between ${borderClass} transition-all duration-300`}>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Your Score</span>
                          <span className="text-lg font-black text-white">{rcriScore} Points</span>
                        </div>
                        <h4 className="text-xl font-black mb-1">{rcriScore > 0 ? riskClass : <span className="text-slate-600">Select factors…</span>}</h4>
                        {rcriScore > 0 && <p className="text-[10px] font-bold uppercase tracking-wider mb-4">CV Event Risk: {riskPercent}</p>}
                      </div>
                      {rcriScore > 0 && (
                        <div className="border-t border-current/20 pt-4 mt-2">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block mb-1">ACC/AHA Clinical Action</span>
                          <p className="text-xs font-bold leading-relaxed">{accAction}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* ─── SECTION 2: ASA PHYSICAL STATUS ─── */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/30 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-black text-sm">2</div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">ASA Physical Status Classification</h3>
                      <p className="text-[10px] text-emerald-400 mt-0.5">Based on the patient's global clinical picture, select the correct ASA Physical Status class.</p>
                    </div>
                  </div>
                </div>

                {/* Vignette */}
                <div className="px-5 pt-4 pb-3">
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4">
                    <span className="text-[9px] text-emerald-500 uppercase font-bold tracking-widest block mb-2">📋 Global Patient Summary</span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{groundTruth.globalHistory}"
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { value: 'ASA I', label: 'ASA I', desc: 'Healthy patient. No organic, physiologic, or psychiatric disturbance.' },
                      { value: 'ASA II', label: 'ASA II', desc: 'Mild systemic disease. No functional limitations. Well-controlled.' },
                      { value: 'ASA III', label: 'ASA III', desc: 'Severe systemic disease. Substantive functional limitation.' },
                      { value: 'ASA IV', label: 'ASA IV', desc: 'Severe systemic disease that is a constant threat to life.' },
                      { value: 'ASA V', label: 'ASA V', desc: 'Moribund. Not expected to survive without surgery.' },
                      { value: 'ASA VI', label: 'ASA VI', desc: 'Declared brain-dead. Organ donor.' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setAssessment(prev => ({ ...prev, asa: opt.value })); setAssessmentChecked(false); setAssessmentVerified(false); }}
                        className={`px-3 py-3 rounded-lg border text-center transition-all duration-200 ${
                          assessment.asa === opt.value
                            ? (assessmentChecked && assessmentErrors.asa ? 'border-red-500 bg-red-950/30 text-white shadow-md shadow-red-500/10' : 'border-emerald-500 bg-emerald-950/40 text-white shadow-md shadow-emerald-500/10')
                            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-sm font-black block">{opt.label}</span>
                        <span className="text-[8px] text-slate-500 block mt-1 leading-snug">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  {assessmentChecked && assessmentErrors.asa && (
                    <div className="mt-3 px-3 py-1.5 bg-red-950/50 border border-red-800/60 rounded text-[10px] text-red-300 font-bold leading-relaxed">
                      ✗ {assessmentErrors.asa}
                    </div>
                  )}
                </div>
              </div>


              {/* ─── SECTION 3: AIRWAY EXAMINATION ─── */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-amber-950/40 to-yellow-950/30 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 font-black text-sm">3</div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Airway Examination — Mallampati & Neck Mobility</h3>
                      <p className="text-[10px] text-amber-400 mt-0.5">Read the airway examination findings. Select the correct Mallampati classification and neck mobility status.</p>
                    </div>
                  </div>
                </div>

                {/* Vignette */}
                <div className="px-5 pt-4 pb-3">
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4">
                    <span className="text-[9px] text-amber-500 uppercase font-bold tracking-widest block mb-2">👁️ Airway Physical Examination</span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{groundTruth.airwayExam}"
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Mallampati Selection */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mallampati Classification</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'Class I', desc: 'Soft palate, fauces, uvula, tonsillar pillars fully visible' },
                          { value: 'Class II', desc: 'Soft palate, fauces, uvula visible; pillars partially hidden' },
                          { value: 'Class III', desc: 'Soft palate and base of uvula only visible' },
                          { value: 'Class IV', desc: 'Only hard palate visible; soft palate completely obscured' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setAssessment(prev => ({ ...prev, mallampati: opt.value })); setAssessmentChecked(false); setAssessmentVerified(false); }}
                            className={`px-3 py-2.5 rounded-lg border text-left transition-all duration-200 ${
                              assessment.mallampati === opt.value
                                ? (assessmentChecked && assessmentErrors.mallampati ? 'border-red-500 bg-red-950/30 text-white shadow-md shadow-red-500/10' : 'border-amber-500 bg-amber-950/40 text-white shadow-md shadow-amber-500/10')
                                : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <span className="text-xs font-bold block">{opt.value}</span>
                            <span className="text-[8px] text-slate-500 block mt-0.5 leading-snug">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                      {assessmentChecked && assessmentErrors.mallampati && (
                        <div className="mt-2 px-3 py-1.5 bg-red-950/50 border border-red-800/60 rounded text-[10px] text-red-300 font-bold leading-relaxed">
                          ✗ {assessmentErrors.mallampati}
                        </div>
                      )}
                    </div>

                    {/* Neck Mobility Selection */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Neck Mobility (Atlanto-Occipital Extension)</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { value: 'Normal', desc: 'Full atlanto-occipital extension (≥35°). No anatomical restriction. Adequate alignment of oral, pharyngeal, and laryngeal axes achievable.' },
                          { value: 'Reduced', desc: 'Limited atlanto-occipital extension (<35°). Cervical collar, cervical fusion, severe arthritis, large posterior fat pad, or radiotherapy restricts motion.' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setAssessment(prev => ({ ...prev, neckMobility: opt.value })); setAssessmentChecked(false); setAssessmentVerified(false); }}
                            className={`px-3 py-3 rounded-lg border text-left transition-all duration-200 ${
                              assessment.neckMobility === opt.value
                                ? (assessmentChecked && assessmentErrors.neckMobility ? 'border-red-500 bg-red-950/30 text-white shadow-md shadow-red-500/10' : 'border-amber-500 bg-amber-950/40 text-white shadow-md shadow-amber-500/10')
                                : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <span className="text-xs font-bold block">{opt.value}</span>
                            <span className="text-[9px] text-slate-500 block mt-0.5 leading-snug">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                      {assessmentChecked && assessmentErrors.neckMobility && (
                        <div className="mt-2 px-3 py-1.5 bg-red-950/50 border border-red-800/60 rounded text-[10px] text-red-300 font-bold leading-relaxed">
                          ✗ {assessmentErrors.neckMobility}
                        </div>
                      )}

                      {/* Difficulty Anticipation Display */}
                      {(assessment.mallampati || assessment.neckMobility) && (
                        <div className={`mt-3 p-3 rounded-lg border text-[10px] font-bold leading-relaxed ${
                          (assessment.mallampati === 'Class III' || assessment.mallampati === 'Class IV' || assessment.neckMobility === 'Reduced')
                            ? 'bg-red-950/30 border-red-900/60 text-red-300'
                            : 'bg-green-950/30 border-green-900/60 text-green-300'
                        }`}>
                          {(assessment.mallampati === 'Class III' || assessment.mallampati === 'Class IV' || assessment.neckMobility === 'Reduced')
                            ? '⚠️ Your selections indicate: ANTICIPATED DIFFICULT AIRWAY. Consider video laryngoscopy, fiberoptic intubation, or awake technique.'
                            : '✅ Your selections indicate: Standard direct laryngoscopy anticipated.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* ─── SECTION 4: NPO & ASPIRATION RISK ─── */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-orange-950/40 to-amber-950/30 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-600/30 border border-orange-500/50 flex items-center justify-center text-orange-300 font-black text-sm">4</div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">NPO Assessment & Aspiration Risk Staging</h3>
                      <p className="text-[10px] text-orange-400 mt-0.5">Review the patient's oral intake history and clinical context. Determine the gastric status.</p>
                    </div>
                  </div>
                </div>

                {/* Vignette */}
                <div className="px-5 pt-4 pb-3">
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4">
                    <span className="text-[9px] text-orange-500 uppercase font-bold tracking-widest block mb-2">🍽️ Oral Intake & Gastric History</span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{groundTruth.npoHistory}"
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        value: 'Compliant',
                        label: 'NPO Compliant',
                        desc: 'Patient has fasted appropriately per ASA Guidelines (≥2h clear liquids, ≥6h light meal, ≥8h full meal). No pharmacologic or pathophysiologic gastric emptying delay is present.',
                        color: 'emerald'
                      },
                      {
                        value: 'Aspiration Risk',
                        label: 'Aspiration Risk — Full Stomach',
                        desc: 'Patient has a physiologically full stomach due to: recent oral intake within fasting thresholds, active GLP-1 agonist therapy (delayed gastric emptying), sepsis/shock-induced gastroparesis, opioid-induced ileus, bowel obstruction, pregnancy, or trauma with unknown NPO status. RSI indicated.',
                        color: 'orange'
                      }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setAssessment(prev => ({ ...prev, npoStatus: opt.value })); setAssessmentChecked(false); setAssessmentVerified(false); }}
                        className={`px-4 py-4 rounded-lg border text-left transition-all duration-200 ${
                          assessment.npoStatus === opt.value
                            ? (assessmentChecked && assessmentErrors.npoStatus
                                ? 'border-red-500 bg-red-950/30 text-white shadow-md shadow-red-500/10'
                                : '')
                            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                        style={assessment.npoStatus === opt.value ? (
                          assessmentChecked && assessmentErrors.npoStatus
                            ? { borderColor: '#ef4444', backgroundColor: 'rgba(127,29,29,0.3)', color: 'white', boxShadow: '0 4px 6px rgba(239,68,68,0.1)' }
                            : { borderColor: opt.color === 'emerald' ? '#10b981' : '#f97316', backgroundColor: opt.color === 'emerald' ? 'rgba(6,78,59,0.4)' : 'rgba(124,45,18,0.4)', color: 'white', boxShadow: opt.color === 'emerald' ? '0 4px 6px rgba(16,185,129,0.1)' : '0 4px 6px rgba(249,115,22,0.1)' }
                        ) : {}}
                      >
                        <span className="text-sm font-black block">{opt.label}</span>
                        <span className="text-[9px] text-slate-500 block mt-1.5 leading-snug">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  {assessmentChecked && assessmentErrors.npoStatus && (
                    <div className="mt-3 px-3 py-1.5 bg-red-950/50 border border-red-800/60 rounded text-[10px] text-red-300 font-bold leading-relaxed">
                      ✗ {assessmentErrors.npoStatus}
                    </div>
                  )}
                </div>
              </div>


              {/* ─── VERIFICATION PANEL ─── */}
              {(() => {
                const filled = {
                  rcri: true,
                  mets: !!assessment.mets,
                  asa: !!assessment.asa,
                  mallampati: !!assessment.mallampati,
                  neckMobility: !!assessment.neckMobility,
                  npoStatus: !!assessment.npoStatus
                };
                const totalFilled = Object.values(filled).filter(Boolean).length;
                const allFilled = totalFilled === Object.keys(filled).length;
                const errorCount = Object.keys(assessmentErrors).length;

                // ── STATE 3: VERIFIED ──
                if (assessmentVerified) {
                  return (
                    <div className="p-5 rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-950/40 to-emerald-950/30 transition-all duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-600/30 border-2 border-green-500 flex items-center justify-center">
                            <span className="text-green-400 text-lg">🔒</span>
                          </div>
                          <div>
                            <span className="text-sm font-black text-green-400 block">RISK ASSESSMENT VERIFIED</span>
                            <span className="text-[10px] text-green-600 block mt-0.5">All clinical classifications confirmed correct. Verified data will transfer to the simulation automatically.</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            {['RCRI','METs','ASA','Airway','Neck','NPO'].map(l => (
                              <span key={l} className="text-[7px] px-1.5 py-0.5 rounded bg-green-950/60 text-green-400 border border-green-800/50 font-bold">{l} ✓</span>
                            ))}
                          </div>
                          <button
                            onClick={() => setActiveTab('plan')}
                            className="mt-1 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition shadow-md shadow-green-500/20"
                          >
                            Proceed to Anesthesia Plan →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── STATE 2: CHECKED WITH ERRORS ──
                if (assessmentChecked && errorCount > 0) {
                  return (
                    <div className="p-5 rounded-xl border-2 border-red-500/70 bg-gradient-to-r from-red-950/30 to-rose-950/20 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-600/20 border-2 border-red-500/60 flex items-center justify-center">
                            <span className="text-red-400 text-lg font-black">{errorCount}</span>
                          </div>
                          <div>
                            <span className="text-sm font-black text-red-400 block">ASSESSMENT VERIFICATION FAILED</span>
                            <span className="text-[10px] text-red-500/80 block mt-0.5">
                              {errorCount} incorrect classification{errorCount > 1 ? 's' : ''} detected. Review the clinical guidance above (marked in red) and correct your selections.
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={verifyAssessment}
                          className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs flex items-center gap-2 transition shadow-md shadow-red-500/20 animate-pulse"
                        >
                          Re-Verify Assessment
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── STATE 1: IN PROGRESS ──
                return (
                  <div className={`p-5 rounded-xl border transition-all duration-300 ${
                    allFilled ? 'border-cyan-500/50 bg-cyan-950/10' : 'border-slate-800 bg-slate-950/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${allFilled ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className={`text-xs font-bold ${allFilled ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {allFilled ? 'All fields selected — submit your assessment for verification.' : `Assessment in progress — ${6 - totalFilled} field(s) remaining.`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {Object.entries({ METs: filled.mets, ASA: filled.asa, Mallampati: filled.mallampati, Neck: filled.neckMobility, NPO: filled.npoStatus }).map(([label, done]) => (
                            <span key={label} className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                              done ? 'bg-green-950/50 text-green-400 border border-green-800/50' : 'bg-slate-900 text-slate-600 border border-slate-800'
                            }`}>{label}</span>
                          ))}
                        </div>
                        <button
                          onClick={verifyAssessment}
                          disabled={!allFilled}
                          className={`px-5 py-2 font-black rounded-lg text-xs flex items-center gap-2 transition ${
                            allFilled
                              ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          Verify Assessment
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB 5: ANESTHESIA PLAN */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              
              {/* ─── SECTION I: MULTI-MODAL ANESTHETIC TECHNIQUE ─── */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-950/40 to-violet-950/30 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-black text-sm">I</div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Multi-Modal Anesthetic Technique</h3>
                      <p className="text-[10px] text-indigo-400 mt-0.5">Select one or more anesthetic modalities. Multi-modal strategies (e.g., GA + Regional) are evidence-based for optimal outcomes.</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'GA', label: 'General Anesthesia (GA)', desc: 'Endotracheal intubation or LMA. Loss of consciousness, controlled ventilation, neuromuscular blockade.', icon: '🫁' },
                      { key: 'regional', label: 'Peripheral Nerve Block', desc: 'Ultrasound-guided peripheral block (TAP, adductor canal, interscalene, etc.) for somatic pain coverage.', icon: '💉' },
                      { key: 'neuraxial', label: 'Neuraxial (Spinal / Epidural)', desc: 'Central neuraxial blockade via subarachnoid or epidural space. Provides visceral and somatic anesthesia/analgesia.', icon: '🦴' },
                      { key: 'mac', label: 'Monitored Anesthesia Care (MAC)', desc: 'IV sedation with maintained spontaneous ventilation. Patient remains arousable. Local anesthesia supplemented.', icon: '💤' }
                    ].map(type => (
                      <label
                        key={type.key}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          anesthesiaPlan.types[type.key]
                            ? 'border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-500/10'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={anesthesiaPlan.types[type.key]}
                          onChange={() => handleTypeToggle(type.key)}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0 w-4 h-4 mt-1 shrink-0 cursor-pointer"
                        />
                        <div>
                          <span className={`text-xs font-bold block ${anesthesiaPlan.types[type.key] ? 'text-white' : 'text-slate-400'}`}>{type.icon} {type.label}</span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 leading-snug">{type.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {/* Active technique summary */}
                  {(() => {
                    const active = Object.entries(anesthesiaPlan.types).filter(([,v]) => v).map(([k]) => k);
                    if (active.length === 0) return null;
                    const labels = { GA: 'General', regional: 'Regional Block', neuraxial: 'Neuraxial', mac: 'MAC' };
                    return (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Active Plan:</span>
                        {active.map(k => (
                          <span key={k} className="text-[9px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 font-bold">{labels[k]}</span>
                        ))}
                        {active.length > 1 && (
                          <span className="text-[8px] px-2 py-0.5 rounded bg-violet-950/40 text-violet-400 border border-violet-800/50 font-bold">MULTI-MODAL</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ─── SECTION II: AIRWAY PLAN (only if GA selected) ─── */}
              {anesthesiaPlan.types.GA && (
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-950/40 to-teal-950/30 px-5 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-black text-sm">II</div>
                      <div>
                        <h3 className="text-base font-extrabold text-white">Airway Management Plan</h3>
                        <p className="text-[10px] text-cyan-400 mt-0.5">Select primary intubation technique. Consider the patient's Mallampati class and neck mobility from Risk Assessment.</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'DL', label: 'Direct Laryngoscopy (DL)', desc: 'Standard Macintosh/Miller blade. First-line for Class I-II airways with normal neck extension.' },
                        { id: 'VL', label: 'Video Laryngoscopy (VL)', desc: 'GlideScope / C-MAC. Improved glottic view in Class III+ or limited extension. First-pass success >95%.' },
                        { id: 'AwakeFiberoptic', label: 'Awake Fiberoptic (AFOI)', desc: 'Gold standard for anticipated difficult airway. Maintains spontaneous ventilation throughout. Required for known impossible mask ventilation.' }
                      ].map(airway => (
                        <label
                          key={airway.id}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            anesthesiaPlan.airway === airway.id
                              ? 'border-cyan-500 bg-cyan-950/40 shadow-md shadow-cyan-500/10'
                              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="airwayPlan"
                            checked={anesthesiaPlan.airway === airway.id}
                            onChange={() => handlePlanChange('airway', airway.id)}
                            className="rounded-full bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0 w-4 h-4 mt-1 shrink-0"
                          />
                          <div>
                            <span className={`text-xs font-bold block ${anesthesiaPlan.airway === airway.id ? 'text-white' : 'text-slate-400'}`}>{airway.label}</span>
                            <span className="text-[9px] text-slate-500 block mt-0.5 leading-snug">{airway.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECTION III: COMPREHENSIVE MONITORING ─── */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-950/40 to-green-950/30 px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-black text-sm">III</div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Comprehensive Monitoring Plan</h3>
                      <p className="text-[10px] text-emerald-400 mt-0.5">Select all monitoring modalities to deploy concurrently. Standard ASA monitors are always active. Invasive monitors are additive.</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { key: 'standard', label: 'Standard ASA Monitors', desc: 'SpO₂ (pulse oximetry), ECG (5-lead), NIBP (non-invasive BP), EtCO₂ (capnography), Temperature. Mandatory per ASA Standards for Basic Anesthetic Monitoring.', locked: true, icon: '📊' },
                      { key: 'aline', label: 'Arterial Line (A-Line)', desc: 'Continuous invasive BP monitoring via radial/femoral artery catheterization. Enables real-time ABG sampling, PPV/SVV for fluid responsiveness.', locked: false, icon: '🔴' },
                      { key: 'cvc', label: 'Central Venous Catheter', desc: 'Internal jugular or subclavian central line. CVP monitoring, large-bore access for vasopressors/TPN, PA catheter port if needed.', locked: false, icon: '🔵' },
                      { key: 'tee', label: 'Transesophageal Echo (TEE)', desc: 'Real-time cardiac imaging for ventricular function, valvular assessment, volume status. Implies concurrent arterial line.', locked: false, icon: '💜' },
                      { key: 'bispectral', label: 'BIS / Depth of Anesthesia', desc: 'Processed EEG monitoring (BIS, Entropy, SedLine). Targets BIS 40-60 for GA. Reduces intraoperative awareness risk.', locked: false, icon: '🧠' },
                      { key: 'nervStim', label: 'Nerve Stimulator (TOF)', desc: 'Quantitative Train-of-Four monitoring for neuromuscular blockade. Ensures TOF ratio ≥ 0.9 before extubation. Required with NMB agents.', locked: false, icon: '⚡' }
                    ].map(mon => (
                      <label
                        key={mon.key}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border transition-all duration-200 ${
                          mon.locked ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          anesthesiaPlan.monitors[mon.key]
                            ? (mon.locked ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-emerald-500 bg-emerald-950/40 shadow-md shadow-emerald-500/10')
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={anesthesiaPlan.monitors[mon.key]}
                          onChange={() => handleMonitorToggle(mon.key)}
                          disabled={mon.locked}
                          className={`rounded bg-slate-950 border-slate-700 focus:ring-emerald-500/30 focus:ring-offset-0 w-4 h-4 mt-1 shrink-0 ${
                            mon.locked ? 'text-emerald-700 cursor-default opacity-60' : 'text-emerald-500 cursor-pointer'
                          }`}
                        />
                        <div>
                          <span className={`text-xs font-bold block ${anesthesiaPlan.monitors[mon.key] ? 'text-white' : 'text-slate-400'}`}>
                            {mon.icon} {mon.label}
                            {mon.locked && <span className="text-[8px] text-emerald-600 ml-2 font-bold">(ALWAYS ON)</span>}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5 leading-snug">{mon.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {/* Active monitors summary */}
                  {(() => {
                    const active = Object.entries(anesthesiaPlan.monitors).filter(([,v]) => v).map(([k]) => k);
                    const labels = { standard: 'ASA Std', aline: 'A-Line', cvc: 'CVC', tee: 'TEE', bispectral: 'BIS', nervStim: 'TOF' };
                    return (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Active Monitors:</span>
                        {active.map(k => (
                          <span key={k} className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-bold">{labels[k]}</span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ─── SECTION IV: CLINICAL ADVISORY PANEL ─── */}
              {(() => {
                const advisories = getAnesthesiaAdvisories();
                if (advisories.length === 0) return null;
                const hasCaution = advisories.some(a => a.severity === 'caution');
                const hasWarning = advisories.some(a => a.severity === 'warning');
                const severeCount = advisories.filter(a => a.severity === 'caution' || a.severity === 'warning').length;

                const severityConfig = {
                  caution: { bg: 'bg-red-950/30', border: 'border-red-800/60', text: 'text-red-300', badge: 'bg-red-900 text-red-300 border-red-700', icon: '🚨' },
                  warning: { bg: 'bg-amber-950/30', border: 'border-amber-800/60', text: 'text-amber-300', badge: 'bg-amber-900 text-amber-300 border-amber-700', icon: '⚠️' },
                  info: { bg: 'bg-blue-950/20', border: 'border-blue-800/40', text: 'text-blue-300', badge: 'bg-blue-900 text-blue-300 border-blue-700', icon: 'ℹ️' }
                };

                return (
                  <div className={`bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl shadow-lg overflow-hidden border-2 ${
                    hasCaution ? 'border-red-500/50' : hasWarning ? 'border-amber-500/50' : 'border-blue-500/30'
                  }`}>
                    <div className={`px-5 py-3 border-b border-slate-800 flex items-center justify-between ${
                      hasCaution ? 'bg-red-950/20' : hasWarning ? 'bg-amber-950/20' : 'bg-blue-950/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                          hasCaution ? 'bg-red-600/30 border border-red-500/50 text-red-300' : hasWarning ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300' : 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                        }`}>IV</div>
                        <div>
                          <h3 className="text-base font-extrabold text-white">Clinical Advisory — Optimization Review</h3>
                          <p className={`text-[10px] mt-0.5 ${hasCaution ? 'text-red-400' : hasWarning ? 'text-amber-400' : 'text-blue-400'}`}>
                            {severeCount > 0
                              ? `${severeCount} concern${severeCount > 1 ? 's' : ''} requiring clinical review. You may override after reading.`
                              : 'Informational recommendations based on current evidence-based guidelines.'}
                          </p>
                        </div>
                      </div>
                      {/* Override toggle */}
                      {severeCount > 0 && (
                        <div className="flex items-center gap-2">
                          {anesthesiaPlan.advisoryDismissed ? (
                            <span className="text-[9px] px-3 py-1 rounded bg-amber-950/50 text-amber-400 border border-amber-800 font-bold">
                              ⚠ ADVISORIES OVERRIDDEN
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePlanChange('advisoryDismissed', true)}
                              className="text-[9px] px-3 py-1.5 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-700/50 font-bold transition cursor-pointer"
                            >
                              I have reviewed — Override & Proceed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {advisories.map((adv, i) => {
                        const cfg = severityConfig[adv.severity];
                        return (
                          <div key={i} className={`px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-sm shrink-0">{cfg.icon}</span>
                              <div>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded ${cfg.badge} border font-bold uppercase mr-2`}>{adv.severity}</span>
                                <span className={`text-[10px] ${cfg.text} font-bold leading-relaxed`}>{adv.message}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ─── SECTION V: PATIENT SAFETY VERIFICATION ─── */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">
                  V. Patient Safety Verification
                </h3>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                    <input
                      type="checkbox"
                      checked={anesthesiaPlan.bloodConfirm}
                      onChange={(e) => handlePlanChange('bloodConfirm', e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                    />
                    <span>Verify blood product availability in the blood bank (PRBC/FFP compatible)</span>
                  </label>
                  
                  {anesthesiaPlan.bloodConfirm && (
                    <span className="text-[10px] bg-green-950 border border-green-800 text-green-400 px-2 py-0.5 rounded font-bold">
                      ✓ BLOOD RESERVES VERIFIED
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-between shrink-0">
          <button
            onClick={() => {
              if (activeTab === 'plan') setActiveTab('risk');
              else if (activeTab === 'risk') setActiveTab('results');
              else if (activeTab === 'results') setActiveTab('orders');
              else if (activeTab === 'orders') setActiveTab('chart');
            }}
            disabled={activeTab === 'chart'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold rounded-lg text-xs flex items-center gap-2 transition"
          >
            <ArrowLeft size={16}/> Previous Tab
          </button>
          
          <div className="flex gap-3">
            {activeTab !== 'plan' ? (
              <button
                onClick={() => {
                  if (activeTab === 'chart') setActiveTab('orders');
                  else if (activeTab === 'orders') setActiveTab('results');
                  else if (activeTab === 'results') setActiveTab('risk');
                  else if (activeTab === 'risk' && assessmentVerified) setActiveTab('plan');
                }}
                disabled={activeTab === 'risk' && !assessmentVerified}
                className={`px-4 py-2 font-bold rounded-lg text-xs flex items-center gap-2 transition ${
                  activeTab === 'risk' && !assessmentVerified
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {activeTab === 'risk' && !assessmentVerified ? (
                  <>🔒 Verify Assessment First</>
                ) : (
                  <>Next Tab <ArrowRight size={16}/></>
                )}
              </button>
            ) : (
              intraop ? (
                <button
                  onClick={close}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 font-black text-white rounded-lg text-xs flex items-center gap-2 transition shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  Return to Operating Room &rarr;
                </button>
              ) : (
                <button
                  onClick={handleProceed}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 font-black text-white rounded-lg text-xs flex items-center gap-2 transition shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  Lock Plan & Proceed to OR <Play size={16}/>
                </button>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
