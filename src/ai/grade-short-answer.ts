import { generateText, Output } from 'ai';
import { z } from 'zod';
import { GRADING_MODEL } from './models';

const judgeSchema = z.object({
  isCorrect: z.boolean(),
});

export async function aiJudgeShortAnswer(params: {
  conceptName: string;
  questionText: string;
  correctAnswer: string;
  submittedAnswer: string;
}): Promise<boolean> {
  const { output } = await generateText({
    model: GRADING_MODEL,
    output: Output.object({ schema: judgeSchema }),
    prompt: `중학교 국어 문법 단답형 문제 채점을 도와줘.

문법 개념: ${params.conceptName}
문제: ${params.questionText}
정답: ${params.correctAnswer}
학생이 제출한 답: ${params.submittedAnswer}

학생의 답이 표현은 다르더라도 의미상 정답과 같은 내용이면 true, 아니면 false를 반환해줘.`,
  });
  return output.isCorrect;
}
