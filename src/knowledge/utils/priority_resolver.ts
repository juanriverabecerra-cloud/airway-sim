/**
 * priority_resolver.ts
 * 
 * Implements priority parsing and comparison rules for textbook sources.
 * 
 * Hierarchy Rules:
 *   1. Miller's Anesthesia always takes priority over any other textbook.
 *   2. For the same textbook (or comparing non-Miller textbooks), the newer edition/version takes priority.
 *   3. If edition numbers match, compare source filename alphabetically as a stable fallback.
 */

export interface TextbookMetadata {
  title: string;
  edition: number;
  isMiller: boolean;
}

/**
 * Extracts textbook title, edition number, and Miller's status from a filename.
 * E.g., "Millers_Anaesthesia_9th_Edition_9_10.pdf" -> { title: "Millers_Anaesthesia", edition: 9, isMiller: true }
 */
export function parseTextbookMetadata(filename: string): TextbookMetadata {
  const cleanName = filename.replace(/\.(pdf|json|md|txt)$/i, '');
  const lowerName = cleanName.toLowerCase();
  
  const isMiller = lowerName.includes('miller');
  
  let edition = 1; // Default fallback edition
  
  const editionPatterns = [
    /(\d+)(?:st|nd|rd|th)?\s*(?:edition|ed)\b/i,
    /(?:edition|ed)\s*(\d+)\b/i,
    /_(\d+)(?:st|nd|rd|th)?_ed/i,
    /\b(\d+)\b/ // Standalone number fallback
  ];
  
  for (const pattern of editionPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      const numStr = match[1] || match[2];
      if (numStr) {
        const parsed = parseInt(numStr, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 100) {
          edition = parsed;
          break;
        }
      }
    }
  }
  
  let title = cleanName;
  const splitIdx = cleanName.search(/(?:_?\d+(?:st|nd|rd|th)?_Edition|Edition|\d+\s*Ed)/i);
  if (splitIdx > 0) {
    title = cleanName.substring(0, splitIdx).replace(/_$/, '');
  }
  
  return {
    title,
    edition,
    isMiller
  };
}

/**
 * Calculates priority rank:
 *   - Miller's Anesthesia = 1000 + edition
 *   - Non-Miller textbooks = 100 + edition
 */
export function getPriorityRank(filename: string): number {
  const meta = parseTextbookMetadata(filename);
  if (meta.isMiller) {
    return 1000 + meta.edition;
  }
  return 100 + meta.edition;
}

/**
 * Compares two textbook source filenames for priority.
 * Returns:
 *   > 0 if fileA has HIGHER priority than fileB
 *   < 0 if fileA has LOWER priority than fileB
 *   0 if they have EQUAL priority
 */
export function comparePriority(fileA: string, fileB: string): number {
  if (fileA === fileB) return 0;
  
  const rankA = getPriorityRank(fileA);
  const rankB = getPriorityRank(fileB);
  
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  
  // Fallback: Compare titles alphabetically to guarantee stable sort
  const metaA = parseTextbookMetadata(fileA);
  const metaB = parseTextbookMetadata(fileB);
  return metaB.title.localeCompare(metaA.title); // Stable reverse alphabetical
}
