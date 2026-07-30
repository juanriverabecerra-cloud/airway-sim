// Verified case bank: procedure-based cases integrated from Jaffe's Anesthesiologist's
// Manual of Surgical Procedures. Sibling to MillersCases.js (the original, physiology-
// chapter-derived bank) -- kept in its own file so provenance stays traceable per source
// book and CaseManager.jsx doesn't have to keep growing as a single monolithic array.
//
// Populated by case-integration sessions run per docs/case_integration_prompt.md, one
// procedure (or procedure-group) at a time, mirroring how docs/chapter_integration_prompt.md
// drives physiology-chapter sessions against MillersCases.js. Each entry must follow the
// exact shape already established in MillersCases.js:
//   - A `PRESETS`-array entry: id (unique across BOTH banks), name, specialty,
//     description, and every patient/vitals/flag field CaseManager.jsx's custom-case
//     form and the physiology engines expect (age/sex/height/weight, vitals, mallampati/
//     neckMobility/airwayBlood, position, procedure, ebl/duration, npo times, ef/gfr,
//     comorbidity flags, and any condition-specific flags the case needs -- check
//     docs/state_tree.md before inventing a new flag).
//   - A matching `PRESET_METADATA` entry keyed by the same id: category, difficulty,
//     duration, teachingObjective, challenges (array).
//
// Never invent a patient/vitals number Jaffe doesn't give for the physiology engines to
// consume live (Bucket A discipline); anesthetic-plan/considerations content (Bucket B)
// may use a disclosed reasoned estimate the same way chapter sessions do. Cite the
// source chapter/procedure in each case's `description` or a trailing comment.

export const JAFFE_CASE_PRESETS = [
  {
    id: 'jaffe_inguinal_herniorrhaphy_open',
    name: 'General Surgery - Inguinal Herniorrhaphy (Open)',
    specialty: 'General Surgery',
    description: 'Elective open repair of a reducible right inguinal hernia in an otherwise healthy adult. Usual presentation is groin pain or a lump; typical EBL 25-50 mL, surgical time 1-1.5 h, pain score 4-5/10. Anesthetic plan (GA/regional/local/MAC all reasonable for an uncomplicated case) is shared with femoral herniorrhaphy, incisional hernia repair, and repair of abdominal dehiscence -- see the procedure Case Brief for the full preop/intraop/postop plan.',
    age: 52, sex: 'male', height: 178, weight: 82,
    hr: 74, sys: 128, dia: 78, spo2: 98, rr: 14, temp: 36.8,
    mallampati: 1, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Inguinal Herniorrhaphy (Open)',
    ebl: 'Low', duration: 75, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 2, ef: 60, gfr: 95,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    jaffeProcedureId: 'general-surgery-inguinal-herniorrhaphy-open',
  },
  {
    id: 'jaffe_laparoscopic_inguinal_hernia_repair',
    name: 'General Surgery - Laparoscopic Inguinal Hernia Repair (TEP)',
    specialty: 'General Surgery',
    description: 'Elective totally extraperitoneal (TEP) laparoscopic repair of a recurrent inguinal hernia -- laparoscopic approach is clearly preferred over open for recurrent or bilateral hernias. Typical EBL <50 mL, surgical time 1-2 h, pain score 3-4/10 (lower than open repair). Distinct, self-contained anesthetic plan from the open-repair group -- driven by pneumoperitoneum physiology (decreased venous return/CO, increased SVR) rather than a shared cross-reference; see the procedure Case Brief.',
    age: 58, sex: 'male', height: 176, weight: 85,
    hr: 76, sys: 130, dia: 80, spo2: 98, rr: 14, temp: 36.8,
    mallampati: 1, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false,
    position: 'Supine', procedure: 'Laparoscopic Inguinal Hernia Repair',
    ebl: 'Low', duration: 90, penicillinAllergy: false,
    npoSolids: 8, npoLiquids: 2, ef: 60, gfr: 92,
    betaBlocker: false, cad: false, afib: false, mg: false,
    burns: false, immobility: false, cp: 'none', htn: false, as: false,
    jaffeProcedureId: 'general-surgery-laparoscopic-inguinal-hernia-repair',
  },
];

export const JAFFE_CASE_METADATA = {
  jaffe_inguinal_herniorrhaphy_open: {
    category: 'General Surgery',
    difficulty: 'Easy',
    duration: 75,
    teachingObjective: 'Choosing between GA/regional/local anesthetic techniques for a common, usually straightforward elective general surgery case, and executing the shared hernia/dehiscence-repair anesthetic plan.',
    challenges: ['Anesthetic technique selection (GA vs. spinal/epidural vs. local ± MAC)', 'Vagal bradycardia from bowel/spermatic cord traction', 'Multimodal postop analgesia without over-relying on opioids'],
  },
  jaffe_laparoscopic_inguinal_hernia_repair: {
    category: 'General Surgery',
    difficulty: 'Medium',
    duration: 90,
    teachingObjective: 'Managing pneumoperitoneum-driven hemodynamic changes during a laparoscopic general surgery case, and recognizing trocar-related complications.',
    challenges: ['Pneumoperitoneum hemodynamics (decreased venous return/CO, increased SVR)', 'Trocar insertion hemorrhage / subcutaneous emphysema recognition', 'Same-day discharge readiness (1-2 h PACU target)'],
  },
};
