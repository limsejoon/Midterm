import { generateText, Output } from 'ai';
import { z } from 'zod';
import { GENERATION_MODEL } from './models';
import { shuffleChoices } from '@/lib/grading';

export const variantSchema = z.object({
  type: z.enum(['multiple_choice', 'short_answer', 'ox']),
  questionText: z.string(),
  choices: z.array(z.string()).nullable(),
  correctAnswer: z.string(),
});

export type GeneratedVariant = z.infer<typeof variantSchema>;

export async function generateVariants(params: {
  conceptName: string;
  originalQuestionText: string;
  originalType: 'multiple_choice' | 'short_answer' | 'ox';
  count: number;
  focusHint?: string;
}): Promise<GeneratedVariant[]> {
  const { output } = await generateText({
    model: GENERATION_MODEL,
    output: Output.array({
      element: variantSchema,
      minItems: params.count,
      maxItems: params.count,
    }),
    prompt: `다음은 중학교 국어 문법 문제집의 원본 문제입니다.

문법 개념: ${params.conceptName}
원본 문제: ${params.originalQuestionText}
원본 형식: ${params.originalType}

이 문제와 같은 문법 개념을 테스트하지만, 지문/예시 문장과 보기는 다른 새로운 문제를 ${params.count}개 만들어줘.
각 문제는 객관식(4지선다)/단답형/OX 중 이 개념을 테스트하기에 가장 적합한 형식을 자유롭게 골라도 돼.
객관식이면 반드시 보기(choices)를 4개 배열로 채우고, 단답형/OX면 choices는 null로 둬.
정답(correctAnswer)은 객관식이면 정답 보기의 텍스트 그대로, 단답형이면 정답 단어/구, OX면 "O" 또는 "X"로 적어줘.
${params.focusHint ? `\n아이가 방금 이 개념에서 다음과 같은 실수를 했어: ${params.focusHint}\n이 실수를 다시 하는지 확인할 수 있도록, 그 헷갈린 지점을 정확히 짚는 문제로 만들어줘.` : ''}`,
  });

  return output.map((variant) => ({
    ...variant,
    choices: variant.choices ? shuffleChoices(variant.choices) : null,
  }));
}
