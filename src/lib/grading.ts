export function normalizeAnswerText(text: string): string {
  return text.trim().replace(/\s+/g, '').replace(/[.,!?。、]/g, '');
}

export function isExactMatch(correctAnswer: string, submittedAnswer: string): boolean {
  return normalizeAnswerText(correctAnswer) === normalizeAnswerText(submittedAnswer);
}

export function shuffleChoices<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
