# §22 — Preloaded Attending Consults & Interactive Pharmacopoeia UI Integration (Cross-Cutting)

> Chapter ledger entry. Integrates preloaded, textbook-grounded clinical consults for all medications, volatile gases, and resuscitation fluids in the simulator, exposing them via interactive, clickable UI descriptors and a premium floating study card.

**Content classification.** Bucket B (Clinical teaching consult briefs, interactive pharmacology and fluid therapy guidance) + UI/UX enhancements. Cross-cutting phase of care — affects pre-operative review, intraoperative maintenance, and emergence.

---

### 22.1 Preloaded Consults Database (`src/engine/config/preloadedConsults.ts`)

New engine configuration file. Attending consults previously required running the large-language-model chat engine or local vector search. Added:
- **Hand-Crafted Textbook Profiles**: Preloaded, highly detailed clinical briefs for primary agents:
  - *Intravenous Medications*: Propofol, Etomidate, Ketamine, Dexmedetomidine, Midazolam, Fentanyl, Morphine, Remifentanil, Succinylcholine, Rocuronium, Vecuronium, Sugammadex, Neostigmine, Epinephrine, Ephedrine, Phenylephrine, Esmolol, Atropine, Glycopyrrolate, Lidocaine, Bupivacaine, Dantrolene.
  - *Inhalational Volatiles*: Sevoflurane, Isoflurane, Desflurane, Nitrous Oxide (\(N_2O\)).
  - *Resuscitation Fluids*: Normal Saline (0.9% NS), Lactated Ringer's (LR), Packed Red Blood Cells (PRBC), Fresh Frozen Plasma (FFP).
- **Resolver & Alias Mapper (`getPreloadedConsult`)**: Case-insensitively resolves names, matching common abbreviations (e.g. `ns` -> Normal Saline, `ffp` -> Fresh Frozen Plasma, `prbc` -> Packed Red Blood Cells) and balanced crystalloid fallbacks.
- **High-Fidelity Dynamic Fallback Generator (`generateDynamicConsult`)**: Reads live metadata (`targetReceptor`, `intracellularCascade`, `metabolism`, `notes`, `dosingWeight`, `indications`) from `MEDICATIONS` and compiles a structured consult for any secondary/tertiary agents (e.g. furosemide), ensuring 100% database coverage.
- **Formatted Delimiters**: Splits consults into `=== CLINICAL SUMMARY ===` and `=== DETAILED CONSULTATION ===` sections to match the Attending chat split-pane format.

---

### 22.2 Floating UI Card Component (`src/components/modals/DrugConsultModal.jsx`)

New component. Houses the detailed pharmacology information when a descriptor is clicked:
- **Glassmorphic Aesthetics**: Sleek dark slate layout (`bg-slate-950/95`) with customized outer glow shadows and border colors that match the drug's therapeutic class (e.g., cyan for volatiles, red for blood products, yellow for sedatives, emerald for paralytics, purple for vasopressors).
- **Snapshot and Teaching split**: Renders the brief `Clinical Summary` and hosts a collapsible drawer containing the full `Comprehensive Teaching Consult` section.
- **Nested Clinical Action Integration**: Parses the text using `parseAndRenderText` from `ClinicalActions.jsx` so that any bracketed drugs or actions (e.g. administering a reversal agent mentioned in the text) remain instantly clickable.
- **Quick Lookup Dropdown**: Displays a searchable list of all 173 medications, volatiles, and fluids in the simulator so the user can quickly switch the active view to study other compounds without exiting the modal.

---

### 22.3 Clickable UI Descriptors

- **Pharmacopoeia Panel (`src/components/controls/Pharmacopoeia.jsx`)**:
  - Destructured the `openDrugConsult` callback.
  - Wrapped drug class labels (`med.classes[0]`) and fluid types (`fluid.type`) with dashed underlines, interactive hover states, tooltips, and click event handlers.
  - Implemented `e.stopPropagation()` on the descriptor so that clicking the label triggers the consult modal *without* selecting the accordion or altering the active syringe dosing state.
- **Monitor Strip (`src/components/controls/BottomBar.jsx`)**:
  - Destructured the `openDrugConsult` callback.
  - Made the active volatile agent name (`SEV`, `DES`, `ISO`, etc.) in the gas status block clickable with hover-state underlines and tooltips to query the inhalational agent consults.

---

### 22.4 App Integration & Pausing Logic (`src/App.jsx`)

