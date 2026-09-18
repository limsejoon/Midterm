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

// simple items (OX, 2-choice) skip asking the child to explain their reasoning;
// deeper items (3+ choice multiple choice, short answer) ask for it before analyzing the mistake
export function needsMistakeExplanation(
  type: 'multiple_choice' | 'short_answer' | 'ox',
  choices: string[] | null,
): boolean {
  if (type === 'ox') return false;
  if (type === 'multiple_choice') return (choices?.length ?? 0) >= 3;
  return true;
}
