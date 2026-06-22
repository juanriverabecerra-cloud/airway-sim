# Data Ingestion & Indexing Pipeline Reference (§9)

> Part of the `goldenversion.md` ground-truth set. Relocated here because this content is
> about `src/knowledge/` — which every chapter-integration session is explicitly instructed
> NOT to touch — so a typical chapter session never needs to read this file at all. Kept
> only for the rare session that does touch the ingestion pipeline itself. Section
> numbering preserved.

### 9. Data Ingestion & Indexing Pipeline

The simulator parses clinical textbooks into runtime rules and profiles during boot, using three indexers:

```
[ Ingested medical_truth.db ]
            |
            +---> (Cache Hydration on Worker Thread) ---> [ ClientDbBridge Cache ]
                                                                   |
            +------------------------------------------------------+
            |                                                      |
            v                                                      v
[ DynamicMedicationRegistry ]                               [ extractTextbookRules() ]
  - Parses JSON structured_payload matrices                   - Extracts prose sentences
  - Reads Markdown tables via regex                           - Matches vitals & conditions
  - Hydrates static & dynamic medications                     - Hydrates active rule offsets
```

#### 9.1 The Ingestion Engine & Cache Hydration
1.  **Binary Asset Loading**: `ClientDbBridge.ts` fetches `/medical_truth.db` from the client-facing storage layer.
2.  **Worker Transfer**: The buffer is transferred to `ClientDbBridge.worker.ts`. The worker initializes `sql.js`, loads the buffer, and runs initial queries to extract all prose and matrix records.
3.  **Caches Hydration**: Cached in `ClientDbBridge.allProse` and `ClientDbBridge.allMatrices`.
4.  **Priority Sorting**: Sorted by `comparePriority()`. Miller's Anesthesia takes priority:
    $$\text{Rank}_{\text{Miller}} = 1000 + \text{Edition} \quad \text{Rank}_{\text{Other}} = 100 + \text{Edition}$$
5.  `ClientDbBridge.onLoaded` fires, initiating the dynamic registries.

#### 9.2 Dynamic Medication Ingestion (`DynamicMedicationRegistry.ts`)
1.  **Matrix Table Scanner**: Scans `physiologicalMatrices` records with `is_authoritative === 1` that contain keywords like `pharmacokinetics` or `dosing`.
2.  **Prose Markdown Scanner**: Scans `textbookProse` records with `is_authoritative === 1` and parses markdown tables (`|`) using regex to extract drug rows.
3.  **Profile Builder**: Builds `MedicationProfile` objects. If any parameter is missing, it fills it in using average templates for classes.
4.  **Pharmacopoeia Hydration**: Pushes the profiles to `Pharmacology.MEDICATIONS` and `meds.config.MEDICATIONS_CONFIG`, updating the UI and drug engines.

#### 9.3 Dynamic Procedural Ingestion (`DynamicProceduralRegistry.ts`)
1.  **Numbered Step Extraction**: Scans `textbookProse` for paragraphs containing numbered procedural steps under headings like `intubation`, `rsi`, or `awake`.
2.  **Timeline Step Chart Ingestion**: Scans `physiologicalMatrices` for `TIMELINE_STEP_CHART_HYPNOGRAM` archetypes.
3.  **Programmatic Constraint Binding**: Translates steps into programmatic validation gates based on vocabulary mapping (e.g. `topicalize` $\to$ `isTopicalized = true`).
4.  **Procedural Gates**: When a user attempts a procedure, `validateState(pathwayKey, patientState)` is called, which evaluates the patient's current state fields.

#### 9.4 Dynamic Textbook Rule Indexer (`oracle_query.ts`)
1.  **Sentence Splitting**: Scans all `textbookProse` records and splits the text into sentences.
2.  **Verb Filtering**: Filters for sentences containing physiological verbs of change.
3.  **Target Vitals Matching**: Identifies target vital signs and matching conditions (drug name, position, or pathology).
4.  **Operator & Value Extraction**: Extracts operators (`+`, `-`, `scale`, `clamp`) and values using regex patterns.
5.  **Proximity Constraint**: Enforces that the vital keyword must be within 50 characters of the parsed value.
6.  **Physiological Plausibility Check**: Asserts physiological plausibility bounds to discard erratic values.
7.  **Hydration**: Hydrates a cached array of rules which `usePhysiology.js` runs every second to inject dynamic offsets.

