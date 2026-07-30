/**
 * Procedure-based teaching content sourced from Jaffe's Anesthesiologist's Manual of
 * Surgical Procedures. Sibling pattern to CAMKnowledgeEngine.ts / PositioningKnowledgeEngine.ts
 * -- plain typed data, no class, no side effects. Populated chapter-by-chapter via
 * docs/case_integration_prompt.md, starting from the drafts in scratch/jaffe_drafts/
 * (see src/jaffe_tools/extract_jaffe_procedures.ts) after a human/AI QA pass -- nothing
 * here should be entered without being checked against the actual source chapter.
 *
 * Deliberately decoupled from any specific patient: a JaffeProcedure is the reusable
 * teaching content (what to expect, what to watch for, the anesthetic plan), meant to be
 * paired with either a curated default patient (see caseBanks/JaffeCases.js) or a fully
 * custom one a resident builds to match a real patient they have coming up.
 */

export interface JaffeProcedureMorbidity {
  finding: string;
  rate: string;
}

export interface JaffeSurgicalProfile {
  description?: string;
  variantApproaches?: string;
  usualPreopDiagnosis?: string;
  position?: string;
  incision?: string;
  uniqueConsiderations?: string;
  specialInstrumentation?: string;
  antibiotics?: string;
  surgicalTimeRange?: string;
  eblExpected?: string;
  postopCare?: string;
  mortality?: string;
  morbidity?: JaffeProcedureMorbidity[];
  painScore?: string;
}

export interface JaffePatientPopulation {
  ageRange?: string;
  maleFemaleRatio?: string;
  incidence?: string;
  etiology?: string;
  associatedConditions?: string;
}

// A chapter-wide shared anesthetic plan (Jaffe frequently writes one plan for a cluster of
// related procedures rather than repeating it -- e.g. "Anesthetic Considerations for
// Ophthalmic Surgical Procedures Under MAC (adult)" covers most eye procedures in Ch2).
export interface JaffeAnestheticPlan {
  id: string;
  title: string;
  chapterSource: string;
  preop?: string;
  intraop?: string;
  postop?: string;
  fullText: string;
}

export interface JaffeProcedure {
  id: string; // unique slug across the whole KB, e.g. "gen-surg-inguinal-herniorrhaphy-open"
  name: string; // e.g. "Inguinal Herniorrhaphy (Open)"
  chapterSource: string; // "Jaffe_AMSP_6th_Edition_Chapter_7"
  subspecialty: string; // top grouping, e.g. "General Surgery"
  subgroup?: string; // Jaffe's own CHAPTER N.M sub-section name, when the book has one
  surgical: JaffeSurgicalProfile;
  patientPopulation: JaffePatientPopulation;
  anestheticPlanId: string; // key into JAFFE_ANESTHETIC_PLANS
  anestheticPlanDelta?: string; // procedure-specific prose layered on top of the shared plan
  citationPage?: number;
}

// Populated incrementally, chapter by chapter -- intentionally near-empty until a QA'd
// chapter pass adds real entries. Never hand-write bulk entries directly into this array;
// go through the draft-then-QA pipeline in docs/case_integration_prompt.md. The two
// entries below are the Phase 2 pilot (Ch7 General Surgery, pages 306-308 and 222-227),
// hand-verified against src/parsed texts/Jaffe_AMSP_6th_Edition_Chapter_7.json directly
// (word-level bounding-box order, not the flattened text, which drops some box content
// on these pages) -- not taken from the mechanical extractor's draft output as-is.

