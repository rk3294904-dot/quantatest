import type { Attempt, CategoryStat } from '@/lib/types';
import { percent } from '@/lib/utils';

export interface BreakdownRow {
  name: string;
  correct: number;
  wrong: number;
  skipped: number;
  attempted: number;
  accuracy: number;
}

export interface TrendPoint {
  attemptId: string;
  testTitle: string;
  submittedAt: Date | null;
  accuracy: number;
  attempted: number;
}

export function aggregateBreakdown(attempts: Attempt[], field: 'topicStats' | 'sectionStats'): BreakdownRow[] {
  const totals: Record<string, CategoryStat> = {};
  for (const attempt of attempts) {
    for (const [name, stat] of Object.entries(attempt[field])) {
      const entry = totals[name] ?? { correct: 0, wrong: 0, skipped: 0 };
      entry.correct += stat.correct;
      entry.wrong += stat.wrong;
      entry.skipped += stat.skipped;
      totals[name] = entry;
    }
  }
  return Object.entries(totals)
    .map(([name, entry]) => {
      const attempted = entry.correct + entry.wrong;
      return { name, ...entry, attempted, accuracy: percent(entry.correct, attempted) };
    })
    .sort((a, b) => b.accuracy - a.accuracy);
}

export function accuracyTrend(attempts: Attempt[]): TrendPoint[] {
  return attempts
    .map((attempt) => {
      const attempted = (attempt.correctCount ?? 0) + (attempt.wrongCount ?? 0);
      return {
        attemptId: attempt.id,
        testTitle: attempt.testTitle,
        submittedAt: attempt.submittedAt,
        accuracy: percent(attempt.correctCount ?? 0, attempted),
        attempted,
      };
    })
    .sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
}
