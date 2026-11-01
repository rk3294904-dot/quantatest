import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BreakdownRow, TrendPoint } from '@/lib/topicStats';
import { cn } from '@/lib/utils';

export const MIN_ANSWERS_FOR_RANKING = 3;
export const TREND_WINDOW = 5;

export type AccuracyTone = 'error' | 'warning' | 'success';

export function toneFor(accuracy: number): AccuracyTone {
  if (accuracy < 60) return 'error';
  if (accuracy < 80) return 'warning';
  return 'success';
}

const BAR_CLASS: Record<AccuracyTone, string> = {
  error: 'bg-error-500',
  warning: 'bg-warning-500',
  success: 'bg-accent-500',
};

const TEXT_CLASS: Record<AccuracyTone, string> = {
  error: 'text-error-600 dark:text-error-500',
  warning: 'text-warning-700 dark:text-warning-500',
  success: 'text-accent-700 dark:text-accent-400',
};

export function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-slate-900 sm:mt-2 sm:text-2xl dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <div className="mt-5 overflow-x-auto pb-1">
      <div className="flex min-w-full items-end gap-2 sm:gap-3" role="img" aria-label="Accuracy per test, oldest first">
        {points.map((point, index) => {
          const tone = toneFor(point.accuracy);
          return (
            <div
              key={point.attemptId}
              className="flex min-w-[28px] flex-1 flex-col items-center gap-1.5"
              title={`${point.testTitle}: ${point.accuracy}%`}
            >
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{point.accuracy}%</span>
              <div className="relative h-32 w-full sm:h-40">
                <div
                  className={cn('absolute inset-x-0 bottom-0 rounded-t-lg transition-all duration-500', BAR_CLASS[tone])}
                  style={{ height: `${Math.max(point.accuracy, 4)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">T{index + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BreakdownItem({ row }: { row: BreakdownRow }) {
  const tone = toneFor(row.accuracy);
  const rankable = row.attempted >= MIN_ANSWERS_FOR_RANKING;
  return (
    <li className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {row.attempted} answered{rankable ? '' : ' · too few to rank yet'}
          </p>
        </div>
        <span className={cn('shrink-0 text-lg font-bold', TEXT_CLASS[tone])}>{row.accuracy}%</span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-label={`${row.name} accuracy`}
        aria-valuenow={row.accuracy}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn('h-full rounded-full transition-all duration-500', BAR_CLASS[tone])} style={{ width: `${row.accuracy}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <CountCell label="Correct" value={row.correct} />
        <CountCell label="Wrong" value={row.wrong} />
        <CountCell label="Skipped" value={row.skipped} />
      </dl>
    </li>
  );
}

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/60">
      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

export function FocusList({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Answer a few more questions per topic to unlock recommendations.
      </p>
    );
  }
  return (
    <ol className="mt-4 space-y-3">
      {rows.map((row, index) => (
        <li key={row.name} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-error-50 text-sm font-bold text-error-600 dark:bg-error-600/15 dark:text-error-500">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-800 dark:text-slate-200">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.accuracy}% across {row.attempted} answers</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function RevisePrompt() {
  return (
    <Link to="/revise" className="mt-5 block">
      <Button className="w-full" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
        Revise missed questions
      </Button>
    </Link>
  );
}
