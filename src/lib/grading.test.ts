import { describe, it, expect } from 'vitest';
import { normalizeAnswerText, isExactMatch, shuffleChoices, needsMistakeExplanation } from './grading';

describe('normalizeAnswerText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeAnswerText('  형용사 이다  ')).toBe('형용사이다');
  });

  it('strips trailing punctuation', () => {
    expect(normalizeAnswerText('형용사.')).toBe('형용사');
    expect(normalizeAnswerText('형용사!')).toBe('형용사');
  });
});

describe('isExactMatch', () => {
  it('matches after normalization', () => {
    expect(isExactMatch('형용사', ' 형용사 ')).toBe(true);
    expect(isExactMatch('형용사.', '형용사')).toBe(true);
  });

  it('rejects different answers', () => {
    expect(isExactMatch('형용사', '동사')).toBe(false);
  });
});

describe('shuffleChoices', () => {
  it('returns the same elements in some order', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = shuffleChoices(input);
    expect(result).toHaveLength(4);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c', 'd'];
    shuffleChoices(input);
    expect(input).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('needsMistakeExplanation', () => {
  it('skips OX questions', () => {
    expect(needsMistakeExplanation('ox', null)).toBe(false);
  });

  it('skips 2-choice multiple choice', () => {
    expect(needsMistakeExplanation('multiple_choice', ['O', 'X'])).toBe(false);
  });

  it('asks for 3+ choice multiple choice', () => {
    expect(needsMistakeExplanation('multiple_choice', ['a', 'b', 'c', 'd'])).toBe(true);
  });

  it('asks for short answer', () => {
    expect(needsMistakeExplanation('short_answer', null)).toBe(true);
  });
});
