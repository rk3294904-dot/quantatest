import { formatCorrectAnswer, formatUserAnswer, hasOptions, isAnswered, LETTERS } from '@/lib/scoring';
import type { AnswerValue, QuestionType } from '@/lib/types';

export interface ReviseItem {
  id: string;
  testId: string;
  testTitle: string;
  text: string;
  options: string[];
  explanation: string;
  section: string;
  questionType: QuestionType;
  tolerance: number | null;
  correctAnswer: string | undefined;
  userAnswer: AnswerValue | undefined;
}

export type CardStatus = 'correct' | 'wrong';

export function usesOptionChoices(type: QuestionType): boolean {
  return hasOptions(type) || type === 'true_false';
}

export function letterIndices(letters: string): number[] {
  return letters
    .split('|')
    .map((letter) => LETTERS.indexOf(letter.trim().toUpperCase()))
    .filter((index) => index >= 0);
}

export function answerIndices(answer: AnswerValue | undefined): number[] {
  if (typeof answer === 'number') return [answer];
  if (Array.isArray(answer)) return answer;
  return [];
}

function optionLines(options: string[], indices: number[]): string[] {
  return indices.map((index) => {
    const text = options[index];
    return text ? `${LETTERS[index]}. ${text}` : (LETTERS[index] ?? String(index));
  });
}

export function correctLines(item: ReviseItem): string[] {
  if (!item.correctAnswer) return ['Unavailable'];
  if (usesOptionChoices(item.questionType)) {
    return optionLines(item.options, letterIndices(item.correctAnswer));
  }
  return [formatCorrectAnswer(item.questionType, item.correctAnswer)];
}

export function answerLines(item: ReviseItem, answer: AnswerValue | undefined): string[] {
  if (!isAnswered(answer)) return ['Not answered'];
  if (usesOptionChoices(item.questionType)) {
    return optionLines(item.options, answerIndices(answer));
  }
  return [formatUserAnswer(item.questionType, answer)];
}
