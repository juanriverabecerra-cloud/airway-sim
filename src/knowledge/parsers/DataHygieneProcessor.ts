import { L2S_CONFIG } from '../config/archetypes.ts';
import type { SourceFragment, VisualDataEngine } from '../types/index.ts';

export class DataHygieneProcessor {

  /**
   * Process and sanitize all fragments and visual engines.
   */
  public sanitize(fragments: SourceFragment[], visualEngines: VisualDataEngine[]): { fragments: SourceFragment[], visualEngines: VisualDataEngine[] } {
    // 1. Sanitize text fragments
    const sanitizedFragments = fragments.map(frag => {
      let rawText = this.recoverGlyphs(frag.rawText);
      
      const parsedSections = (frag.parsedSections || []).map(sec => ({
        ...sec,
        heading: this.recoverGlyphs(sec.heading || ''),
        body: this.recoverGlyphs(sec.body || '')
      }));

      // Apply confidence gating to page-level word bounding boxes if present
      let word_bounding_boxes = frag.word_bounding_boxes;
      // Note: page-level get_text("words") doesn't always have confidence, but if they do:
      if (word_bounding_boxes) {
        word_bounding_boxes = word_bounding_boxes
          .filter(w => w && typeof w.text === 'string')
          .map(w => ({
            ...w,
            text: this.recoverGlyphs(w.text)
          }));
      }

      return {
        ...frag,
        rawText,
        parsedSections,
        word_bounding_boxes
      };
    });

    // 2. Sanitize visual data engines
    const sanitizedEngines = visualEngines.map(engine => {
      const caption = this.recoverGlyphs(engine.caption || '');
      const closest_text_heading = this.recoverGlyphs(engine.closest_text_heading || '');

      // Apply Confidence Gating & Horizontal Token Merging to crop-level text bounding boxes
      // Filter out low-confidence, null, or malformed entries first
      let text_bounding_boxes = (engine.text_bounding_boxes || [])
        .filter(box => box && typeof box.confidence === 'number' && typeof box.text === 'string');

      // A. Confidence Gating: drop low confidence (< 80%) tokens to eliminate noise
      text_bounding_boxes = text_bounding_boxes.filter(
        box => box.confidence >= L2S_CONFIG.confidenceThreshold
      );

      // B. Unicode recovery on the individual bounding boxes
      text_bounding_boxes = text_bounding_boxes.map(box => ({
        ...box,
        text: this.recoverGlyphs(box.text)
      }));

      // C. Proximity Clusterer & Horizontal Token Merging
      text_bounding_boxes = this.mergeBoundingBoxes(text_bounding_boxes);

      return {
        ...engine,
        caption,
        closest_text_heading,
        text_bounding_boxes
      };
    });

    return {
      fragments: sanitizedFragments,
      visualEngines: sanitizedEngines
    };
  }

  /**
   * Unicode/Glyph Recovery Dictionary: Automatically repairs missing/dropped Greek symbols based on context mappers.
   */
  public recoverGlyphs(text: string): string {
    if (!text) return '';
    let healed = text;
    for (const rule of L2S_CONFIG.glyphRecoveryMap) {
      // Direct replacement first
      healed = healed.split(rule.target).join(rule.replacement);
      
      // Case insensitive replacement if needed
      const escapedTarget = rule.target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedTarget, 'gi');
      healed = healed.replace(regex, rule.replacement);
    }
    return healed;
  }

  /**
   * Horizontal Proximity Clusterer and Bounding Box Merging.
   * Merges boxes if vertical overlap is > 80% and horizontal gap is < 1.2 * font_height.
   */
  private mergeBoundingBoxes(boxes: Array<{ text: string, bbox: [number, number, number, number], confidence: number }>): Array<{ text: string, bbox: [number, number, number, number], confidence: number }> {
    if (boxes.length <= 1) return boxes;

    // Sort primarily by vertical top (y0), then horizontal left (x0)
    // Filter out boxes with missing or invalid spatial coordinate arrays to prevent NaN comparisons
    let sorted = [...boxes]
      .filter(box => box && box.bbox && box.bbox.length === 4 && box.bbox.every(c => typeof c === 'number' && !isNaN(c)))
      .sort((a, b) => {
        if (Math.abs(a.bbox[1] - b.bbox[1]) < 8) {
          return a.bbox[0] - b.bbox[0];
        }
        return a.bbox[1] - b.bbox[1];
      });

    let merged: Array<{ text: string, bbox: [number, number, number, number], confidence: number }> = [];
    if (sorted.length === 0) return merged; // Crash guard for empty sorted list
    
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      let next = sorted[i];

      // Calculate vertical overlap
      const y0_A = current.bbox[1];
      const y1_A = current.bbox[3];
      const h_A = y1_A - y0_A;

      const y0_B = next.bbox[1];
      const y1_B = next.bbox[3];
      const h_B = y1_B - y0_B;

      const overlap_y = Math.max(0, Math.min(y1_A, y1_B) - Math.max(y0_A, y0_B));
      const min_h = Math.min(h_A, h_B);
      const overlap_ratio = min_h > 0 ? overlap_y / min_h : 0;

      // Calculate horizontal gap
      const x1_A = current.bbox[2];
      const x0_B = next.bbox[0];
      const gap_x = x0_B - x1_A;

      const font_height = min_h;
      const max_gap = font_height * L2S_CONFIG.horizontalGapMultiplier;

      // Merge if vertically overlapping by > 80% and horizontal gap < 1.2 * font_height
      if (overlap_ratio >= L2S_CONFIG.verticalOverlapThreshold && gap_x <= max_gap) {
        current = {
          text: current.text + ' ' + next.text,
          bbox: [
            Math.min(current.bbox[0], next.bbox[0]),
            Math.min(current.bbox[1], next.bbox[1]),
            Math.max(current.bbox[2], next.bbox[2]),
            Math.max(current.bbox[3], next.bbox[3])
          ],
          confidence: Math.round((current.confidence + next.confidence) / 2)
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    return merged;
  }
}
