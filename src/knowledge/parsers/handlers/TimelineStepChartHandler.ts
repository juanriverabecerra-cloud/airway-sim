import type { IArchetypeHandler } from './IArchetypeHandler.ts';
import type { VisualDataEngine } from '../../types/index.ts';
import { L2S_CONFIG } from '../../config/archetypes.ts';

export class TimelineStepChartHandler implements IArchetypeHandler {

  public supports(engine: VisualDataEngine): boolean {
    const textToMatch = `${engine.caption} ${engine.id}`.toLowerCase();
    const config = L2S_CONFIG.archetypes.TIMELINE_STEP_CHART;
    
    const matchKeyword = config.keywords.some(kw => textToMatch.includes(kw));
    const matchArchetype = engine.archetype === config.id;
    return matchKeyword || matchArchetype;
  }

  public async handle(engine: VisualDataEngine): Promise<VisualDataEngine> {
    const text_bounding_boxes = engine.text_bounding_boxes || [];
    
    const x_axis_timestamps: string[] = [];
    const y_axis_stages: string[] = [];
    const literal_labels: string[] = [];

    // Separate text boxes into X-axis (timestamps) vs Y-axis (stages) based on layouts/patterns
    for (const box of text_bounding_boxes) {
      const text = box.text.replace(" [uncertain]", "").trim();
      if (!text) continue;
      
      literal_labels.push(text);

      // X-axis timestamps: e.g. "10pm", "11pm", "12pm", "01am", "02am", "03am", "04am", "05am", "06am", "10 pm" etc.
      if (/^(?:\d{1,2}\s*(?:pm|am|pm\s*—|am\s*—))$/i.test(text) || text.includes("pm") || text.includes("am")) {
        // Clean trailing symbols
        const cleanTime = text.replace(/[^0-9a-zA-Z]/g, '').trim();
        if (cleanTime && !x_axis_timestamps.includes(cleanTime)) {
          x_axis_timestamps.push(cleanTime);
        }
      } 
      // Y-axis sleep stages: e.g. "W", "REM", "1", "2", "3"
      else if (/^(?:W|REM|1|2|3|REM\s*—|2\s*—|3\s*—)$/.test(text)) {
        const cleanStage = text.replace(/[^0-9a-zA-Z]/g, '').trim();
        if (cleanStage && !y_axis_stages.includes(cleanStage)) {
          y_axis_stages.push(cleanStage);
        }
      }
    }

    // Sort stages and timestamps logically
    y_axis_stages.sort((a, b) => {
      const order = ["W", "REM", "1", "2", "3"];
      return order.indexOf(a) - order.indexOf(b);
    });

    const details = {
      labels: literal_labels,
      y_axis_stages: y_axis_stages.length > 0 ? y_axis_stages : ["W", "REM", "1", "2", "3"],
      x_axis_timestamps: x_axis_timestamps.length > 0 ? x_axis_timestamps : ["10pm", "11pm", "12pm", "01am", "02am", "03am", "04am", "05am", "06am"]
    };

    return {
      ...engine,
      archetype: L2S_CONFIG.archetypes.TIMELINE_STEP_CHART.id as any,
      details
    };
  }
}
