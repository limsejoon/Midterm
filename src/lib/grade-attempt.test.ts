import { describe, it, expect, vi } from 'vitest';

vi.mock('@/ai/grade-short-answer', () => ({
  aiJudgeShortAnswer: vi.fn(),
}));

import { aiJudgeShortAnswer } from '@/ai/grade-short-answer';
import { gradeAttempt } from './grade-attempt';

describe('gradeAttempt', () => {
  it('grades multiple_choice by exact match without calling the AI judge', async () => {
    const result = await gradeAttempt({
      type: 'multiple_choice',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '매우',
      submittedAnswer: '매우',
    });
    expect(result).toEqual({ isCorrect: true, gradedBy: 'exact' });
    expect(aiJudgeShortAnswer).not.toHaveBeenCalled();
  });

  it('grades short_answer as exact when normalized text matches', async () => {
    const result = await gradeAttempt({
      type: 'short_answer',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: ' 형용사 ',
    });
    expect(result).toEqual({ isCorrect: true, gradedBy: 'exact' });
    expect(aiJudgeShortAnswer).not.toHaveBeenCalled();
  });

  it('falls back to the AI judge for short_answer when exact match fails', async () => {
    vi.mocked(aiJudgeShortAnswer).mockResolvedValue(true);

    const result = await gradeAttempt({
      type: 'short_answer',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: '형용사이다',
    });

    expect(result).toEqual({ isCorrect: true, gradedBy: 'ai_judged' });
    expect(aiJudgeShortAnswer).toHaveBeenCalledWith({
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: '형용사이다',
    });
  });

  it('falls back to exact-only (incorrect) when the AI judge call fails', async () => {
    vi.mocked(aiJudgeShortAnswer).mockRejectedValue(new Error('gateway down'));

    const result = await gradeAttempt({
      type: 'short_answer',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: '동사',
    });

    expect(result).toEqual({ isCorrect: false, gradedBy: 'exact' });
  });
});
