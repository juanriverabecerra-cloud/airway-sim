/**
 * Individual entry for unicode glyph/string recovery
 */
export interface GlyphRecoveryEntry {
  readonly target: string;
  readonly replacement: string;
}

/**
 * Configuration schema for visual archetype parser routing
 */
export interface ArchetypeConfigEntry {
  readonly id: 'TIME-COURSE & PATHOPHYSIOLOGICAL TRENDS' 
             | 'SUBCELLULAR BIOCHEMICAL CASCADE DIAGRAMS' 
             | 'COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS' 
             | 'ANATOMICAL NETWORKS & MICROCIRCUIT MAPS' 
             | 'PHYSIOLOGICAL WAVEFORMS & TRACINGS'
             | 'CONTINUOUS_WAVEFORM_EEG'
             | 'TIMELINE_STEP_CHART_HYPNOGRAM';
  readonly keywords: readonly string[];
}

/**
 * Root Layout-to-Simulation configuration shape
 */
export interface L2SConfig {
  readonly confidenceThreshold: number;
  readonly verticalOverlapThreshold: number;
  readonly horizontalGapMultiplier: number;
  readonly glyphRecoveryMap: readonly GlyphRecoveryEntry[];
  readonly archetypes: {
    readonly NETWORK_MAPS: ArchetypeConfigEntry;
    readonly CONTINUOUS_WAVEFORM: ArchetypeConfigEntry;
    readonly TIMELINE_STEP_CHART: ArchetypeConfigEntry;
    readonly CLINICAL_TABLES: ArchetypeConfigEntry;
  };
}

/**
 * Global Configuration for L2S (Layout-to-Simulation) pipeline.
 * Contains thresholds, keywords, and unicode recovery dictionaries.
 */
export const L2S_CONFIG: L2SConfig = {
  // Gating thresholds
  confidenceThreshold: 80, // Minimum confidence score to preserve OCR text tokens (0-100)

  // Bounding box clustering thresholds
  verticalOverlapThreshold: 0.8, // Overlap ratio (80%)
  horizontalGapMultiplier: 1.2, // Gap must be < 1.2 * font_height

  // Unicode / Glyph recovery lookup dictionary
  glyphRecoveryMap: [
    {
      target: ", a, and",
      replacement: "beta, alpha, and theta"
    },
    {
      target: "of , a, and",
      replacement: "of beta, alpha, and theta"
    },
    {
      target: "of β, α, and θ",
      replacement: "of beta, alpha, and theta"
    },
    {
      target: "β, α, and θ",
      replacement: "beta, alpha, and theta"
    },
    {
      target: "EEG power of , a, and",
      replacement: "EEG power of beta, alpha, and theta"
    }
  ],

  // Archetype routing keywords
  archetypes: {
    NETWORK_MAPS: {
      id: "ANATOMICAL NETWORKS & MICROCIRCUIT MAPS",
      keywords: ["diagram", "circuit", "network", "pathway", "cascade", "loop", "flowchart", "map", "ascending arousal system"]
    },
    CONTINUOUS_WAVEFORM: {
      id: "CONTINUOUS_WAVEFORM_EEG",
      keywords: ["recording", "eeg", "ecg", "waveform", "signal", "tracing", "lead", "wave"]
    },
    TIMELINE_STEP_CHART: {
      id: "TIMELINE_STEP_CHART_HYPNOGRAM",
      keywords: ["hypnogram", "timeline", "stage", "sleep cycle", "repetition"]
    },
    CLINICAL_TABLES: {
      id: "COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS",
      keywords: ["table", "dosing", "affinity", "grid", "matrix"]
    }
  }
} as const;

