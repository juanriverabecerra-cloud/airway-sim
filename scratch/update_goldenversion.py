import os

def update_golden_version():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents
    old_toc_resp = "*   [4.6 Respiratory Volumes & Mechanics](#46-respiratory-volumes--mechanics)"
    new_toc_resp = "*   [4.6 Respiratory Volumes, Mechanics & Upper Airway Resistance](#46-respiratory-volumes-mechanics--upper-airway-resistance)"
    content = content.replace(old_toc_resp, new_toc_resp)

    old_toc_alv = "*   [4.7 Alveolar Ventilation & Apnea Kinetics](#47-alveolar-ventilation--apnea-kinetics)"
    new_toc_alv = "*   [4.7 Alveolar Ventilation, Apnea Kinetics & Loop Gain](#47-alveolar-ventilation-apnea-kinetics--loop-gain)"
    content = content.replace(old_toc_alv, new_toc_alv)

    old_toc_con = "*   [5.9 Consciousness, Memory, & Processed EEG Engine](#59-consciousness-memory--processed-eeg-engine)"
    new_toc_con = "*   [5.9 Consciousness, Sleep Stages, Memory, & Processed EEG Engine](#59-consciousness-sleep-stages-memory--processed-eeg-engine)"
    content = content.replace(old_toc_con, new_toc_con)

    old_toc_crises = "*   [6.10 Connected Intraoperative Awareness & Neuro-Cognitive Crises](#610-connected-intraoperative-awareness--neuro-cognitive-crises)"
    new_toc_crises = ("*   [6.10 Connected Intraoperative Awareness & Neuro-Cognitive Crises](#610-connected-intraoperative-awareness--neuro-cognitive-crises)\n"
                      "    *   [6.11 Obstructive Sleep Apnea Collapse Crisis](#611-obstructive-sleep-apnea-collapse-crisis)\n"
                      "    *   [6.12 Cheyne-Stokes Respiration & Central Sleep Apnea](#612-cheyne-stokes-respiration--central-sleep-apnea)\n"
                      "    *   [6.13 Obesity Hypoventilation Syndrome Loop](#613-obesity-hypoventilation-syndrome-loop)\n"
                      "    *   [6.14 Special SDB Anesthesia Bundle Checklist](#614-special-sdb-anesthesia-bundle-checklist)")
    content = content.replace(old_toc_crises, new_toc_crises)

    # 2. Update Section 4.6 (Respiratory Volumes & Mechanics)
    old_sec_46 = "#### 4.6 Respiratory Volumes & Mechanics (`RespiratoryEngine.ts`)"
    new_sec_46 = ("#### 4.6 Respiratory Volumes, Mechanics & Upper Airway Resistance (`RespiratoryEngine.ts`)\n"
                  "*   **Upper Airway Resistance ($R_{\\text{upper}}$)**: Models pharyngeal patency as a function of neuromuscular blockade, anesthetic depth, sleep stage REM atonia, and airway pressures:\n"
                  "    $$R_{\\text{upper}} = \\frac{R_{\\text{base}}}{(\\text{dilatorMuscleTone})^{2.5}} \\cdot e^{0.5 \\cdot (P_{\\text{crit}} - P_{\\text{airway}})}$$\n"
                  "    where $R_{\\text{base}} = 5\\text{ cmH2O/L/s}$ is the baseline airway resistance, $P_{\\text{crit}}$ is the critical pharyngeal collapse pressure (mmHg), and $P_{\\text{airway}}$ is the positive pressure in the airway (mmHg, e.g. PEEP, CPAP, or BiPAP settings).\n"
                  "    *   *Dilator Genioglossus Muscle Tone ($\\text{dilatorMuscleTone}$)*: Represents upper airway dilator muscle activity index ($0.0 - 1.0$).\n"
                  "        $$\\text{dilatorMuscleTone} = 1.0 - \\text{NMBA}_{\\text{block}} - 0.7 \\cdot \\text{Propofol}_{Ce} - 0.5 \\cdot \\text{Volatile}_{\\text{MAC}} - \\text{REMAtonia}_{\\text{penalty}}$$\n"
                  "        where $\\text{NMBA}_{\\text{block}}$ is nicotinic acetylcholine receptor occupancy, and $\\text{REMAtonia}_{\\text{penalty}} = 0.85$ when the active sleep stage is REM (Stage R).\n"
                  "    *   *Pharyngeal Collapse Pressure ($P_{\\text{crit}}$)*: Mapped based on patient airway status. In normal patients, $P_{\\text{crit}} = -5.0\\text{ mmHg}$ (highly stable). In moderate-to-severe Obstructive Sleep Apnea (OSA) patients, $P_{\\text{crit}}$ increases to $\\ge 0.0\\text{ mmHg}$ (collapses even at atmospheric pressure).\n"
                  "\n"
                  "#### 4.6.1 Predicted Lung Volumes (ECCS/ERS 1993)")
    content = content.replace(old_sec_46, new_sec_46)
    content = content.replace("*   **Predicted Lung Volumes (ECCS/ERS 1993)**:", "")

    # 3. Update Section 4.7 (Alveolar Ventilation & Apnea Kinetics)
    old_sec_47 = "#### 4.7 Alveolar Ventilation & Apnea Kinetics"
    new_sec_47 = ("#### 4.7 Alveolar Ventilation, Apnea Kinetics & Loop Gain\n"
                  "*   **Chemoreceptor Feedback Loop Gain ($LG$)**: Quantifies ventilatory control stability and propensity to periodic breathing:\n"
                  "    $$LG = G_{\\text{controller}} \\cdot G_{\\text{plant}} \\cdot \\text{mixingGainMod}$$\n"
                  "    *   *Controller Gain ($G_{\\text{controller}}$)*: Sensitivity of the central and peripheral chemoreceptors to changes in $PaCO_2$.\n"
                  "        $$G_{\\text{controller}} = G_{\\text{base}} \\cdot \\max(1.0, 1.0 + 3.0 \\cdot (7.4 - pH) + 2.0 \\cdot \\frac{100 - SpO_2}{10})$$\n"
                  "        where $G_{\\text{base}} = 1.2$. It increases significantly during severe hypoxia (e.g. altitude exposure, low $FiO_2$) and metabolic acidosis.\n"
                  "    *   *Plant Gain ($G_{\\text{plant}}$)*: Efficiency of the lungs in clearing $CO_2$ from the blood.\n"
                  "        $$G_{\\text{plant}} = \\frac{1.0}{\\text{recruitedFRC\\_L}}$$\n"
                  "        It is inversely proportional to functional residual capacity ($FRC$). It increases under lung volume restriction, atelectasis, or supine/Trendelenburg positioning, causing larger $PaCO_2$ swings per breath.\n"
                  "    *   *Mixing Gain ($mixingGainMod$)*: Scales with circulatory mixing delay ($mixingGain$, in seconds, representing transport time from pulmonary capillaries to chemoreceptors):\n"
                  "        $$\\text{mixingGainMod} = \\frac{\\text{mixingGain}}{12.0}$$\n"
                  "        In patients with Congestive Heart Failure (CHF) or severe low cardiac output states, circulatory delay exceeds $30\\text{ seconds}$ (increasing `mixingGain` to $\\ge 30.0$, thus elevating loop gain to $LG > 1.0$).\n"
                  "*   **Periodic Crescendo-Decrescendo Breathing (Cheyne-Stokes Respiration [CSR])**: When $LG > 1.0$ and the patient is in NREM sleep (stages N1/N2), the respiratory rate ($RR$) and Tidal Volume ($V_T$) oscillate cyclically:\n"
                  "    $$RR_{\\text{oscillated}} = RR_{\\text{target}} \\cdot (1.0 + \\sin(\\theta_{\\text{CSR}}))$$\n"
                  "    $$V_{T,\\text{oscillated}} = V_T \\cdot (1.0 + \\sin(\\theta_{\\text{CSR}}))$$\n"
                  "    where $\\theta_{\\text{CSR}} = \\frac{t \\cdot 2\\pi}{60}$ (representing a 60-second periodic cycle of hyperpnea followed by central apnea).\n"
                  "*   **Apneic Threshold PaCO2**: If $PaCO_2$ drops below the threshold (normally $35\\text{ mmHg}$ but shifts rightward to $40\\text{ mmHg}$ during sleep):\n"
                  "    $$PaCO_2 < \\text{apneicThresholdPaCO2}$$\n"
                  "    all respiratory muscle drive ceases ($RR = 0$, $V_A = 0$), causing central apnea.\n"
                  "\n"
                  "*   **Alveolar Ventilation ($V_A$)**:")
    content = content.replace(old_sec_47, new_sec_47)
    content = content.replace("*   **Alveolar Ventilation ($V_A$)**:", "")

    # 4. Update Section 5.9 (Consciousness, Sleep Stages, Memory & Processed EEG Engine)
    old_sec_59 = "#### 5.9 Consciousness, Memory, & Processed EEG Engine (`ConsciousnessEngine.ts`)"
    new_sec_59 = ("#### 5.9 Consciousness, Sleep Stages, Memory, & Processed EEG Engine (`ConsciousnessEngine.ts`)\n"
                  "This engine models the sleep-wake network of the brain as affected by general anesthesia. Highly volatile kinetics (such as receptor dynamics and nuclei interactions) are solved using 10x Euler sub-stepping ($dt_{\\text{sub}} = 0.1\\text{ s}$).")
    content = content.replace(old_sec_59, new_sec_59)
    # Remove redundant description that follows
    content = content.replace("This engine models the sleep-wake network of the brain as affected by general anesthesia. Highly volatile kinetics (such as receptor dynamics and nuclei interactions) are solved using 10x Euler sub-stepping ($dt_{\\text{sub}} = 0.1\\text{ s}$).", "")

    # Subcortical Sleep-wake nuclei replacements
    old_lc = "*   **Locus Ceruleus (LC)**: Noradrenergic wake-promoting core. Active at baseline ($1.0$). Hyperpolarized by dexmedetomidine, propofol, thiopental, halothane, and sleep-active inputs from VLPO."
    new_lc = ("*   **Locus Ceruleus (LC)**: Noradrenergic wake-promoting core. Active at baseline ($1.0$). Hyperpolarized by dexmedetomidine, propofol, thiopental, halothane, and sleep-active inputs from VLPO and MnPO.\n"
              "    $$\\text{LC}_{\\text{target}} = \\max\\left(0.01, 1.0 - 0.9 \\cdot \\text{Dex}_{\\text{effective}} - 0.5 \\cdot \\text{Propofol}_{Ce} - 0.4 \\cdot \\text{Thiopental}_{Ce} - 0.4 \\cdot \\text{Halo}_{\\text{MAC}} + 0.3 \\cdot \\text{Ketamine}_{Ce} - 0.8 \\cdot \\text{VLPO} - 0.5 \\cdot \\text{MnPO}\\right)$$\n"
              "    *Atipamezole blocks Dexmedetomidine competitively at Alpha-2 receptors:* $\\text{Dex}_{\\text{effective}} = \\text{dexmedCe} / (1.0 + \\text{atipamezoleCe} \\cdot 8.0)$.")
    content = content.replace(old_lc, new_lc)
    content = content.replace("$$\\text{LC}_{\\text{target}} = \\max\\left(0, 1.0 - 0.9 \\cdot \\text{Dex}_{\\text{effective}} - 0.5 \\cdot \\text{Propofol}_{Ce} - 0.4 \\cdot \\text{Thiopental}_{Ce} - 0.4 \\cdot \\text{Halo}_{\\text{MAC}} + 0.3 \\cdot \\text{Ketamine}_{Ce} - 0.8 \\cdot \\text{VLPO}\\right)$$", "")
    content = content.replace("*Atipamezole blocks Dexmedetomidine competitively at Alpha-2 receptors:* $\\text{Dex}_{\\text{effective}} = \\text{dexmedCe} / (1.0 + \\text{atipamezoleCe} \\cdot 8.0)$.", "")

    old_tmn = "*   **Tuberomammillary Nucleus (TMN)**: Histaminergic wake-promoting center. Inhibited by propofol (unless TMN-propofol resistant comorbidity), thiopental, halothane, and VLPO."
    new_tmn = ("*   **Tuberomammillary Nucleus (TMN)**: Histaminergic wake-promoting center. Inhibited by propofol (unless TMN-propofol resistant comorbidity), thiopental, halothane, VLPO, and MnPO.\n"
               "    $$\\text{TMN}_{\\text{target}} = \\max\\left(0.01, 1.0 - \\text{PropEffect}_{\\text{TMN}} - 0.7 \\cdot \\text{Thiopental}_{Ce} - 0.6 \\cdot \\text{Halo}_{\\text{MAC}} - 0.8 \\cdot \\text{VLPO} - 0.6 \\cdot \\text{MnPO}\\right)$$")
    content = content.replace(old_tmn, new_tmn)
    content = content.replace("$$\\text{TMN}_{\\text{target}} = \\max\\left(0, 1.0 - \\text{PropEffect}_{\\text{TMN}} - 0.7 \\cdot \\text{Thiopental}_{Ce} - 0.6 \\cdot \\text{Halo}_{\\text{MAC}} - 0.8 \\cdot \\text{VLPO}\\right)$$", "")

    old_vlpo = "*   **Ventrolateral Preoptic Nucleus (VLPO)**: GABA/galanin sleep-active center. Activated by propofol, thiopental, dexmedetomidine, and isoflurane."
    new_vlpo = ("*   **Ventrolateral Preoptic Nucleus (VLPO)**: GABA/galanin sleep-active core. Activated by propofol, thiopental, dexmedetomidine, and isoflurane.\n"
                "    $$\\text{VLPO}_{\\text{target}} = \\min\\left(1.0, 0.8 \\cdot \\text{Propofol}_{Ce} + 0.7 \\cdot \\text{Thiopental}_{Ce} + 0.9 \\cdot \\text{Dex}_{\\text{effective}} + 0.5 \\cdot \\text{Iso}_{\\text{MAC}}\\right)$$\n"
                "*   **Median Preoptic Nucleus (MnPO)**: Sleep-active center located at the rostral end of the third ventricle. Inhibits AAS wake-promoting nuclei, co-mediating sleep induction:\n"
                "    $$\\text{MnPO}_{\\text{target}} = \\min\\left(1.0, 0.75 \\cdot \\text{Propofol}_{Ce} + 0.6 \\cdot \\text{Thiopental}_{Ce} + 0.8 \\cdot \\text{Dex}_{\\text{effective}} + 0.4 \\cdot \\text{Iso}_{\\text{MAC}}\\right)$$\n")
    content = content.replace(old_vlpo, new_vlpo)
    content = content.replace("$$\\text{VLPO}_{\\text{target}} = \\min\\left(1.0, 0.8 \\cdot \\text{Propofol}_{Ce} + 0.7 \\cdot \\text{Thiopental}_{Ce} + 0.9 \\cdot \\text{Dex}_{\\text{effective}} + 0.5 \\cdot \\text{Iso}_{\\text{MAC}}\\right)$$", "")

    old_orexin = "*   **Orexinergic Neurons (Lateral Hypothalamus)**: Wake-promoting orexin A/B pathway. Inhibited by propofol, sevoflurane, and isoflurane (spared by halothane). A baseline deficiency models narcolepsy."
    new_orexin = ("*   **Orexinergic Neurons (Lateral Hypothalamus)**: Wake-promoting orexin A/B pathway. Inhibited by propofol, sevoflurane, and isoflurane (spared by halothane). A baseline deficiency models narcolepsy. Receptors ($OX_1R$ and $OX_2R$) are competitively blocked by Suvorexant:\n"
                  "    $$\\text{Orexin}_{\\text{effective}} = \\frac{\\text{Orexin}_{\\text{level}}}{1.0 + \\text{Suvorexant}_{Ce} \\cdot 5.0}$$\n"
                  "    $$\\text{Orexin}_{\\text{target}} = \\max\\left(0, \\text{Orexin}_{\\text{base}} - 0.8 \\cdot \\text{Propofol}_{Ce} - 0.6 \\cdot \\text{Sevo}_{\\text{MAC}} - 0.6 \\cdot \\text{Iso}_{\\text{MAC}}\\right)$$")
    content = content.replace(old_orexin, new_orexin)
    content = content.replace("$$\\text{Orexin}_{\\text{target}} = \\max\\left(0, \\text{Orexin}_{\\text{base}} - 0.8 * \\text{Propofol}_{Ce} - 0.6 * \\text{Sevo}_{\\text{MAC}} - 0.6 * \\text{Iso}_{\\text{MAC}}\\right)$$", "")
    content = content.replace("$$\\text{Orexin}_{\\text{target}} = \\max\\left(0, \\text{Orexin}_{\\text{base}} - 0.8 \\cdot \\text{Propofol}_{Ce} - 0.6 \\cdot \\text{Sevo}_{\\text{MAC}} - 0.6 \\cdot \\text{Iso}_{\\text{MAC}}\\right)$$", "")

    # Sleep stage transition rules and post-op sleep debt & REM rebound
    old_receptor_binding = "##### 3. Receptor Binding & Memory Decay (Power-Law Model)"
    new_receptor_binding = ("##### 3. Receptor Binding & Memory Decay (Power-Law Model)\n"
                            "*   **Sleep Stage Transition Rules**: Transition probabilities between Wake ($W$), N1, N2, N3 (slow-wave sleep), and R (REM) are driven by the balance of sleep-promoting ($S_{\\text{drive}}$) and wake-promoting ($W_{\\text{drive}}$) inputs:\n"
                            "    $$\\text{Wake Drive } (W_{\\text{drive}}) = \\frac{LC + TMN + Orexin_{\\text{effective}}}{3}$$\n"
                            "    $$\\text{Sleep Drive } (S_{\\text{drive}}) = \\frac{VLPO + MnPO}{2}$$\n"
                            "    - Transition $W \\rightarrow N1$ occurs when $S_{\\text{drive}} > 0.6$ and $W_{\\text{drive}} < 0.4$.\n"
                            "    - Transition $N1 \\rightarrow N2$ occurs after $300\\text{ seconds}$ in $N1$ (vertex sharp waves resolve to sleep spindles and K-complexes).\n"
                            "    - Transition $N2 \\rightarrow N3$ occurs when homeostatic sleep pressure $H_{\\text{sleep}} > 0.7$, driving slow wave delta power ($\\delta$-power $> 1.5$).\n"
                            "    - Transition $N2 \\rightarrow R$ (REM Sleep) occurs when pontine REM-on pathways are disinhibited by low monoaminergic tone (low $LC$ and $TMN$):\n"
                            "      $$P_{\\text{REM-on}} = \\max(0, 1.0 - LC - TMN)$$\n"
                            "      REM sleep is characterized by marked chin electromyogram atonia ( Chin EMG $\\approx 0$), rapid ocular movements, and high heart rate and respiratory rate variability.\n"
                            "*   **Postoperative Sleep Disruption & REM Rebound**:\n"
                            "    - *Night 1*: High postoperative pain, localized tissue inflammation, and surgical stress (elevated cortisol/epinephrine) cause extreme sympathetic drive, suppressing N3 and REM sleep to $<10\\%$ of normal baseline.\n"
                            "    - *Night 2-4*: The accumulated sleep debt triggers a massive REM rebound:\n"
                            "      $$\\text{REM Rebound Drive } (R_{\\text{rebound}}) = 2.5 \\cdot \\text{sleepDebt}$$\n"
                            "      This leads to prolonged, high-intensity REM sleep episodes in the PACU or ward, predisposing the patient to severe upper airway muscle atonia.\n"
                            "*   **The VLPO-Lesion Paradox**: complete lesions of the VLPO severely fragment sleep but do not prevent general anesthesia, as volatile anesthetics directly suppress the AAS wake nuclei (TMN, LC) and bypass the preoptic flip-flop switch. However, VLPO lesions increase baseline sensitivity to Isoflurane due to pre-existing sleep debt.\n")
    content = content.replace(old_receptor_binding, new_receptor_binding)

    # 5. Update Medication Table
    old_med_table_row = ("| **Scopolamine** | Anticholinergic / Amnestic | $V_1: 15.00\\text{ L}$<br>$k_{10}: 0.04$<br>$ke_0: 0.5$ | $EC_{50}: 0.05\\text{ ng/mL}$<br>$\\gamma: 1.5$ | Muscarinic antagonist. Crosses blood-brain barrier. Induces profound anterograde amnesia. | Mild tachycardia, accelerates hippocampal theta frequency while decreasing power. |\n")
    new_med_table_row = (old_med_table_row +
                         "| **Suvorexant** | Dual Orexin Receptor Antagonist | $V_1: 15.00\\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 1.0$ | $EC_{50}: 2.0\\text{ ng/mL}$<br>$\\gamma: 1.5$ | Reversibly binds $OX_1R$/$OX_2R$, blocking orexinergic arousal and promoting sleep onset. | Daytime drowsiness, sleep paralysis. Contraindicated in narcolepsy. |\n"
                         "| **Solriamfetol** | Dopamine-Norepinephrine Reuptake Inhibitor | $V_1: 18.00\\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 1.2$ | $EC_{50}: 4.0\\text{ ng/mL}$<br>$\\gamma: 1.2$ | Selective DAT/NET inhibitor. Excites VTA/AAS, promoting wakefulness. | Mild tachycardia, hypertension, palpitations. |\n")
    content = content.replace(old_med_table_row, new_med_table_row)

    # 6. Update Section 6 with new crises loops
    old_sec_7 = "### 7. Attending Direct Chat, Advisor & NLP Engine"
    new_sec_6_additions = ("#### 6.11 Obstructive Sleep Apnea Collapse Crisis\n"
                           "*   **Trigger Conditions**: Sleep stage is REM (Stage R) or N3, or sedative concentrations (Propofol $C_e > 1.2$) reduce genioglossus muscle tone (`dilatorMuscleTone` $< 0.35$), causing pharyngeal collapse pressure to exceed airway pressure ($P_{\\text{crit}} > P_{\\text{airway}}$).\n"
                           "*   **Physiological Impact**: Upper airway resistance ($R$) escalates to $999\\text{ cmH2O/L/s}$ (complete physical obstruction). Alveolar ventilation ($V_A$) drops to $0.0\\text{ L/min}$. Arterial $PaCO_2$ rises rapidly ($+6\\text{ mmHg}$ in first minute, $+3\\text{ mmHg/min}$ thereafter). Oxygen saturation ($SpO_2$) desaturates exponentially. Heart rate climbs (tachycardia) due to sympathetic distress, followed by bradycardia if severe hypoxia occurs.\n"
                           "*   **Mitigation / Resolution**:\n"
                           "    1. *EEG Arousal*: Severe hypoxia ($SpO_2 < 85\\%$) or hypercapnia ($PaCO_2 > 50\\text{ mmHg}$) triggers cortical arousal, setting `sleepStage` to `'W'`, restoring `dilatorMuscleTone` to $1.0$, and opening the airway.\n"
                           "    2. *Positive Pressure Support*: Application of CPAP or BiPAP ($P_{\\text{airway}} > P_{\\text{crit}}$) splints the pharynx open, restoring patency.\n"
                           "    3. *Intubation*: Tracheal intubation physically secures the airway.\n"
                           "\n"
                           "#### 6.12 Cheyne-Stokes Respiration & Central Sleep Apnea\n"
                           "*   **Trigger Conditions**: Loop gain $LG > 1.0$, patient is in NREM sleep (N1/N2), and $PaCO_2$ drops below the apneic threshold ($PaCO_2 < \\text{apneicThresholdPaCO2}$).\n"
                           "*   **Physiological Impact**: Cyclic crescendo-decrescendo breathing patterns. Tidal volume oscillates from $0\\text{ mL}$ (central apnea) to $>700\\text{ mL}$ (hyperpnea). Heart rate and arterial pressure fluctuate in phase with ventilation. Causes periodic drops in $SpO_2$ and increases myocardial stress (Rate Pressure Product $RPP > 14,000$).\n"
                           "*   **Mitigation / Resolution**:\n"
                           "    1. *Supplemental Oxygen*: Elevating $FiO_2 > 40\\%$ increases $PaO_2$, reducing controller sensitivity ($G_{\\text{controller}}$) and lowering loop gain ($LG < 1.0$), stabilizing respiration.\n"
                           "    2. *Anesthetic Washout / Emergence*: Transitioning to wakefulness removes NREM-associated chemoreceptor delays.\n"
                           "    3. *CHF Optimization*: Improving cardiac output (increasing preload, inotrope administration) reduces circulatory delay ($t_{\\text{delay}}$) and mixing gain, lowering loop gain.\n"
                           "\n"
                           "#### 6.13 Obesity Hypoventilation Syndrome Loop\n"
                           "*   **Trigger Conditions**: Patient is obese ($BMI > 30$) and has chronic hypoventilation ($PaCO_2 \\ge 45\\text{ mmHg}$).\n"
                           "*   **Physiological Impact**: Shifts the $CO_2$ chemosensitivity curve rightward (blunts carbon dioxide drive). Baseline chronic respiratory acidosis ($pH < 7.35$) is compensated by metabolic bicarbonate retention ($HCO_3^- \\ge 28\\text{ mEq/L}$). When anesthetics (Propofol, volatiles) are administered, the patient experiences profound, prolonged apnea and rapid hypoxemia due to low baseline FRC oxygen reserves.\n"
                           "*   **Mitigation / Resolution**: Mechanical ventilation in PCV or VCV mode. Setting PEEP $\\ge 8\\text{ cmH2O}$ and recruitment maneuvers are required to splint open micro-atelectasis and optimize compliance.\n"
                           "\n"
                           "#### 6.14 Special SDB Anesthesia Bundle Checklist\n"
                           "To prevent airway collapse and respiratory failure in patients with sleep-disordered breathing, the clinician must execute the following checklist:\n"
                           "1.  *Pre-induction*: Sniffing position, ramped or Reverse Trendelenburg position (elevated by $25^{\\circ}-45^{\\circ}$).\n"
                           "2.  *Intubation*: Limit NMBAs; prefer short-acting Succinylcholine or intubate without NMBAs under deep anesthesia.\n"
                           "3.  *Ventilation*: Set pressure-controlled ventilation (PCV) with PEEP $\\ge 8\\text{ cmH2O}$ and perform recruitment maneuvers immediately after intubation.\n"
                           "4.  *Extubation*: Patient must be fully awake, cooperative, and reverse neuromuscular blockade to TOF ratio $>0.90$. Position the patient $45^{\\circ}$ head-up or in the lateral position in the PACU.\n"
                           "5.  *Discharge*: Perform the Room Air Challenge test. Confirm Aldrete Score $\\ge 8$, vital signs within $20\\%$ of baseline, pain score $\\le 40\\%$.\n"
                           "\n"
                           "### 7. Attending Direct Chat, Advisor & NLP Engine")
    content = content.replace(old_sec_7, new_sec_6_additions)

    # 7. Update Section 8.2 (Core Physiology Engine State Bridge Ref)
    old_bridge_vitals = "*   `vitals`: `Object` (Primary vital signs parameters updated by loops):"
    new_bridge_vitals = ("*   `vitals`: `Object` (Primary vital signs parameters updated by loops):\n"
                         "    *   `sleepStage`: `'W' | 'N1' | 'N2' | 'N3' | 'R'` (Active sleep stage)\n"
                         "    *   `sleepArousalThreshold`: `number` (Vigilance threshold for sensory arousal)\n"
                         "    *   `loopGain`: `number` (Respiratory feedback instability factor)\n"
                         "    *   `controllerGain`: `number` (Chemoreceptor sensitivity multiplier)\n"
                         "    *   `plantGain`: `number` (Lung CO2 excretion efficiency)\n"
                         "    *   `mixingGain`: `number` (Circulatory transport time delay)\n"
                         "    *   `dilatorMuscleTone`: `number` (Genioglossus muscle tone index)\n"
                         "    *   `pharyngealCollapseThreshold`: `number` ($P_{\\text{crit}}$, pharyngeal closing pressure)\n"
                         "    *   `sleepDebt`: `number` (Cumulative sleep deprivation hours)\n"
                         "    *   `postOpSleepNight`: `number` (Postoperative night count)\n"
                         "    *   `remReboundIntensity`: `number` (REM sleep pressure modifier)\n"
                         "    *   `suvorexantCe`: `number` (Suvorexant effect-site concentration)\n"
                         "    *   `solriamfetolCe`: `number` (Solriamfetol effect-site concentration)\n"
                         "    *   `ahi`: `number` (Apnea-Hypopnea Index events/hr)\n"
                         "    *   `rdi`: `number` (Respiratory Disturbance Index events/hr)\n"
                         "    *   `isCSRActive`: `boolean` (Active Cheyne-Stokes respiration flag)\n"
                         "    *   `isOHSActive`: `boolean` (Active Obesity Hypoventilation Syndrome flag)\n"
                         "    *   `apneicThresholdPaCO2`: `number` (PCO2 drive boundary condition)")
    content = content.replace(old_bridge_vitals, new_bridge_vitals)

    # 8. Update Section 10 (Constraints)
    old_constraints = "5.  **Unary Chelation Limitations**: Sugammadex chelation resolves muscle relaxant concentrations by scaling down A1 in a single step, rather than modeling binding affinity curves over time."
    new_constraints = (old_constraints + "\n"
                       "6.  **Sleep Stage Transition Modeling**: Sleep stage transitions are modeled on a 1-second interval grid. Fine-grained hypnogram features like micro-arousals (lasting $<3\\text{ seconds}$) are smoothed out, which may slightly underestimate transient airway collapses.\n"
                       "7.  **Loop Gain Numerical Stability**: High loop gain values ($LG > 2.5$) can introduce numerical resonance oscillations in the respiratory rate and tidal volume calculations during Euler integration. Solved by clamping maximum oscillations and smoothing ventilatory updates.\n")
    content = content.replace(old_constraints, new_constraints)

    # 9. Update Section 12 (Dependency Table)
    old_dependency_anchor = "| **Thermoregulation & Cooling Rates** | Hardcoded cooling constants ($0.0008^{\\circ}\\text{C/s}$ under volatile gas) and fluid cooling weights ($0.07$ and $0.05$) in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js#L1133-L1149). | None. | Thermodynamic parameters are hardcoded rates. The engine does not evaluate patient body surface area or ambient room temperature. |"
    new_dependency_addition = (old_dependency_anchor + "\n"
                               "| **Upper Airway Patency & Collapse** | Hardcoded Mallampati integer logic with static positioning/obesity offsets in [ProceduralEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/ProceduralEngine.ts#L24-L63). | None. | Grade view shifts are simplified integers ($+1, -2$), ignoring physiological distributions, anatomical variation, and dynamic laryngoscope force. |\n"
                               "| **Loop Gain & CSR Oscillations** | Static respiratory response curves in [RespiratoryEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RespiratoryEngine.ts). | None. | Loop gain components are not dynamically simulated. Cheyne-Stokes respiration is unmodeled, preventing the assessment of periodic hypoxemia under low cardiac output. |\n"
                               "| **Sleep Stage Hypnogram & REM Atonia** | Simplified sleep-wake nuclei states inside [ConsciousnessEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/ConsciousnessEngine.ts). | None. | Postoperative sleep stages are not tracked. The simulator cannot represent sleep debt accumulation, REM sleep rebound, or postoperative sleep apnea exacerbation. |")
    content = content.replace(old_dependency_anchor, new_dependency_addition)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 10 Sleep Medicine into goldenversion.md")

if __name__ == '__main__':
    update_golden_version()
