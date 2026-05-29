import type { IArchetypeHandler } from './IArchetypeHandler.ts';
import type { VisualDataEngine } from '../../types/index.ts';
import { L2S_CONFIG } from '../../config/archetypes.ts';

export class ClinicalTablesHandler implements IArchetypeHandler {

  public supports(engine: VisualDataEngine): boolean {
    const textToMatch = `${engine.caption} ${engine.id}`.toLowerCase();
    const config = L2S_CONFIG.archetypes.CLINICAL_TABLES;
    
    const matchKeyword = config.keywords.some(kw => textToMatch.includes(kw));
    const matchArchetype = engine.archetype === config.id;
    return matchKeyword || matchArchetype;
  }

  public async handle(engine: VisualDataEngine): Promise<VisualDataEngine> {
    const text_bounding_boxes = engine.text_bounding_boxes || [];
    
    // Structure physical row/column intersections from spatial coordinates
    // Group boxes that are horizontally adjacent as cells, and vertically grouped as rows
    const threshold_y = 15; // Vertical distance to group as a row
    
    // Sort boxes primarily by vertical top (y0), then horizontal left (x0)
    const sorted = [...text_bounding_boxes].sort((a, b) => {
      if (Math.abs(a.bbox[1] - b.bbox[1]) < threshold_y) {
        return a.bbox[0] - b.bbox[0];
      }
      return a.bbox[1] - b.bbox[1];
    });

    const rows: Array<string[]> = [];
    let currentRow: string[] = [];
    let current_y = sorted.length > 0 ? sorted[0].bbox[1] : 0;

    for (const box of sorted) {
      const text = box.text.replace(" [uncertain]", "").trim();
      if (!text) continue;

      if (Math.abs(box.bbox[1] - current_y) < threshold_y) {
        currentRow.push(text);
      } else {
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [text];
        current_y = box.bbox[1];
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    // Convert to markdown table format for final schema representation
    let markdownTable = "";
    if (rows.length > 0) {
      const headers = rows[0];
      markdownTable += "| " + headers.join(" | ") + " |\n";
      markdownTable += "| " + headers.map(() => "---").join(" | ") + " |\n";
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Pad row to match header length if needed
        const paddedRow = [...row];
        while (paddedRow.length < headers.length) paddedRow.push("");
        markdownTable += "| " + paddedRow.slice(0, headers.length).join(" | ") + " |\n";
      }
    }

    const details = {
      matrix_rows: rows,
      markdown_representation: markdownTable,
      headers: rows.length > 0 ? rows[0] : [],
      labels: text_bounding_boxes.map(box => box.text.replace(" [uncertain]", "").trim())
    };

    return {
      ...engine,
      archetype: L2S_CONFIG.archetypes.CLINICAL_TABLES.id as any,
      details
    };
  }
}
