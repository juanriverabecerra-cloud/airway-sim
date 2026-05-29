import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { SourceFragment, ParsedSection, VisualDataEngine } from '../types/index.ts';

/**
 * TextExtractor handles reading raw content from source files.
 * 
 * Supported formats:
 *   - .md, .txt, .markdown — read as plain text
 *   - .pdf — extract text using standard PDF reader; falls back to OCR if scanned/image-only
 *   - .png, .jpg, .jpeg — extract text using OCR
 *   - .pptx — extract slide text
 */
export class TextExtractor {

  /**
   * Phase 1: Local-First Mandatory Layout Extraction
   * Runs completely offline and at maximum speed, extracting text layout and cropping figures locally.
   */
  public extractLocal(filePath: string): { fragments: SourceFragment[], visual_data_engines: VisualDataEngine[], warnings: string[] } {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    if (['.pdf', '.png', '.jpg', '.jpeg', '.pptx'].includes(ext)) {
      console.log(`  [EXTRACTOR] Performing local layout and figure extraction: ${fileName}`);
      const scriptPath = path.resolve(__dirname, 'local_parser.py');
      try {
        const result = execSync(
          `python3 ${JSON.stringify(scriptPath)} ${JSON.stringify(filePath)}`,
          {
            encoding: 'utf-8',
            maxBuffer: 100 * 1024 * 1024,
            timeout: 120000,
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ''}`
            }
          }
        );
        const parsed = JSON.parse(result.trim());
        if (parsed.error) {
          console.error(`  [EXTRACTOR ERROR] Local parser script reported error: ${parsed.error}`);
          return { fragments: this.emptyFallback(fileName), visual_data_engines: [], warnings: [parsed.error] };
        }
        
        // Map raw visual engines from python
        const visualEngines: VisualDataEngine[] = [];
        const enginesRaw = parsed.visual_data_engines || [];
        for (const raw of enginesRaw) {
          visualEngines.push({
            id: raw.id,
            sourceFile: raw.sourceFile || fileName,
            pageNumber: raw.pageNumber || 1,
            image_path: raw.image_path || '',
            closest_text_heading: raw.closest_text_heading || '',
            caption: raw.caption || '',
            archetype: raw.archetype,
            details: raw.details || {},
            text_bounding_boxes: raw.text_bounding_boxes || []
          });
        }
        
        return {
          fragments: parsed.fragments || [],
          visual_data_engines: visualEngines,
          warnings: parsed.warnings || []
        };
      } catch (error: any) {
        console.error(`  [EXTRACTOR ERROR] Spawn local_parser.py failed: ${error.message}`);
        return { fragments: this.emptyFallback(fileName), visual_data_engines: [], warnings: [error.message] };
      }
    } else {
      // Plain text fallback
      const fragments = this.extractPlainText(filePath);
      return { fragments, visual_data_engines: [], warnings: [] };
    }
  }

  /**
   * Phase 2: Optional Visual Semantic Enrichment Queue
   * Queues cropped figures for deep vision enrichment, with throttling and rate-limit resilience.
   */
  public async enrichVisuals(visualEngines: VisualDataEngine[]): Promise<VisualDataEngine[]> {
    const provider = process.env.VISION_PROVIDER || 'gemini';
    console.log(`  [VISION ENRICHER] Starting Phase 2 visual semantic enrichment using provider: ${provider}`);
    
    const enrichedEngines: VisualDataEngine[] = [];
    
    for (let i = 0; i < visualEngines.length; i++) {
      const engine = visualEngines[i];
      console.log(`  [VISION ENRICHER] Processing figure ${i + 1}/${visualEngines.length}: ${engine.id}`);
      
      if (!engine.image_path || !fs.existsSync(engine.image_path)) {
        console.warn(`  [VISION ENRICHER WARNING] No local image cropped at path: ${engine.image_path}. Skipping.`);
        enrichedEngines.push(engine);
        continue;
      }
      
      try {
        let enrichedData: any = null;
        
        if (provider === 'gemini') {
          // Call python multimodal vision enricher for standalone image
          const scriptPath = path.resolve(__dirname, 'multimodal_extract.py');
          const result = execSync(
            `python3 ${JSON.stringify(scriptPath)} image_visual ${JSON.stringify(engine.image_path)}`,
            {
              encoding: 'utf-8',
              maxBuffer: 100 * 1024 * 1024,
              timeout: 120000,
              env: {
                ...process.env,
                PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ''}`
              }
            }
          );
          
          const parsed = JSON.parse(result.trim());
          if (parsed && parsed.pages && parsed.pages[0] && parsed.pages[0].figures && parsed.pages[0].figures[0]) {
            enrichedData = parsed.pages[0].figures[0];
          }
        } else if (provider === 'ollama') {
          // Ollama Vision API integration
          const imageBase64 = fs.readFileSync(engine.image_path).toString('base64');
          const prompt = `You are a high-fidelity visual extraction engine. Analyze this medical figure and extract its semantic details into the following structure. Respond strictly in valid JSON:
{
  "archetype": "ANATOMICAL NETWORKS & MICROCIRCUIT MAPS",
  "caption": "${engine.caption.replace(/"/g, '\\"')}",
  "details": {
    "nodes": {"node_id": {"name": "node name"}},
    "source_target_vectors": [{"source": "node_id", "target": "node_id", "direction": "Unidirectional", "sign": "Excitatory", "neurotransmitter": "Glutamate"}]
  }
}`;

          const response = await this.callOllamaApi(prompt, imageBase64);
          if (response && response.figures && response.figures[0]) {
            enrichedData = response.figures[0];
          }
        }
        
