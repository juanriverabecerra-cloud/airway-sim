/**
 * AttendingContextPacker.ts
 * 
 * Implements a deterministic zero-hallucination context packaging guardrail.
 * Evaluates search scores and enforces refusal behavior if retrieval confidence is low.
 */

export interface PackedContext {
  systemPromptOverride: string | null;
  contextString: string;
}

export interface SearchResult {
  record: {
    id: string;
    chapter_title: string;
    section_heading: string;
    body_text: string;
  };
  score: number;
  rank: number;
}

export class AttendingContextPacker {
  private static SAFETY_FLOOR = 0.35;
  private static REFUSAL_OVERRIDE = 
    "CRITICAL: The internal knowledge base contains zero records regarding this query. " +
    "You must state exactly: 'I do not have that specific information in my current knowledge base. " +
    "I will review the literature and follow up with you later.' Do not extrapolate or guess.";

  /**
   * Evaluates search results and packs them into a context string.
   * Enforces refusal via systemPromptOverride if results are empty or fall below safety threshold.
   */
  public static packContext(results: SearchResult[]): PackedContext {
    // 1. Check if matches are empty
    if (!results || results.length === 0) {
      return {
        systemPromptOverride: this.REFUSAL_OVERRIDE,
        contextString: ""
      };
    }

    // 2. Locate the maximum score
    const maxScore = Math.max(...results.map(r => r.score));

    // 3. Enforce safety floor
    if (maxScore < this.SAFETY_FLOOR) {
      return {
        systemPromptOverride: this.REFUSAL_OVERRIDE,
        contextString: ""
      };
    }

    // 4. Otherwise, construct a clean structured context string for the LLM
    const contextBlocks = results.map(res => {
      const rec = res.record;
      return (
        `[Source: ${rec.chapter_title} - Section: ${rec.section_heading} (Relevance Score: ${res.score.toFixed(3)})]\n` +
        `${rec.body_text}\n`
      );
    });

    return {
      systemPromptOverride: null,
      contextString: contextBlocks.join('\n---\n\n')
    };
  }
}
