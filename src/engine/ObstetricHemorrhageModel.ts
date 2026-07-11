/**
 * Obstetric Hemorrhage + Endocarditis Prophylaxis Model
 *
 * Two distinct clinical topics bundled:
 *
 * =========================================================================
 * A. OBSTETRIC HEMORRHAGE
 * =========================================================================
 * Postpartum hemorrhage (PPH) = blood loss ≥ 500 mL (vaginal) or ≥ 1000 mL (CS).
 * Severe PPH = blood loss ≥ 1500 mL OR requiring transfusion.
 * Leading cause of maternal mortality worldwide (~25% of maternal deaths).
 *
 * THE 4 T's OF PPH ETIOLOGY:
 * 1. TONE (80%): Uterine atony — uterus fails to contract (most common)
 *    Risk factors: prolonged labor, overdistended uterus (polyhydramnios, multiples,
 *    macrosomia), chorioamnionitis, volatile anesthetic MAC > 1.5
 *    Treatment: UTEROTONIC DRUGS (oxytocin → methylergonovine → carboprost → misoprostol)
 *    + bimanual uterine compression + B-Lynch suture + intrauterine balloon tamponade
 *
 * 2. TISSUE (10%): Retained placenta or products of conception
 *    Treatment: manual extraction, curettage under anesthesia
 *
 * 3. TRAUMA (5%): Lacerations, uterine rupture, hematoma
 *    Treatment: surgical repair
 *
 * 4. THROMBIN (5%): Coagulopathy (DIC, preeclampsia, amniotic fluid embolism)
 *    Treatment: FFP, cryoprecipitate, platelets, TXA
 *
 * MASSIVE OBSTETRIC HEMORRHAGE:
 * MTP applies (already modeled) but obstetric context requires:
 * - Oxytocin: must be continued (uterotonic) — use oxytocin infusion NOT bolus
 *   (bolus causes hypotension, tachycardia, myocardial ischemia)
 * - Cell saver: can be used (with leukocyte filter) to recover shed blood
 * - Avoid oxytocin bolus (hypotension risk with rapid administration)
 *
 * =========================================================================
 * B. ENDOCARDITIS PROPHYLAXIS
 * =========================================================================
 * Infective endocarditis (IE) prophylaxis is required for HIGH-RISK patients
 * undergoing dental procedures. NOT required for non-dental procedures.
 *
 * HIGH-RISK cardiac conditions:
 * 1. Prosthetic cardiac valve (mechanical or bioprosthetic)
 * 2. Prior history of infective endocarditis
 * 3. Congenital heart disease (specific types):
 *    - Unrepaired cyanotic CHD (including palliative shunts/conduits)
 *    - Completely repaired CHD within 6 months of repair
 *    - Repaired CHD with residual defect at prosthetic patch/device
 *    - NOT for repaired VSD/ASD after 6 months
 * 4. Cardiac transplant with valvulopathy
 *
 * PROPHYLAXIS (amoxicillin 2g PO 30-60 min before procedure):
 * If penicillin allergy: azithromycin 500mg OR clindamycin 600mg
 * IV alternative: ampicillin 2g IV (if unable to take PO)
 *
 * NOT INDICATED: Mitral valve prolapse WITHOUT regurgitation, bicuspid aortic valve,
 * CABG, non-dental procedures (colonoscopy, bronchoscopy, transesophageal echo).
 *
 * Sources: Wilson W, Circulation 2007 (AHA IE Prevention Guidelines);
 * Prendergast BD, Heart 2009; Miller's 9th Ed Ch 59 (OB); Cunningham, Williams Obstetrics.
 */

export interface ObstetricHemorrhageIEProphylaxisInputs {
  // Obstetric hemorrhage
  isPostpartum?: boolean;
  bloodLossMl?: number;              // estimated blood loss
  uterineAtonyPresent?: boolean;
  placentaRetained?: boolean;
  maternalDIC?: boolean;
  volatileMac?: number;              // high MAC → uterine relaxation