- Declared the `drugConsultModal` state and `openDrugConsult(id)` callback.
- Wired the callback to `Pharmacopoeia` and `BottomBar` renders.
- Modified the simulation pause check: **opening the drug consult modal pauses the simulation and NIBP cycle**, allowing the user to study the drug's mechanisms and dosing in peace without risking patient status deterioration in the background.

---

### 22.5 Verification & Build Quality

- **Automated Unit Tests (`src/testing/drug_consults.test.ts`)**:
  - Created a dedicated unit test suite exercising precise textbook profile lookups, case-insensitivity, alias resolution, dynamic fallback compilation, and generic fallback templates.
  - Tested successfully: **1,721 / 1,721 total tests passing**.
- **Build Cleanliness**:
  - Verified production compilation via Vite: `built in 1.46s` with zero errors.

---

### 22.6 Receptor Body Map Graphical Upgrade (`src/components/ReceptorBodyPanel.jsx`)

Redesigned the interactive SVG human silhouette, organs, and labels to deliver an immersive, futuristic **"Iron Man HUD" clinical hologram** layout:
- **Unified Humanoid Silhouette Contour & Medical Blueprint**:
  - Replaced the mannequin outline with a highly detailed humanoid path containing distinct fingers, toes, and organic neck-to-shoulder transitions.
  - Added low-contrast blue blueprint lines depicting clavicles (collarbones), pectorals, arm muscle contours, leg quadricep contours, and kneecaps.
- **Holographic Scan Grid & Target Reticles**:
  - Placed a low-contrast cyan grid (`#0891b2` with `opacity="0.07"`) behind the body silhouette.
  - Added concentric dotted scanning target circles and crosshair coordinates around key organs (brain center at `160,45`, heart center at `182,128`, and the four NMJ nodes).
- **Anatomical Organ Blueprint**:
  - *Brain*: Detailed cerebral hemispheres with central sagittal fissure and horizontal cerebral folds/sulci.
  - *Lungs*: Bilateral crescent lung outlines containing detailed branching bronchial lines connected to a central trachea tube.
  - *Heart*: Detailed cardiac outline with ventricle curves and an internal "HEART" label.
  - *GI*: Stomach leading to loops of large/small intestines.
  - *Spine*: Instrumented side-bar spinal column (placed at `x = 224`) featuring ribbed transverse segments and vertebrae indicators outside the torso silhouette to maintain a clean midline layout.
  - *NMJ*: Concentric scanning target rings centering on hands (`55,310`, `265,310`) and knees (`118,415`, `202,415`).
- **Anatomical Vascular Flow & Groin Bifurcation**:
  - Extended the central descending aorta down to `y = 265` and the inferior vena cava down to `y = 270`, connecting them directly to the common iliac vascular bifurcations inside the pelvis (above the crotch).
  - Connected the left and right subclavian arm arteries and veins directly to the mediastinal aorta arch and superior vena cava (SVC), utilizing precise **cubic Bezier curves** (`C` segments) to ensure vascular lines flow correctly through the chest-shoulder junction and remain completely inside the arm contours without spilling under the armpits.
- **Legible Margins & HUD Callouts**:
  - Pushed all text labels off the patient's body to the margins (left: `x <= 40` for CNS, lungs, arterial, GI, and NMJ; right: `x >= 280` for heart, venous, and spine).
  - Linked labels to their respective organ hit zones using diagonal glowing HUD leader lines.
  - Placed a **dynamic horizontal progress bar** and **active occupancy percentage** next to each label. The bars fill and glow dynamically in real time mapped to the dominant receptor state of the compartment (agonist = cyan/green, blocked = red, mixed = amber).
- **Interactive Callout Hovers & Highlights**:
  - Bound solid, transparent SVG `<rect>` overlays using `fill="rgba(0,0,0,0)"` behind label words to trigger organ highlighting and detail tooltips on hover.
  - Configured internal hits (`hit()`) to use `rgba(0,0,0,0)` to ensure robust event dispatching across all browsers.
- **Enlarged High-Legibility Typography**:
  - Increased default panel width state from `215px` to `235px` to provide ample breathing room.
  - Scaled up legend strip labels from `10px` to `12px` and footer message from `10.5px` to `13px`.
  - Scaled up autonomic tone header details (`10px` -> `12px`), dominant status text (`9px` -> `11px`), drug names (`10.5px` -> `12.5px` with wider fixed width of `80px`), and conflict details for maximum readability.
- **Cohesive Organ Glows**:
  - Modified region overlays to utilize the exact organ paths (rather than generic rectangles) so that hovering over or administering drugs activates beautiful, organ-conforming glows.


