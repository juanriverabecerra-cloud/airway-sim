/**
 * CORE TYPES FOR AIRWAY-SIM SOURCE MATERIAL PARSER
 * 
 * These types define the data structures for parsing source material files.
 * All parsed data comes ONLY from the actual source file contents — never fabricated.
 */

/** Represents a single page or chunk extracted from a source file */
export interface SourceFragment {
  /** Unique identifier for this fragment, e.g. "PAGE_001" */
  id: string;
  /** The source file this fragment was extracted from */
  sourceFile: string;
  /** Page number (1-indexed), or chunk index for non-paginated files */
  pageNumber: number;
  /** The type of content detected in this fragment */
  contentType: 'text' | 'image-only' | 'mixed' | 'empty';
  /** The raw extracted text content (empty string if image-only) */
  rawText: string;
  /** Character count of extracted text */
  characterCount: number;
  /** Any structured data parsed from the raw text */
  parsedSections: ParsedSection[];
  /** Exact coordinates [x0, y0, x1, y1] of every word on the page */
  word_bounding_boxes?: Array<{
    text: string;
    bbox: [number, number, number, number];
  }>;
}

/** A section detected within extracted text */
export interface ParsedSection {
  /** Heading or label of this section (if detected) */
  heading: string;
  /** The body text of this section */
  body: string;
  /** Line number where this section starts in the raw text */
  startLine: number;
  /** Detected content category */
  category: 'heading' | 'paragraph' | 'list' | 'table' | 'equation' | 'reference' | 'unknown';
}

/** The final output document written to parsed texts/ */
export interface ParsedDocument {
  /** Metadata about the parsing operation */
  parse_metadata: {
    /** Original source file name */
    source_file: string;
    /** Full path to the source file */
    source_path: string;
    /** File size in bytes */
    file_size_bytes: number;
    /** File type detected */
    file_type: string;
    /** ISO timestamp of when parsing was performed */
    parsed_at: string;
    /** Parser version */
    parsed_at_version?: string; // Optional old version key compatibility
    parser_version: string;
    /** Total pages/chunks found */
    total_pages: number;
    /** Total characters of text extracted */
    total_characters_extracted: number;
    /** Whether the extraction was successful */
    extraction_success: boolean;
    /** Any warnings or errors encountered */
    warnings: string[];
    /** Text-quality metrics + flags computed by the parser (silent-failure gate). */
    quality?: {
      pages: number;
      total_characters: number;
      chars_per_page: number;
      empty_pages: number;
      low_text_pages: number;
      english_word_ratio: number;
      nonascii_pct: number;
      replacement_chars: number;
      run_together_pct: number;
      flags: string[];
      ok: boolean;
    };
  };
  /** Array of extracted fragments, one per page/chunk */
  fragments: SourceFragment[];
  /** Standard array block containing semantic representations of parsed graphics and figures */
  visual_data_engines: VisualDataEngine[];
  /** Raw full text concatenation of all fragments */
  full_extracted_text: string;
}

/** Represents a parsed semantic representation of a visual graphic on a page */
export interface VisualDataEngine {
  /** Unique ID for the figure, e.g., "FIG_09_01" or "FIG_PAGE001_1" */
  id: string;
  /** Source file name */
  sourceFile: string;
  /** Page number (1-indexed) where the graphic resides */
  pageNumber: number;
  /** Local file path where the cropped figure image is saved */
  image_path?: string;
  /** The closest preceding layout section heading or markdown header */
  closest_text_heading?: string;
  /** The archetype class of the graphic (optional in Phase 1, enriched in Phase 2) */
  archetype?: 'TIME-COURSE & PATHOPHYSIOLOGICAL TRENDS' 
            | 'SUBCELLULAR BIOCHEMICAL CASCADE DIAGRAMS' 
            | 'COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS' 
            | 'ANATOMICAL NETWORKS & MICROCIRCUIT MAPS' 
            | 'PHYSIOLOGICAL WAVEFORMS & TRACINGS'
            | 'CONTINUOUS_WAVEFORM'
            | 'TIMELINE_STEP_CHART_HYPNOGRAM';
  /** Textual label/caption of the graphic */
  caption: string;
  /** Key-value details tailored specifically to the graphic archetype (enriched in Phase 2) */
  details?: VisualDataDetails;
  /** Verbatim text bounding boxes detected inside this specific cropped image frame */
  text_bounding_boxes?: Array<{
    text: string;
    bbox: [number, number, number, number];
    confidence: number;
  }>;
}

/** Archetype 1: Time-Course & Pathophysiological Trends */
export interface Archetype1Data {
  time_domain_x_axis: {
    unit: string; // e.g. Minutes, Hours, Days, Weeks
    range?: string;
  };
  y_axis_polarity: {
    upper_hemisphere_label: string; // e.g. Injury/Destruction
    lower_hemisphere_label?: string; // e.g. Protection/Repair
  };
  curves: Array<{
    label_or_color: string;
    initiate_epoch: string;
    peak_or_trough_epoch: string;
    decay_duration: string;
  }>;
  molecular_markers: Array<{
    marker_name: string;
    curve_segment: string;
    time_window: string;
  }>;
  /** Required explicit temporal alignments */
  temporal_alignments: Array<{
    epoch: string;
    event_description: string;
    markers_active: string[];
  }>;
}