  // Uterotonics given
  oxytocinCe?: number;
  methylergCe?: number;              // methylergonovine
  carboprostCe?: number;
  misoprostolCe?: number;

  // Endocarditis prophylaxis
  hasProstheticValve?: boolean;
  hasHistoryIE?: boolean;
  hasCyanotic_CHD?: boolean;         // unrepaired or recent repair
  hasCardiacTransplantValvulopathy?: boolean;
  isDentalProcedure?: boolean;       // only indication for prophylaxis
  amoxicillinGiven?: boolean;        // prophylaxis drug
  clindamycinGiven?: boolean;        // penicillin allergy alternative

  // Event guards
  prevPPHLogged?: boolean;
  prevIEProphylaxisLogged?: boolean;
}

export interface ObstetricHemorrhageIEProphylaxisOutput {
  // PPH
  pphActive: boolean;
  pphSeverity: 'none' | 'minor' | 'major' | 'massive';
  primaryCause: string;               // "tone", "tissue", "trauma", "thrombin"
  utoronicEfficacy: number;          // 0-1
  uterineAtoxyContribToBleed: number; // 0-1

  // IE prophylaxis
  ieProphylaxisIndicated: boolean;
  ieProphylaxisGiven: boolean;
  prophylaxisAdequate: boolean;      // correct drug + timing

