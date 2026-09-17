import { generateText, Output } from 'ai';
import { z } from 'zod';
import { EXTRACTION_MODEL } from './models';

export async function extractConceptsFromImage(
  imageBase64: string,
  mediaType: string,
): Promise<string[]> {
  const { output } = await generateText({
    model: EXTRACTION_MODEL,
    output: Output.array({ element: z.string() }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '이 이미지는 중학교 국어 문법 문제집의 목차입니다. 목차에 나온 단원/문법 개념 이름을 순서대로 배열로 추출해줘. 페이지 번호나 "제1장" 같은 장 번호는 빼고 개념 이름만 적어줘.',
          },
          { type: 'image', image: imageBase64, mediaType },
        ],
      },
    ],
  });
  return output;
}
