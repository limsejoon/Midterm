export type ConceptAccuracy = { conceptName: string; total: number; correct: number };

export function computeConceptAccuracy(
  rows: { conceptName: string; isCorrect: boolean }[],
): ConceptAccuracy[] {
  const map = new Map<string, ConceptAccuracy>();
  for (const row of rows) {
    const entry = map.get(row.conceptName) ?? { conceptName: row.conceptName, total: 0, correct: 0 };
    entry.total += 1;
    if (row.isCorrect) entry.correct += 1;
    map.set(row.conceptName, entry);
  }
  return [...map.values()];
}