/** Archetype 2: Subcellular Biochemical Cascade Diagrams */
export interface Archetype2Data {
  /** Required explicit compartments list and boundaries */
  compartments: Array<{
    name: string; // e.g. "Presynaptic Neuron Terminal", "Astrocyte Foot", "Vascular Endothelium"
    type?: string;
    boundaries?: string[];
  }>;
  transmembrane_elements: Array<{
    name: string; // e.g. NMDAR, mGluR
    compartment_boundary: string;
    activity_type?: string; // e.g. Ion Channel, GPCR
  }>;
  internal_chemical_transactions: Array<{
    sequence_string: string; // [Substrate_A] -> [Enzyme/Catalyst] -> [Product_B]
    substrate: string;
    enzyme_or_catalyst?: string;
    product: string;
    compartment: string;
  }>;
  cross_compartment_pathways: Array<{
    source_compartment: string;
    target_compartment: string;
    signaling_molecule: string;
    action_or_receptor: string;
  }>;
  downstream_outputs: Array<{
    functional_output: string; // e.g. "Dilation", "Constriction"
    trigger_cascade: string;
  }>;
}

/** Archetype 3: Coordinate X-Y Graphs & Complementary Panels */
export interface Archetype3Data {
  panels: Array<{
    panel_id: string; // e.g. "A", "B", "C"
    axes: {
      x_axis: { label: string; unit: string };
      y_axis: { label: string; unit: string };
    };
    mathematical_nature: 'Inversely Linear' | 'Sigmoidal/Logarithmic Plateau' | 'Exponential Decay' | 'Linear' | 'Other';
    curves: Array<{
      legend_label: string;
      characteristic_nature: string;
    }>;
    /** Required explicit coordinate inflections */
    coordinate_inflections: Array<{
      x_threshold: string;
      y_value_or_change: string;
      inflection_description: string;
    }>;
  }>;
}

/** Archetype 4: Anatomical Networks & Microcircuit Maps */
export interface Archetype4Data {
  nodes: Record<string, {
    name: string;
    relational_variants?: string[];
    prevalence_percentage?: number;
    bbox?: [number, number, number, number];
  }>;
  /** Required explicit source target vectors */
  source_target_vectors: Array<{
    source: string; // node ID
    target: string; // node ID
    direction: 'Unidirectional' | 'Bidirectional' | 'Feed-forward loop';
    sign: 'Excitatory' | 'Inhibitory';
    neurotransmitter?: string; // e.g., Glutamatergic (+), GABAergic (-)
  }>;
}

/** Archetype 5: Physiological Waveforms & Tracings */
export interface Archetype5Data {
  channels: Array<{
    source_marker: string; // e.g. SaO2, Resp Flow, Thorax, Abdomen
    amplitude_range?: string;
  }>;
  transient_synchronous_events: Array<{
    time_window: string;
    flags_or_annotations: string[]; // e.g. ["CH", "OA"]
    morphology_pattern: string; // e.g. Crescendo-decrescendo modulation
    channel_relationships?: string; // e.g. Phase paradox
  }>;
}

/** Archetype 6: Continuous Waveform details (any modality — ECG, capnography, EEG, pleth, arterial line) */
export interface ContinuousWaveformDetails {
  channels: Array<{
    source_marker: string;
    amplitude_range?: string;
  }>;
  calibration_keys: string[];
  context_nodes: Array<{
    label: string;
    role: string;
  }>;
  labels: string[];
  /** Which physiological signal this tracing actually shows — distinguishes a CONTINUOUS_WAVEFORM archetype's content without multiplying archetype IDs */
  modality?: 'ecg' | 'capnography' | 'eeg' | 'pleth' | 'arterial_line' | 'other';
  /** Only populated (by Phase 2 vision enrichment) when modality === 'ecg' */
  ecg_findings?: {
    lead_shown?: string;
    named_rhythm?: string;
    rate_bpm?: string;
    pr_interval_ms?: string;
    qrs_duration_ms?: string;
    qt_interval_ms?: string;
    st_segment_finding?: string;
    t_wave_finding?: string;
    other_morphology?: string;
  };
  /** Only populated (by Phase 2 vision enrichment) when modality === 'capnography' */
  capnography_findings?: {
    named_pattern?: string;
    baseline_etco2_value?: string;
    plateau_etco2_value?: string;
    waveform_phase_described?: string;
  };
}

/** Archetype 7: Timeline Step Chart Hypnogram details */
export interface TimelineStepChartDetails {
  labels: string[];
  y_axis_stages: string[];
  x_axis_timestamps: string[];
}

/** Archetype 8: Clinical Tabular Matrix mapped details */
export interface ClinicalTableDetails {
  matrix_rows: string[][];
  markdown_representation: string;
  headers: string[];
  labels: string[];
}

/** Union type representing the possible visual details structures */
export type VisualDataDetails = 
  | Archetype1Data 
  | Archetype2Data 
  | Archetype3Data 
  | Archetype4Data 
  | Archetype5Data
  | ContinuousWaveformDetails
  | TimelineStepChartDetails
  | ClinicalTableDetails
  | Record<string, any>;


