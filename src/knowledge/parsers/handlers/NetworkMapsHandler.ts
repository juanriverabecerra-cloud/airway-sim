import type { IArchetypeHandler } from './IArchetypeHandler.ts';
import type { VisualDataEngine } from '../../types/index.ts';
import { L2S_CONFIG } from '../../config/archetypes.ts';

export class NetworkMapsHandler implements IArchetypeHandler {

  public supports(engine: VisualDataEngine): boolean {
    const textToMatch = `${engine.caption} ${engine.id}`.toLowerCase();
    const config = L2S_CONFIG.archetypes.NETWORK_MAPS;
    
    // Check standard keywords or standard archetype name
    const matchKeyword = config.keywords.some(kw => textToMatch.includes(kw));
    const matchArchetype = engine.archetype === config.id;
    return matchKeyword || matchArchetype;
  }

  public async handle(engine: VisualDataEngine): Promise<VisualDataEngine> {
    const text_bounding_boxes = engine.text_bounding_boxes || [];
    
    // 1. Catalog all anatomical node identities into nodes dictionary
    const nodes: Record<string, { name: string; relational_variants: string[]; bbox?: [number, number, number, number] }> = {};
    const labels: string[] = [];

    // Guard against malformed or missing text properties inside bounding boxes to prevent runtime crashes
    for (const box of text_bounding_boxes) {
      if (!box || typeof box.text !== 'string') continue;
      const cleanLabel = box.text.replace(" [uncertain]", "").trim();
      if (cleanLabel.length > 1) {
        labels.push(cleanLabel);
        
        // Node ID is capitalized/cleaned string
        const node_id = cleanLabel.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        if (node_id) {
          nodes[node_id] = {
            name: cleanLabel,
            relational_variants: [],
            bbox: box.bbox
          };
        }
      }
    }

    // 2. Keep the locally verified vectors if present, or leave blank to eliminate hallucinations
    const detailsRaw = engine.details || {};
    const source_target_vectors = detailsRaw.source_target_vectors || [];

    const details = {
      nodes,
      labels,
      source_target_vectors
    };

    return {
      ...engine,
      archetype: L2S_CONFIG.archetypes.NETWORK_MAPS.id,
      details
    };
  }
}