export const JAFFE_ANESTHETIC_PLANS: JaffeAnestheticPlan[] = [
  {
    id: 'general-surgery-hernia-and-dehiscence-repair',
    title: 'Anesthetic Considerations for Inguinal Herniorrhaphy, Femoral Herniorrhaphy, Incisional Hernia Repair, and Repair of Abdominal Dehiscence',
    chapterSource: 'Jaffe_AMSP_6th_Edition_Chapter_7',
    preop: `Predisposing factors for hernia often include increased abdominal pressure secondary to chronic cough, bladder outlet obstruction, constipation, pregnancy, vomiting, elevated BMI, and acute or chronic muscular effort. These factors should ideally be managed preoperatively to avoid postop recurrence. The patient population may range from premature infants to the elderly, who have the potential for presenting with multiple medical problems.

Musculoskeletal: Pain is likely to be present in the area of the hernia; evaluate bony landmarks if regional anesthesia is planned.

Gastrointestinal: Hernias may become incarcerated, obstructed, or strangulated, requiring emergency surgery. Fluid and electrolyte imbalance is likely. Tests: electrolytes, if indicated from H&P.

Hematologic: For regional anesthesia, assess the patient's coagulation status if indicated from H&P.

Laboratory: Other tests as indicated from H&P.

Premedication: If necessary, standard premedication.

ERAS: Check compliance with presurgical ERAS recommendations (including NPO status). If appropriate, discuss with the surgeon the possibility of a transversus abdominis plane block or thoracic epidural for postop pain management. Consider preop acetaminophen 1000 mg po with a sip of water. Consider aprepitant 40 mg po with a sip of water for patients with a history of severe PONV.`,
    intraop: `Anesthetic technique: General anesthesia, regional, or local anesthesia ± IV sedation (MAC) may all be appropriate for uncomplicated cases (e.g., without incarceration or obstruction). GA with epidural for postop pain control may be appropriate for patients with unusually large incisional hernias or abdominal dehiscence. Choice depends on site of incision, patient physical status, and preference of both patient and surgeon. Profound muscle relaxation may be necessary to facilitate exploration and repair.

Regional — Spinal: single-shot vs. continuous; patient in sitting or lateral decubitus position (operative site down) for a hyperbaric subarachnoid block. Doses for a T4-T6 level: 0.75% bupivacaine in 8.25% dextrose (10–15 mg), or 0.5% tetracaine in 5% dextrose (12–16 mg). Consider adding fentanyl (10–20 mcg) and/or morphine (100–200 mcg).

Regional — Epidural: patient in sitting or lateral decubitus position for catheter placement. After locating the epidural space, give a test dose (e.g., 3 mL of 1.5% lidocaine with 1:200,000 epinephrine) to rule out subarachnoid/intravascular placement. Titrate local anesthetic (2% lidocaine or 0.5% bupivacaine/ropivacaine) 5–7 mL at a time to the desired level, usually ~20 mL total. Consider fentanyl (25–100 mcg), or single-shot morphine (3–5 mg) instead if the catheter will be removed shortly after surgery (prolonged action; requires monitoring 16–24 h after injection).

Regional — Local: requires gentle surgical technique. Surgical field block plus ilioinguinal and iliohypogastric nerve blocks, using 0.5% bupivacaine with 1:200,000 epinephrine; often performed by the surgeon.

General anesthesia — Induction: standard induction; LMA may suit an uncomplicated chronic hernia, but a rapid-sequence induction with ET intubation is indicated for obstruction, incarceration, or strangulation, and GETA may also be indicated for wound dehiscence or large incisional hernias. ERAS: verify preincision antibiotics, assess volume status, maintain normovolemia and normothermia, consider preincision nerve blocks. Maintenance: standard; muscle relaxants may be necessary to facilitate surgical repair.

Emergence: consider extubating while still anesthetized to prevent coughing/straining (not for patients requiring awake intubation or RSI who are aspiration risks). Discuss local wound infiltration or nerve block (e.g., TAP block) placement/reinforcement with the surgeon if initially placed >4 h ago. Consider IV acetaminophen if the po dose was >6 h ago. PONV prophylaxis should include dexamethasone and ondansetron.

Blood and fluid: minimal blood loss expected. IV 16–18 ga × 1; balanced salt solution at 2–4 mL/kg/h.

Monitoring: standard. Positioning: pad pressure points, protect eyes.

Complications: bradycardia and hypotension from a vagal reflex evoked by bowel traction.`,
    postop: `Complications: PDPH after neuraxial block. Urinary retention is common with regional anesthesia — patients with urinary retention may require catheterization. Watch for wound dehiscence with coughing/straining.

Multimodal pain management: oral analgesics — acetaminophen alone or combined with codeine (Tylenol No. 3, 1–2 tab q4–6h) or oxycodone (Percocet, 1 tab q6h). A surgical field block or regional anesthesia should provide sufficient postop analgesia.

ERAS: follow the PONV protocol; encourage early enteral nutrition and mobilization; consider DVT prophylaxis.`,
    fullText: 'See preop/intraop/postop fields -- this plan covers inguinal herniorrhaphy, femoral herniorrhaphy, incisional hernia repair, and repair of abdominal dehiscence together, per Jaffe Ch7 p.314.',
  },
  {
    id: 'general-surgery-laparoscopic-inguinal-hernia-repair',
    title: 'Anesthetic Considerations for Laparoscopic Inguinal Hernia Repair',
    chapterSource: 'Jaffe_AMSP_6th_Edition_Chapter_7',
    preop: `Preop evaluation follows the same considerations as open inguinal hernia repair. Patients presenting for this procedure are generally healthy. Laparoscopic repair is usually associated with less pain and an earlier return to preop function compared to the open procedure; patients with strangulated or incarcerated hernias usually require an emergent open procedure instead.

Cardiovascular: changes caused by the pneumoperitoneum include decreased venous return → decreased cardiac output, and increased SVR. Decreased splanchnic/renal blood flow (→ decreased urine output) may result from high intra-abdominal pressures.

Laboratory: Hgb/Hct in healthy patients; otherwise as indicated from H&P.

Premedication: Standard.

ERAS: Check compliance with presurgical ERAS recommendations including NPO status. Consider preop acetaminophen 1000 mg po with a sip of water. Consider aprepitant 40 mg po with a sip of water for patients with a history of severe PONV.`,
    intraop: `Induction: standard induction; place an OG/NG tube before incision to decompress the stomach. ERAS: verify preincision antibiotics, assess volume status, maintain normovolemia and normothermia. Maintenance: standard.

Emergence: no special considerations beyond minimizing coughing; consider 1 mg/kg IV lidocaine for cough suppression. Discuss local wound infiltration with the surgeon. PONV prophylaxis may include dexamethasone and ondansetron.

Blood and fluid: blood loss should be minimal. IV 18 ga × 1; balanced salt solution at 3–5 mL/kg/h. Prevent hypothermia (forced-air warmer, heated/humidified gases, warming blanket, warm OR).

Monitoring: standard monitors plus a urinary catheter. Positioning: pad pressure points, protect eyes -- careful positioning/padding is essential.

Complications: hemorrhage from trocar insertion; subcutaneous emphysema (associated with the preperitoneal approach) -- these, and the general complications of laparoscopy, mirror Anesthetic Considerations for Laparoscopic Cholecystectomy.`,
    postop: `Complications: PONV; urinary retention (may need straight catheterization of the bladder).

Multimodal pain management: consider combining PCA or fixed-dose po/IV opioids with acetaminophen, po/IV NSAIDs, and gabapentin. Consider IV ketamine or IV lidocaine. Emphasize nonopioid analgesics (acetaminophen, NSAIDs).

ERAS: PONV protocol; consider multimodal analgesia; encourage early enteral nutrition and mobilization; consider DVT prophylaxis.`,
    fullText: 'See preop/intraop/postop fields -- Jaffe Ch7 p.222-224, self-contained plan for the laparoscopic approach (distinct from the open-repair shared plan).',
  },
];

