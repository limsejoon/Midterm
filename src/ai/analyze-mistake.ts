import { generateText, Output } from 'ai';
import { z } from 'zod';
import { GENERATION_MODEL } from './models';

const analysisSchema = z.object({
  analysis: z.string(),
});

export async function analyzeMistake(params: {
  conceptName: string;
  questionText: string;
  choices: string[] | null;
  correctAnswer: string;
  submittedAnswer: string;
  childExplanation: string | null;
}): Promise<string> {
  const { output } = await generateText({
    model: GENERATION_MODEL,
    output: Output.object({ schema: analysisSchema }),
    prompt: `중학생이 국어 문법 문제를 틀렸어. 왜 틀렸는지 분석해서 아이가 이해할 수 있게 짧고 다정한 말투로 설명해줘.

문법 개념: ${params.conceptName}
문제: ${params.questionText}
${params.choices ? `보기: ${params.choices.join(', ')}` : ''}
정답: ${params.correctAnswer}
아이가 제출한 답: ${params.submittedAnswer}
${params.childExplanation ? `아이가 그렇게 생각한 이유: ${params.childExplanation}` : ''}

어떤 개념을 헷갈렸는지, 혹은 문제를 어떻게 잘못 읽었는지 구체적으로 짚어주고,
정답을 왜 정답이라고 하는지도 함께 설명해줘. 2~3문장 정도로 짧게.`,
  });
  return output.analysis;
}
