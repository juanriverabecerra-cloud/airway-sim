import type { IArchetypeHandler } from './IArchetypeHandler.ts';
import type { VisualDataEngine } from '../../types/index.ts';
import { L2S_CONFIG } from '../../config/archetypes.ts';

export class ContinuousWaveformHandler implements IArchetypeHandler {

  public supports(engine: VisualDataEngine): boolean {
    const textToMatch = `${engine.caption} ${engine.id}`.toLowerCase();
    const config = L2S_CONFIG.archetypes.CONTINUOUS_WAVEFORM;
    
    const matchKeyword = config.keywords.some(kw => textToMatch.includes(kw));
    const matchArchetype = engine.archetype === config.id;
    return matchKeyword || matchArchetype;
  }

  public async handle(engine: VisualDataEngine): Promise<VisualDataEngine> {
    const text_bounding_boxes = engine.text_bounding_boxes || [];
    
    const channels: string[] = [];
    const calibration_markers: string[] = [];
    const other_labels: string[] = [];

    // Detect channel descriptors, timescale keys, and calibration markers programmatically
    // Guard against malformed or missing text properties to avoid runtime exceptions
    for (const box of text_bounding_boxes) {
      if (!box || typeof box.text !== 'string') continue;
      const text = box.text.replace(" [uncertain]", "").trim();
      
      // Match common channel patterns like "EEG (C3-A1)", "EEG (C4-A1)", "EEG (C2-A1)" or containing "EEG" / "ECG"
      if (/^e{1,2}g\s*\(.+\)/i.test(text) || text.toLowerCase().includes("activity")) {
        channels.push(text);
      } 
      // Match timescale keys or calibration markers (e.g., "1 sec.", "1s", "50 uV")
      else if (/\b\d+\s*(sec|s|uV|mV)\b/i.test(text)) {
        calibration_markers.push(text);
      } else if (text.length > 0) {
        other_labels.push(text);
      }
    }

    const details = {
      channels: channels.map(ch => ({
        source_marker: ch,
        amplitude_range: ch.toLowerCase().includes("beta") ? "Low amplitude (10-20 uV)" : "Mixed amplitude"
      })),
      calibration_keys: calibration_markers,
      context_nodes: other_labels.map(lbl => ({
        label: lbl,
        role: lbl.toLowerCase().includes("onset") ? "Event annotation" : "Signal context"
      })),
      labels: text_bounding_boxes
        .filter(box => box && typeof box.text === 'string')
        .map(box => box.text.replace(" [uncertain]", "").trim())
    };

    return {
      ...engine,
      archetype: L2S_CONFIG.archetypes.CONTINUOUS_WAVEFORM.id,
      details
    };
  }
}