        if (enrichedData) {
          enrichedEngines.push({
            ...engine,
            archetype: enrichedData.archetype || engine.archetype,
            caption: enrichedData.caption || engine.caption,
            details: enrichedData.details || engine.details
          });
          console.log(`  [VISION ENRICHER] Successfully enriched ${engine.id} details.`);
        } else {
          console.warn(`  [VISION ENRICHER WARNING] Vision API returned no enriched data for ${engine.id}.`);
          enrichedEngines.push(engine);
        }
      } catch (err: any) {
        console.error(`  [VISION ENRICHER ERROR] Enrichment failed for ${engine.id}: ${err.message}`);
        enrichedEngines.push(engine);
      }
      
      // Throttle queue to prevent rate limit bottlenecks
      if (i < visualEngines.length - 1) {
        console.log(`  [VISION ENRICHER] Throttling: waiting 2 seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return enrichedEngines;
  }

  /**
   * Helper to make a local Ollama vision generate call
   */
  private async callOllamaApi(prompt: string, imageBase64: string): Promise<any> {
    const python_code = `
import json, urllib.request, sys
body = {
    "model": "llama3.2-vision",
    "prompt": """${prompt.replace(/"/g, '\\"')}""",
    "images": ["${imageBase64}"],
    "stream": False,
    "format": "json"
}
try:
    req = urllib.request.Request("http://localhost:11434/api/generate", data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as res:
        data = json.loads(res.read().decode("utf-8"))
        out_text = data.get("response", "{}")
        parsed = json.loads(out_text)
        print(json.dumps({"figures": [parsed]}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
    try {
      const result = execSync(`python3 -c ${JSON.stringify(python_code)}`, { encoding: 'utf-8', timeout: 120000 });
      return JSON.parse(result.trim());
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * Backward compatible extract method (delegates to Phase 1 extractLocal)
   */
  public extract(filePath: string): SourceFragment[] {
    const res = this.extractLocal(filePath);
    return res.fragments;
  }

  /**
   * Backward compatible visual extract method (delegates to Phase 1 extractLocal)
   */
  public extractVisual(filePath: string): VisualDataEngine[] {
    if (process.env.SKIP_VISUAL === 'true') {
      return [];
    }
    const res = this.extractLocal(filePath);
    return res.visual_data_engines;
  }

  /**
   * Fallback empty fragment when a parser completely fails
   */
  private emptyFallback(fileName: string): SourceFragment[] {
    return [{
      id: 'PAGE_001',
      sourceFile: fileName,
      pageNumber: 1,
      contentType: 'empty',
      rawText: '',
      characterCount: 0,
      parsedSections: []
    }];
  }

  /**
   * Read a plain text / markdown file directly.
   */
  private extractPlainText(filePath: string): SourceFragment[] {
    const fileName = path.basename(filePath);
    const content = this.decodeUnicodeEscapes(fs.readFileSync(filePath, 'utf-8'));
    const charCount = content.trim().length;

    console.log(`  [EXTRACTOR] Read ${charCount} characters from ${fileName}`);

    let contentType: SourceFragment['contentType'];
    if (charCount === 0) {
      contentType = 'empty';
    } else {
      contentType = 'text';
    }

    const fragments: SourceFragment[] = [];
    const lines = content.split('\n');
    
    if (charCount <= 5000) {
      fragments.push({
        id: 'PAGE_001',
        sourceFile: fileName,
        pageNumber: 1,
        contentType,
        rawText: content.trim(),
        characterCount: charCount,
        parsedSections: this.parseTextIntoSections(content.trim())
      });
    } else {
      let currentChunk: string[] = [];
      let currentCharCount = 0;
      let pageNum = 1;

      for (const line of lines) {
        const isHeading = /^#{1,3}\s/.test(line.trim());
        
        if ((isHeading || currentCharCount > 3000) && currentChunk.length > 0) {
          const chunkText = currentChunk.join('\n').trim();
          if (chunkText.length > 0) {
            fragments.push({
              id: `PAGE_${String(pageNum).padStart(3, '0')}`,
              sourceFile: fileName,
              pageNumber: pageNum,
              contentType: 'text',
              rawText: chunkText,
              characterCount: chunkText.length,
              parsedSections: this.parseTextIntoSections(chunkText)
            });
            pageNum++;
          }
          currentChunk = [];
          currentCharCount = 0;
        }

        currentChunk.push(line);
        currentCharCount += line.length;
      }

      const chunkText = currentChunk.join('\n').trim();
      if (chunkText.length > 0) {
        fragments.push({
          id: `PAGE_${String(pageNum).padStart(3, '0')}`,
          sourceFile: fileName,
          pageNumber: pageNum,
          contentType: 'text',
          rawText: chunkText,
          characterCount: chunkText.length,
          parsedSections: this.parseTextIntoSections(chunkText)
        });
      }
    }

    return fragments;
  }

  /**
   * Parse raw text into labeled sections based on structural cues.
   */
  private parseTextIntoSections(text: string): ParsedSection[] {
    const sections: ParsedSection[] = [];
    const lines = text.split('\n');
    
    let currentHeading = '';
    let currentBody: string[] = [];
    let sectionStartLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        if (currentBody.length > 0) {
          currentBody.push('');
        }
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentBody.length > 0 || currentHeading) {
          const bodyText = currentBody.join('\n').trim();
          if (bodyText.length > 0 || currentHeading) {
            sections.push({
              heading: currentHeading,
              body: bodyText,
              startLine: sectionStartLine,
              category: 'heading'
            });
          }
        }

        currentHeading = headingMatch[2];
        currentBody = [];
        sectionStartLine = i + 1;
        continue;
      }

      if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        currentBody.push(trimmed);
        continue;
      }

      if (trimmed.includes('|') && trimmed.startsWith('|')) {
        currentBody.push(trimmed);
        continue;
      }

      currentBody.push(trimmed);
    }

    const bodyText = currentBody.join('\n').trim();
    if (bodyText.length > 0 || currentHeading) {
      let category: ParsedSection['category'] = 'paragraph';
      if (currentHeading) category = 'heading';
      else if (bodyText.includes('|') && bodyText.includes('---')) category = 'table';
      else if (/^[-*+]\s/m.test(bodyText)) category = 'list';

      sections.push({
        heading: currentHeading,
        body: bodyText,
        startLine: sectionStartLine,
        category
      });
    }

    return sections;
  }

  /**
   * Decodes Unicode escapes.
   */
  private decodeUnicodeEscapes(text: string): string {
    if (!text) return '';
    const decoded = text.replace(/[/\\]u([0-9a-fA-F]{4})/g, (match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return match;
      }
    });

    const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/;
    return decoded
      .split('\n')
      .filter(line => !controlCharRegex.test(line))
      .join('\n');
  }
}
