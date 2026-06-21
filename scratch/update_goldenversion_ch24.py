import os
import requests

def main():
    file_path = "/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/goldenversion.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. TOC Update
    old_toc = '*   [6.74 Oxygen Supply Failure Protection Device ("Fail-Safe Valve")](#674-oxygen-supply-failure-protection-device-fail-safe-valve)'
    new_toc = (
        '*   [6.74 Oxygen Supply Failure Protection Device ("Fail-Safe Valve")](#674-oxygen-supply-failure-protection-device-fail-safe-valve)\n'
        '    *   [6.75 Opioid-Induced Urinary Retention](#675-opioid-induced-urinary-retention)'
    )
    if old_toc in content:
        content = content.replace(old_toc, new_toc)
        print("Updated TOC.")
    else:
        print("Warning: TOC target not found.")

    # 2. Section 5.17 Body Update using raw string
    old_517 = r"""#### 5.17 Opioid Physiology & Pharmacodynamics
Opioids selectively bind to G-protein coupled Mu-opioid receptors ($\mu_1, \mu_2$), triggering Gi-protein activation, inhibition of adenylate cyclase, decreased intracellular cAMP, closing of voltage-gated calcium channels, and opening of inward-rectifying potassium channels. This hyperpolarizes neurons, suppressing nociceptive transmission.
*   **Respiratory Depression**: Opioids depress the hypercapnic and hypoxic ventilatory response curves by acting directly on Mu receptors in the pre-Bötzinger complex.
*   **Chest Wall Rigidity**: High doses or rapid administration of lipophilic agonists (Fentanyl, Remifentanil, Sufentanil) lock the chest wall, creating severe apnea, compliance drops to $3\text{ mL/cmH2O}$, and airway resistance of $999\text{ cmH2O/L/s}$.
*   **Sphincter of Oddi Spasm**: Agonist accumulation leads to severe choledochoduodenal spasm, causing bile duct pressure spikes and intense biliary colic pain.
*   **Pruritus**: Induced centrally via Mu-receptor co-activation with gastrin-releasing peptide receptors, manifesting as severe facial itching."""

    new_517 = r"""#### 5.17 Opioid Physiology & Pharmacodynamics
Opioids selectively bind to G-protein coupled Mu-opioid receptors ($\mu_1, \mu_2$), triggering Gi-protein activation, inhibition of adenylate cyclase, decreased intracellular cAMP, closing of voltage-gated calcium channels, and opening of inward-rectifying potassium channels. This hyperpolarizes neurons, suppressing nociceptive transmission.
*   **Genotype Sensitivity (A118G Exon 1 SNP)**: Patients heterozygous or homozygous for the A118G allele exhibit significantly reduced analgesic/hypnosis sensitivity to mu-opioid receptor agonists (e.g., Morphine). This is modeled by scaling the analgesia/hypnosis $C_{50}$ by $3.0\times$ (i.e., $C_{50,\text{A118G}} = 3.0 \cdot C_{50,\text{wildtype}}$) when `opioidReceptorGenotype` is `'A118G'`. Crucially, respiratory depression sensitivity remains identical to wildtype (`'A118A'`), separating the therapeutic window (Ch24, Miller's 9th Ed, p.726).
*   **Morphine Active Metabolites (M3G/M6G)**: Morphine undergoes hepatic glucuronidation (via UGT2B7) into Morphine-6-Glucuronide (M6G, 10% yield) and Morphine-3-Glucuronide (M3G, 60% yield). M6G is an active mu-receptor agonist that causes respiratory depression, competitively antagonized by Naloxone ($K_i = 0.001\text{ mg/L}$). M3G is neuroexcitatory, causing seizures that are aborted by GABA-A agonists (Propofol or Midazolam). Both metabolites accumulate in renal failure and are cleared proportionally to the patient's `renalRatio` ($Cl_{\text{metabolite}} = Cl_{\text{baseline}} \cdot \text{renalRatio}$) (Ch24, Miller's 9th Ed, p.728).
*   **Respiratory Depression**: Opioids depress the hypercapnic and hypoxic ventilatory response curves by acting directly on Mu receptors in the pre-Bötzinger complex.
*   **Chest Wall Rigidity**: High doses or rapid administration of lipophilic agonists (Fentanyl, Remifentanil, Sufentanil) lock the chest wall, creating severe apnea, compliance drops to $3\text{ mL/cmH2O}$, and airway resistance of $999\text{ cmH2O/L/s}$.
*   **Sphincter of Oddi Spasm**: Agonist accumulation leads to severe choledochoduodenal spasm, causing bile duct pressure spikes and intense biliary colic pain (Ch24, Miller's 9th Ed, p.730).
*   **Pruritus**: Induced centrally via Mu-receptor co-activation with gastrin-releasing peptide receptors, manifesting as severe facial itching."""

    if old_517 in content:
        content = content.replace(old_517, new_517)
        print("Updated Section 5.17.")
    else:
        normalized_old = old_517.replace("\r\n", "\n")
        normalized_content = content.replace("\r\n", "\n")
        if normalized_old in normalized_content:
            content = normalized_content.replace(normalized_old, new_517)
            print("Updated Section 5.17 (normalized spacing).")
        else:
            print("Warning: Section 5.17 target not found.")

    # 3. Section 6.58 Update
    old_658 = r"""#### 6.58 Sphincter of Oddi Spasm & Biliary Colic
*   **Trigger Conditions**: Opioid agonist accumulation (`morphineCe > 0.04` or `fentanylCe > 0.001`). Triggers probabilistically by default (2% baseline clinical incidence, increased 4x if elderly [age >50] or 10x if prior biliary disease/cholecystectomy). Can be forced deterministically via `forceSphincterOfOddiSpasm: true` in patient state.
*   **Physiological Impact**: Spasm of the choledochoduodenal sphincter induces severe biliary colic pain, causing autonomic surges (+15 bpm HR and +20 mmHg MAP offsets).
*   **Mitigation / Resolution**: Reversible by Naloxone (`naloxoneCe > 0.001`) or Atropine (`atropineCe > 0.01`)."""

    new_658 = r"""#### 6.58 Sphincter of Oddi Spasm & Biliary Colic
*   **Trigger Conditions**: Combined sphincter stimulation index exceeds $0.8$. The index is calculated as:
    $$\text{OddiStim} = 20 \cdot C_{e,\text{morphine}} + 500 \cdot C_{e,\text{fentanyl}} + 3000 \cdot C_{e,\text{sufentanil}} + 80 \cdot C_{e,\text{hydromorphone}} + 800 \cdot C_{e,\text{remifentanil}} - 5 \cdot C_{e,\text{meperidine}}$$
    Meperidine acts as a protective inhibitor/antagonist on Oddi spasm. Triggers probabilistically by default (2% baseline clinical incidence, increased 4x if elderly [age >50] or 10x if prior biliary disease/cholecystectomy). Can be forced deterministically via `forceSphincterOfOddiSpasm: true` in patient state.
*   **Physiological Impact**: Spasm of the choledochoduodenal sphincter induces severe biliary colic pain, causing autonomic surges (+15 bpm HR and +20 mmHg MAP offsets).
*   **Mitigation / Resolution**: Reversible by Naloxone (`naloxoneCe > 0.001`), Atropine (`atropineCe > 0.01`), or Nitroglycerin rescue (`nitroglycerinCe > 0.01`) (Ch24, Miller's 9th Ed, p.730)."""

    if old_658 in content:
        content = content.replace(old_658, new_658)
        print("Updated Section 6.58.")
    else:
        normalized_old = old_658.replace("\r\n", "\n")
        normalized_content = content.replace("\r\n", "\n")
        if normalized_old in normalized_content:
            content = normalized_content.replace(normalized_old, new_658)
            print("Updated Section 6.58 (normalized spacing).")
        else:
            print("Warning: Section 6.58 target not found.")

    # 4. Add Section 6.75 before Section 7
    old_sec7 = """### 7. Attending Direct Chat, Advisor & NLP Engine"""
    new_sec7 = r"""#### 6.75 Opioid-Induced Urinary Retention
*   **Trigger Conditions**: Opioid effect-site concentration (analgesia effect) exceeds $0.30$. Triggers probabilistically by default (15% baseline clinical incidence, increased $1.8\times$ if male, $1.5\times$ if age $>60$, and $3.0\times$ if both). Can be forced deterministically via `forceUrinaryRetention: true` in the patient state.
*   **Physiological Impact**: Urinary retention sets the active voiding rate to zero. Bladder volume continues to accumulate dynamically based on GFR:
    $$\frac{d(V_{\text{bladder}})}{dt} = UOP_{\text{mL/min}} \cdot \Delta t \quad [\text{mL}]$$
    When bladder volume exceeds $400\text{ mL}$, the distension causes significant discomfort and autonomic sympathetic response, causing $+5\text{ bpm}$ HR and $+5\text{ mmHg}$ MAP offsets.
*   **Resolution Criteria**: Placement of a Foley catheter (`hasFoley === true`) drains the bladder immediately ($50\text{ mL/s}$ drainage rate) and resolves the retention. Alternatively, Naloxone administration (`naloxoneCe > 0.001`) reverses the mu-opioid receptor blockade on the detrusor muscle/urethral sphincter, restoring spontaneous voiding (Ch24, Miller's 9th Ed, p.729).

### 7. Attending Direct Chat, Advisor & NLP Engine"""

    if old_sec7 in content:
        content = content.replace(old_sec7, new_sec7)
        print("Added Section 6.75.")
    else:
        normalized_old = old_sec7.replace("\r\n", "\n")
        normalized_content = content.replace("\r\n", "\n")
        if normalized_old in normalized_content:
            content = normalized_content.replace(normalized_old, new_sec7)
            print("Added Section 6.75 (normalized spacing).")
        else:
            print("Warning: Section 7 target not found.")

    # 5. Section 11 Updates
    old_usephys = """2.  [`usePhysiology.js`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js): Central mathematical simulation thread. Drives gas kinetics, fluid volumes, hemodynamic changes, and timeline auto-advancements."""
    new_usephys = """2.  [`usePhysiology.js`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js): Central mathematical simulation thread. Drives gas kinetics, fluid volumes, hemodynamic changes, active Morphine metabolites (M3G/M6G) kinetics and neuroexcitatory/respiratory dynamics, combined Sphincter of Oddi spasm stimulation, and timeline auto-advancements."""

    if old_usephys in content:
        content = content.replace(old_usephys, new_usephys)
        print("Updated Section 11 usePhysiology.")
    else:
        normalized_old = old_usephys.replace("\r\n", "\n")
        normalized_content = content.replace("\r\n", "\n")
        if normalized_old in normalized_content:
            content = normalized_content.replace(normalized_old, new_usephys)
            print("Updated Section 11 usePhysiology (normalized spacing).")
        else:
            print("Warning: Section 11 usePhysiology target not found.")

    old_renaleng = """12. [`RenalEngine.ts`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts): Pure physical sub-engine coordinating renal perfusion pressure, GFR/RBF autoregulation, ADH/aldosterone/Angiotensin II (RAAS) loops, loop/osmotic diuretics, BUN/creatinine kinetics, and KDIGO AKI staging."""
    new_renaleng = """12. [`RenalEngine.ts`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts): Pure physical sub-engine coordinating renal perfusion pressure, GFR/RBF autoregulation, bladder volume accumulation, drainage via Foley catheterization, ADH/aldosterone/Angiotensin II (RAAS) loops, loop/osmotic diuretics, BUN/creatinine kinetics, and KDIGO AKI staging."""

    if old_renaleng in content:
        content = content.replace(old_renaleng, new_renaleng)
        print("Updated Section 11 RenalEngine.")
    else:
        normalized_old = old_renaleng.replace("\r\n", "\n")
        normalized_content = content.replace("\r\n", "\n")
        if normalized_old in normalized_content:
            content = normalized_content.replace(normalized_old, new_renaleng)
            print("Updated Section 11 RenalEngine (normalized spacing).")
        else:
            print("Warning: Section 11 RenalEngine target not found.")

    # 6. Section 12 Dependency Table Updates
    old_table_end = """| **Inhaled Anesthetics Molecular Targets** | Receptors (GABA-A, Glycine, NMDA, K2P, HCN, Na+ channels, nAChRs) drive target occupancies. Supports genetic knockouts (TASK-1/3, TREK-1, HCN1) and nonimmobilizers (F6). | None. | Molecular target binding occupancies are unmodeled; MAC and sedative values are aggregated without detailed receptor-level pathway modeling. |"""
    new_table_end = (
        '| **Inhaled Anesthetics Molecular Targets** | Receptors (GABA-A, Glycine, NMDA, K2P, HCN, Na+ channels, nAChRs) drive target occupancies. Supports genetic knockouts (TASK-1/3, TREK-1, HCN1) and nonimmobilizers (F6). | None. | Molecular target binding occupancies are unmodeled; MAC and sedative values are aggregated without detailed receptor-level pathway modeling. |\n'
        '| **Opioid Genotype Sensitivity (A118G Exon 1 SNP)** | Scaling of analgesic/sedative C50 by 3.0x under `\'A118G\'` genotype in [PKPDEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/PKPDEngine.ts) (§5.17). | Chapter 24, p.726 (A118G SNP reduces opioid potency 3-fold for analgesic outcomes). | None. Previously, all patients had uniform sensitivity to opioids regardless of genetic polymorphism. |\n'
        '| **Morphine Active Metabolites (M6G/M3G) & Renal Accumulation** | Morphine hepatic conjugation to active M6G (respiratory depression) and M3G (neuroexcitation/seizures) with clearance scaled by renal function in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js) (§5.17/§6.6). | Chapter 24, p.728 (M6G retains mu-receptor agonist activity; M3G causes neuroexcitation; both accumulate in renal failure). | None. Previously, morphine clearance was modeled without active metabolites, ignoring prolonged sedation and seizure risks in renal impairment. |\n'
        '| **Sphincter of Oddi Spasm & Biliary Colic** | Combined agonist index calculation with Meperidine protection and Nitroglycerin rescue in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js) (§6.58). | Chapter 24, p.730 (opioids contract the sphincter of Oddi; meperidine has less effect or antagonist properties; nitroglycerin reverses spasm). | None. Previously, spasm was triggered by single-drug thresholds of morphine or fentanyl without combination scaling, meperidine inhibition, or nitroglycerin rescue. |\n'
        '| **Opioid-Induced Urinary Retention** | Detention bladder volume accumulation, discomfort heart rate/MAP offsets, and drainage via Foley catheter or Naloxone reversal in [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts) and [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js) (§6.75). | Chapter 24, p.729 (opioids inhibit detrusor muscle contraction and increase sphincter tone, causing retention, reversed by naloxone). | None. Previously, urine output was never accumulated in the bladder, and Foley placement had no physiological backing or relief pathway. |'
    )

    if old_table_end in content:
        content = content.replace(old_table_end, new_table_end)
        print("Updated Section 12 Table.")
    else:
        normalized_old = old_table_end.replace("\r\n", "\n")
        normalized_content = content.replace("\r\n", "\n")
        if normalized_old in normalized_content:
            content = normalized_content.replace(normalized_old, new_table_end)
            print("Updated Section 12 Table (normalized spacing).")
        else:
            print("Warning: Section 12 Table target not found.")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully wrote updated goldenversion.md.")

    # Send HTTP POST request to update-goldenversion
    url = "http://localhost:9091/update-goldenversion"
    try:
        response = requests.post(url, json={"markdownContent": content}, timeout=5)
        print(f"POST response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed to send POST request: {e} (This is normal if the server is offline; local file has been successfully written).")

if __name__ == "__main__":
    main()
