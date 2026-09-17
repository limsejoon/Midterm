import { generateText, Output } from 'ai';
import { z } from 'zod';
import { EXTRACTION_MODEL } from './models';

export const extractedProblemSchema = z.object({
  conceptName: z
    .string()
    .describe('이 문제가 테스트하는 문법 개념. 등록된 개념 목록 중 하나와 맞으면 그 이름을 정확히 그대로 사용'),
  type: z.enum(['multiple_choice', 'short_answer', 'ox']),
  questionText: z.string(),
  choices: z.array(z.string()).nullable().describe('객관식일 때만 보기 배열, 아니면 null'),
  correctAnswer: z.string(),
});

export type ExtractedProblem = z.infer<typeof extractedProblemSchema>;

export async function extractProblemFromImage(
  imageBase64: string,
  mediaType: string,
  existingConcepts: string[] = [],
): Promise<ExtractedProblem> {
  const conceptListText =
    existingConcepts.length > 0
      ? `\n\n이미 등록된 문법 개념 목록: ${existingConcepts.join(', ')}\n이 문제가 목록 중 하나에 해당하면 그 이름을 정확히 그대로 사용하고, 맞는 게 없을 때만 새로운 이름을 만들어줘.`
      : '';

  const { output } = await generateText({
    model: EXTRACTION_MODEL,
    output: Output.object({ schema: extractedProblemSchema }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `이 이미지는 중학교 국어 문법 문제집의 한 문제입니다. 문제 텍스트, 보기(있다면), 정답, 이 문제가 테스트하는 문법 개념을 추출해줘.${conceptListText}`,
          },
          { type: 'image', image: imageBase64, mediaType },
        ],
      },
    ],
  });
  return output;
}