export const JAFFE_PROCEDURES: JaffeProcedure[] = [
  {
    id: 'general-surgery-inguinal-herniorrhaphy-open',
    name: 'Inguinal Herniorrhaphy (Open)',
    chapterSource: 'Jaffe_AMSP_6th_Edition_Chapter_7',
    subspecialty: 'General Surgery',
    subgroup: 'Peritoneal Surgery',
    surgical: {
      description: `Groin hernias are defects in the transversus abdominis layer, where a direct hernia comes through the posterior wall of the inguinal canal, and an indirect hernia comes through the internal inguinal ring. Direct hernias are medial to the inferior epigastric artery and vein, whereas indirect hernias are lateral to these vessels.

Surgical approach can be anterior or posterior. An anterior approach (Bassini, McVay, Shouldice, or mesh repair) is generally used for primary repair of an indirect or direct inguinal hernia. The Bassini repair ligates the hernia sac and sutures the conjoint tendon to the shelving edge of Poupart's ligament. McVay repair sutures the conjoint tendon to Cooper's ligament and is usually reserved for femoral inguinal hernias. Shouldice repair emphasizes closing the transverse fascia and transversus abdominal muscle layers. Interposing Marlex mesh, or inserting a Marlex plug between the conjoint tendon, the internal oblique muscle, and the inguinal ligament, is now commonly used; mesh is associated with improved outcomes and less pain.

A posterior approach is used by some surgeons for femoral hernias, recurrent inguinal hernias, and incarcerated/strangulated hernias -- usually by suturing the transversus abdominis arch on the superior aspect of the defect to Cooper's ligament and the iliopubic tract on the inferior aspect.

A laparoscopic approach (see "Laparoscopic Inguinal Hernia Repair") is indicated for recurrent or bilateral inguinal hernias, uses a preperitoneal patch repair, and results in less postop pain and an earlier return to activity -- though randomized studies suggest laparoscopic repair has inferior long-term results compared to open.`,
      usualPreopDiagnosis: 'Groin pain or lump',
      position: 'Supine',
      incision: 'Oblique or transverse',
      uniqueConsiderations: 'Avoid damage to nerve structures and the spermatic cord. Avoid interfering with blood supply to the testes.',
      antibiotics: 'Cefazolin 2 g IV preop',
      surgicalTimeRange: '1–1.5 h',
      eblExpected: '25–50 mL',
      postopCare: 'PACU → ward, or discharge home in some cases',
      mortality: '3/100,000',
      morbidity: [
        { finding: 'Wound abscess', rate: '<3%' },
        { finding: 'Wound hematoma', rate: '<2%' },
      ],
      painScore: '4–5',
    },
    patientPopulation: {
      ageRange: '1–90 yr',
      maleFemaleRatio: '85:15',
      incidence: '15/1000',
      etiology: 'Congenital variants; reduced collagen synthesis in adults',
      associatedConditions: 'Chronic cough; urinary retention; chronic constipation',
    },
    anestheticPlanId: 'general-surgery-hernia-and-dehiscence-repair',
    citationPage: 306,
  },
  {
    id: 'general-surgery-laparoscopic-inguinal-hernia-repair',
    name: 'Laparoscopic Inguinal Hernia Repair',
    chapterSource: 'Jaffe_AMSP_6th_Edition_Chapter_7',
    subspecialty: 'General Surgery',
    subgroup: 'Laparoscopic General Surgery',
    surgical: {
      description: `Laparoscopic repair is clearly preferred for recurrent or bilateral hernias. For first-time unilateral hernias, there is no clear advantage in operative time, postop pain, or time to discharge compared with tension-free open repair.

There are three laparoscopic techniques. ONLAY has largely been discarded due to high recurrence rates. The other two are totally extraperitoneal (TEP) and transabdominal preperitoneal (TAPP). TEP is somewhat harder to learn but has lower recurrence and complication rates than TAPP.

For both TEP and TAPP, the patient is supine with both arms tucked; a small umbilical incision is made. For TEP, the incision only reaches the preperitoneal space and a balloon is used for dissection, with two additional midline ports (one suprapubic, one between the umbilicus and the suprapubic port). For TAPP, the umbilical incision extends into the abdomen, with two additional ports at the iliac crest level (RLQ and LLQ); a peritoneal flap over the hernia defect is created and the preperitoneal space entered. In both, the hernia defect is reduced, the cord structures freed, and mesh is placed to cover the area (tacked to Cooper's ligament for TEP; the peritoneal flap is tacked back over the mesh for TAPP). The robotic platform is increasingly used for the TAPP approach.`,
      variantApproaches: 'Open hernia repair (see "Inguinal Herniorrhaphy (Open)")',
      usualPreopDiagnosis: 'Inguinal hernia',
      position: 'Supine, arms tucked',
      incision: '3 ports -- 1 at the umbilicus; 2 either in the midline or in the RLQ/LLQ, depending on the laparoscopic approach used',
      uniqueConsiderations: 'Minimal time is needed for closing; muscle relaxation may be helpful.',
      specialInstrumentation: 'Balloon dissector and structural balloon for TEP repair',
      antibiotics: 'Cefazolin 2 g IV preop (weight-based dosing)',
      surgicalTimeRange: '1–2 h',
      eblExpected: '<50 mL',
      postopCare: '1–2 h in PACU/holding area → home',
      mortality: '<0.1%',
      morbidity: [
        { finding: 'Orchialgia, neuralgia', rate: '2%' },
        { finding: 'Recurrence of hernia (significant learning curve)', rate: 'not specified' },
        { finding: 'Bowel obstruction', rate: 'not specified' },
        { finding: 'Bladder injury', rate: 'rarely reported' },
      ],
      painScore: '3–4',
    },
    patientPopulation: {
      ageRange: 'Mostly adults',
      maleFemaleRatio: 'Male > female',
      incidence: 'Common',
      etiology: 'Most hernias congenital; chronically increased intra-abdominal pressure (e.g., chronic cough, obesity)',
      associatedConditions: 'None important',
    },
    anestheticPlanId: 'general-surgery-laparoscopic-inguinal-hernia-repair',
    citationPage: 222,
  },
];

export function getJaffeProcedure(id: string): JaffeProcedure | undefined {
  return JAFFE_PROCEDURES.find(p => p.id === id);
}

export function getJaffeAnestheticPlan(id: string): JaffeAnestheticPlan | undefined {
  return JAFFE_ANESTHETIC_PLANS.find(p => p.id === id);
}

export function searchJaffeProcedures(query: string): JaffeProcedure[] {
  if (!query || !query.trim()) return JAFFE_PROCEDURES;
  const q = query.trim().toLowerCase();
  return JAFFE_PROCEDURES.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.subspecialty.toLowerCase().includes(q) ||
    (p.subgroup || '').toLowerCase().includes(q)
  );
}

export function getJaffeProceduresBySubspecialty(): Record<string, JaffeProcedure[]> {
  const grouped: Record<string, JaffeProcedure[]> = {};
  for (const proc of JAFFE_PROCEDURES) {
    if (!grouped[proc.subspecialty]) grouped[proc.subspecialty] = [];
    grouped[proc.subspecialty].push(proc);
  }
  return grouped;
}