  prevPPHLogged: boolean;
  prevIEProphylaxisLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ObstetricHemorrhageModel {
  static tick(inputs: ObstetricHemorrhageIEProphylaxisInputs = {}): ObstetricHemorrhageIEProphylaxisOutput {
    const events: string[] = [];
    let prevPPHLogged = !!inputs.prevPPHLogged;
    let prevIEProphylaxisLogged = !!inputs.prevIEProphylaxisLogged;

    // ===========================
    // POSTPARTUM HEMORRHAGE
    // ===========================
    const isPostpartum = !!inputs.isPostpartum;
    const bloodLoss = clamp(safeNumber(inputs.bloodLossMl, 0), 0, 10000);
    const uterineAtony = !!inputs.uterineAtonyPresent;
    const placentaRetained = !!inputs.placentaRetained;
    const maternalDIC = !!inputs.maternalDIC;
    const volatileMac = clamp(safeNumber(inputs.volatileMac, 0), 0, 3);

    let pphSeverity: 'none' | 'minor' | 'major' | 'massive';
    if (!isPostpartum || bloodLoss < 500) pphSeverity = 'none';
    else if (bloodLoss < 1000) pphSeverity = 'minor';
    else if (bloodLoss < 2500) pphSeverity = 'major';
    else pphSeverity = 'massive';

    const pphActive = pphSeverity !== 'none';

    // Determine primary cause
    let primaryCause = 'unknown';
    if (uterineAtony || volatileMac > 1.5) primaryCause = 'tone (uterine atony)';
    else if (placentaRetained) primaryCause = 'tissue (retained placenta)';
    else if (maternalDIC) primaryCause = 'thrombin (coagulopathy)';
    else primaryCause = 'trauma (laceration/rupture)';

    // Uterotonic efficacy
    const oxytocinCe = clamp(safeNumber(inputs.oxytocinCe, 0), 0, 10);
    const methylergCe = clamp(safeNumber(inputs.methylergCe, 0), 0, 5);
    const carboprostCe = clamp(safeNumber(inputs.carboprostCe, 0), 0, 5);
    const misoprostolCe = clamp(safeNumber(inputs.misoprostolCe, 0), 0, 5);

    const utoronicEfficacy = clamp(
      oxytocinCe / (oxytocinCe + 1.0) * 0.60
      + methylergCe / (methylergCe + 0.5) * 0.50
      + carboprostCe / (carboprostCe + 0.5) * 0.55
      + misoprostolCe / (misoprostolCe + 1.0) * 0.40,
      0, 0.92,
    );

    const uterineAtoxyContribToBleed = uterineAtony ? Math.max(0, 1.0 - utoronicEfficacy) : 0;

    if (pphActive && pphSeverity !== 'minor' && !prevPPHLogged) {
      const volatileNote = volatileMac > 1.0
        ? `⚠️ VOLATILE MAC ${volatileMac.toFixed(1)} (> 1.0) is causing uterine relaxation — consider switching to TIVA (propofol + remifentanil) or reducing MAC to < 0.5 immediately. `
        : '';
      events.push(
        `🚨 POSTPARTUM HEMORRHAGE (${pphSeverity.toUpperCase()}): Blood loss ${bloodLoss.toFixed(0)} mL. Primary cause: ${primaryCause}. ${volatileNote}4 T's EVALUATION: TONE (atony — treat first: uterotonic cascade), TISSUE (retained — manual/surgical), TRAUMA (laceration — surgical), THROMBIN (coagulopathy — products). UTEROTONIC PROTOCOL: (1) Oxytocin 20-40 units/L INFUSION (NOT bolus — bolus causes hypotension/MI); (2) Methylergonovine 0.2 mg IM (CI in HTN/PEC); (3) Carboprost 0.25 mg IM q15min (CI in asthma); (4) Misoprostol 800 mcg SL/rectal. ${pphSeverity === 'massive' ? 'ACTIVATE MASSIVE TRANSFUSION PROTOCOL.' : ''} SURGICAL OPTIONS: B-Lynch suture, balloon tamponade, uterine artery ligation, hysterectomy.`,
      );
      prevPPHLogged = true;
    }

    // ===========================
    // IE PROPHYLAXIS
    // ===========================
    const hasPV = !!inputs.hasProstheticValve;
    const hasHistIE = !!inputs.hasHistoryIE;
    const hasCHD = !!inputs.hasCyanotic_CHD;
    const hasTxValve = !!inputs.hasCardiacTransplantValvulopathy;
    const isDental = !!inputs.isDentalProcedure;

    const ieProphylaxisIndicated = isDental && (hasPV || hasHistIE || hasCHD || hasTxValve);
    const amoxicillinGiven = !!inputs.amoxicillinGiven;
    const clindaGiven = !!inputs.clindamycinGiven;
    const ieProphylaxisGiven = amoxicillinGiven || clindaGiven;
    const prophylaxisAdequate = ieProphylaxisIndicated ? ieProphylaxisGiven : true;

    if (ieProphylaxisIndicated && !ieProphylaxisGiven && !prevIEProphylaxisLogged) {
      events.push(
        `⚠️ IE PROPHYLAXIS REQUIRED: High-risk cardiac condition (${hasPV ? 'prosthetic valve' : hasHistIE ? 'prior IE' : hasCHD ? 'cyanotic CHD' : 'cardiac transplant valvulopathy'}) undergoing dental procedure. GIVE: AMOXICILLIN 2g PO 30-60 min before procedure. If penicillin allergy: AZITHROMYCIN 500 mg PO OR CLINDAMYCIN 600 mg PO. IV alternative: AMPICILLIN 2g IV. NOT REQUIRED for non-dental procedures (bronchoscopy, colonoscopy, TEE, GU procedures).`,
      );
      prevIEProphylaxisLogged = true;
    }

    return {
      pphActive,
      pphSeverity,
      primaryCause,
      utoronicEfficacy: parseFloat(utoronicEfficacy.toFixed(4)),
      uterineAtoxyContribToBleed: parseFloat(uterineAtoxyContribToBleed.toFixed(4)),
      ieProphylaxisIndicated,
      ieProphylaxisGiven,
      prophylaxisAdequate,
      prevPPHLogged,
      prevIEProphylaxisLogged,
      events,
    };
  }
}