#### 9.5 Source PDF → Chapter JSON: Figure/Visual Extraction Pipeline

Upstream of everything in 9.1-9.4 above: this is how a raw chapter PDF in
`src/airway_ingest/source_material/` becomes the `src/parsed texts/Millers_..._Chapter_<N>.json`
files those sections consume. Entry point: `npm run ingest-pdf -- <path> [--force]`, which
runs `src/knowledge/orchestrator.ts`. Two phases:

- **Phase 1 (always runs, fully offline)** — `TextExtractor.extractLocal()` shells out to
  `src/knowledge/extractor/local_parser.py` (PyMuPDF). For each page, it crops every
  figure referenced by a `Fig.`/`Figure` caption into its own PNG (saved to
  `scratch/extracted_images/`, git-tracked) via one of two strategies: an embedded-raster
  branch (greedy nearest-neighbor matching of captions to embedded image XObjects, one
  image claimed per caption — see 2026-06 fix note below) or a vector-drawing branch (for
  diagrams drawn as PDF vector paths rather than embedded bitmaps). Every cropped figure
  gets an initial archetype guess by caption keyword, then `StrategyRouter.ts` (always
  runs immediately after Phase 1, still offline) re-classifies each figure into one of four
  archetypes via `src/knowledge/parsers/handlers/*.ts` — `ContinuousWaveformHandler.ts`
  owns any continuous tracing (ECG, capnography, EEG, pleth, arterial line) and also tags
  a `details.modality` sub-field so those signal types stay distinguishable downstream.
- **Phase 2 (on by default — set `RUN_VISION=false` to skip)** — `TextExtractor.enrichVisuals()`
  sends each cropped figure's actual pixels to a vision model (`multimodal_extract.py`,
  Gemini by default, requires `GEMINI_API_KEY` in `.env`; an Ollama-local fallback exists
  but needs Ollama installed separately) for genuine semantic reading — named structural
  facts (channels, calibration marks, morphology) for any tracing, plus `ecg_findings`/
  `capnography_findings` (named rhythm/pattern, rate, intervals, ST/T findings) specifically
  for ECG/capnography content. Any per-figure failure (missing crop, empty response, API
  error) degrades gracefully to Phase-1-only data for that figure and is recorded in the
  final JSON's `parse_metadata.warnings` — check there after a chapter ingestion, not just
  the console log.

**2026-06 fix note.** Three bugs were found and fixed ahead of Chapter 36 (heavy ECG/
capnography content) and validated by direct visual inspection of the regenerated crops,
not just by reading code:
1. The embedded-raster branch matched each caption to its nearest image *independently*,
   so two captions close together on a page could both claim the same image, silently
   discarding the actual content of one of them. Fixed with a page-level greedy
   bipartite assignment (closest caption-image pairing wins first; each image claimed
   once) in `local_parser.py`.
2. The vector-drawing branch's border/rule-line filter (reject wide-or-thin paths) also
   rejected genuine waveform traces, which are geometrically wide-and-thin too. Fixed by
   requiring both wide/tall-extent *and* structural simplicity (path item count) before
   excluding a path.
3. Every continuous-waveform figure — ECG, capnography, EEG, pleth, arterial line — used
   to collapse into one literal archetype string, `CONTINUOUS_WAVEFORM_EEG`, via an
   overly broad keyword list (bare `"lead"`/`"wave"` substring-matched ordinary prose).
   Replaced with a modality-neutral `CONTINUOUS_WAVEFORM` archetype plus the
   `details.modality` field described above, and a tightened keyword list.

**Known gap, not yet addressed:** chapters ingested before this fix (everything except
Ch36) may carry the same crop-collision or archetype-collapse defects in their committed
JSON/images — confirmed true for at least two other spot-checked chapters during
validation (both turned out to be clear improvements when re-parsed, not regressions).
These were deliberately left untouched rather than bulk-reprocessed. If a future
chapter-integration session finds a `CONTINUOUS_WAVEFORM_EEG` (old name) or a
suspiciously generic/empty `details` on a figure that matters for that session's content,
that chapter likely needs re-ingesting (`npm run ingest-pdf -- <path> --force`) — treat it
as a real possibility, not a one-off.
