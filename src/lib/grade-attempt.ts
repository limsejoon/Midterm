import { isExactMatch } from './grading';
import { aiJudgeShortAnswer } from '@/ai/grade-short-answer';

export type GradeResult = { isCorrect: boolean; gradedBy: 'exact' | 'ai_judged' };

export async function gradeAttempt(params: {
  type: 'multiple_choice' | 'short_answer' | 'ox';
  conceptName: string;
  questionText: string;
  correctAnswer: string;
  submittedAnswer: string;
}): Promise<GradeResult> {
  if (params.type !== 'short_answer') {
    return {
      isCorrect: isExactMatch(params.correctAnswer, params.submittedAnswer),
      gradedBy: 'exact',
    };
  }

  if (isExactMatch(params.correctAnswer, params.submittedAnswer)) {
    return { isCorrect: true, gradedBy: 'exact' };
  }

  try {
    const isCorrect = await aiJudgeShortAnswer({
      conceptName: params.conceptName,
      questionText: params.questionText,
      correctAnswer: params.correctAnswer,
      submittedAnswer: params.submittedAnswer,
    });
    return { isCorrect, gradedBy: 'ai_judged' };
  } catch {
    return { isCorrect: false, gradedBy: 'exact' };
  }
}
