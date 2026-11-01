import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3, Layers, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listUserAttempts } from '@/services/attemptService';
import { accuracyTrend, aggregateBreakdown, type BreakdownRow, type TrendPoint } from '@/lib/topicStats';
import { cn, percent } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

const MIN_ANSWERS_FOR_RANKING = 3;
const TREND_WINDOW = 5;

type Scope = 'topicStats' | 'sectionStats';
type SortKey = 'weakest' | 'strongest' | 'volume';

const SCOPE_OPTIONS: Array<{ value: Scope; label: string; icon: typeof Target }> = [
  { value: 'topicStats', label: 'Topics', icon: Target },
  { value: 'sectionStats', label: 'Sections', icon: Layers },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'weakest', label: 'Weakest first' },
  { value: 'strongest', label: 'Strongest first' },
  { value: 'volume', label: 'Most answered' },
];

function toneFor(accuracy: number): 'error' | 'warning' | 'success' {
  if (accuracy < 60) return 'error';
  if (accuracy < 80) return 'warning';
  return 'success';
}

const BAR_CLASS = {
  error: 'bg-error-500',
  warning: 'bg-warning-500',
  success: 'bg-accent-500',
} as const;

function average(points: TrendPoint[]): number | null {
  if (points.length === 0) return null;
  return Math.round(points.reduce((sum, point) => sum + point.accuracy, 0) / points.length);
}

function sortRows(rows: BreakdownRow[], sort: SortKey): BreakdownRow[] {
  const copy = [...rows];
  if (sort === 'volume') return copy.sort((a, b) => b.attempted - a.attempted);
  if (sort === 'strongest') return copy.sort((a, b) => b.accuracy - a.accuracy);
  return copy.sort((a, b) => a.accuracy - b.accuracy);
}

export function WeakAreasPage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';
  const [scope, setScope] = useState<Scope>('topicStats');
  const [sort, setSort] = useState<SortKey>('weakest');

  const attemptsQuery = useQuery({
    queryKey: ['attempts', uid],
    queryFn: () => listUserAttempts(uid),
    enabled: Boolean(uid),
  });

  const submitted = useMemo(
    () => (attemptsQuery.data ?? []).filter((attempt) => attempt.status === 'submitted'),
    [attemptsQuery.data],
  );

  const totals = useMemo(
    () =>
      submitted.reduce(
        (sum, attempt) => ({
          correct: sum.correct + (attempt.correctCount ?? 0),
          wrong: sum.wrong + (attempt.wrongCount ?? 0),
          skipped: sum.skipped + (attempt.skippedCount ?? 0),
        }),
        { correct: 0, wrong: 0, skipped: 0 },
      ),
    [submitted],
  );

  const trend = useMemo(() => accuracyTrend(submitted), [submitted]);
  const breakdown = useMemo(() => aggregateBreakdown(submitted, scope), [submitted, scope]);
  const rows = useMemo(() => sortRows(breakdown, sort), [breakdown, sort]);

  const header = (
    <PageHeader
      eyebrow="Weak areas"
      title="Your performance breakdown"
      description="Accuracy, trends, and skipped questions across every test you have submitted."
      actions={
        <Link to="/revise">
          <Button variant="outline">Open Quanta Revise</Button>
        </Link>
      }
    />
  );

  if (attemptsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        {header}
        <Skeleton className="h-28" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (attemptsQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8"><ErrorState onRetry={() => void attemptsQuery.refetch()} /></div>
      </div>
    );
  }

  if (submitted.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8">
          <EmptyState
            icon={BarChart3}
            title="No submitted tests yet"
            description="Submit a test and your accuracy, trends, and topic breakdown will appear here."
            action={<Link to="/categories"><Button>Browse test series</Button></Link>}
          />
        </div>
      </div>
    );
  }

  const answered = totals.correct + totals.wrong;
  const seen = answered + totals.skipped;
  const recent = trend.slice(-TREND_WINDOW);
  const previous = trend.slice(-TREND_WINDOW * 2, -TREND_WINDOW);
  const recentAvg = average(recent);
  const previousAvg = average(previous);
  const delta = recentAvg !== null && previousAvg !== null ? recentAvg - previousAvg : null;
  const focus = [...breakdown]
    .filter((row) => row.attempted >= MIN_ANSWERS_FOR_RANKING)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:space-y-8 sm:px-6 sm:py-14">
      {header}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        <StatTile label="Overall accuracy" value={`${percent(totals.correct, answered)}%`} hint={`${answered} answered`} />
        <StatTile label="Tests submitted" value={String(submitted.length)} hint="Counted from your history" />
        <StatTile label="Correct answers" value={String(totals.correct)} hint={`${totals.wrong} wrong`} />
        <StatTile label="Skip rate" value={`${percent(totals.skipped, seen)}%`} hint={`${totals.skipped} left blank`} />
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Accuracy trend</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Each bar is one test, oldest on the left.</p>
          </div>
          {delta !== null && (
            <Badge tone={delta >= 0 ? 'success' : 'error'}>
              {delta >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="mr-1 h-3.5 w-3.5" aria-hidden />}
              {delta >= 0 ? '+' : ''}{delta} pts vs previous {TREND_WINDOW}
            </Badge>
          )}
        </div>
        <TrendChart points={trend.slice(-12)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Breakdown type" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === option.value}
                  onClick={() => setScope(option.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    scope === option.value
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                  )}
                >
                  <option.icon className="h-4 w-4" aria-hidden />
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="input-base py-1.5"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No data for this view yet. Questions tagged in your tests will show up here.
            </p>
          ) : (
            <ul className="mt-6 space-y-5">
              {rows.map((row) => (
                <BreakdownItem key={row.name} row={row} />
              ))}
            </ul>
          )}
        </div>

        <aside className="surface h-fit p-5 sm:p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Focus next</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your three lowest-accuracy topics with at least {MIN_ANSWERS_FOR_RANKING} answers.</p>
          {focus.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Answer a few more questions per topic to unlock recommendations.</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {focus.map((row, index) => (
                <li key={row.name} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-error-50 text-sm font-bold text-error-600 dark:bg-error-600/15 dark:text-error-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-200">{row.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.accuracy}% across {row.attempted} answers</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Link to="/revise" className="mt-6 block">
            <Button className="w-full" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>Revise missed questions</Button>
          </Link>
        </aside>
      </section>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3" role="img" aria-label="Accuracy per test">
      {points.map((point) => {
        const tone = toneFor(point.accuracy);
        return (
          <div key={point.attemptId} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-xs font-semibold text-slate-700 opacity-0 transition group-hover:opacity-100 dark:text-slate-200">
              {point.accuracy}%
            </span>
            <div
              className={cn('w-full rounded-t-lg transition-all duration-500', BAR_CLASS[tone])}
              style={{ height: `${Math.max(point.accuracy, 4)}%` }}
              title={`${point.testTitle}: ${point.accuracy}%`}
            />
          </div>
        );
      })}
    </div>
  );
}

function BreakdownItem({ row }: { row: BreakdownRow }) {
  const tone = toneFor(row.accuracy);
  const rankable = row.attempted >= MIN_ANSWERS_FOR_RANKING;
  return (
    <li>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-slate-800 dark:text-slate-200">{row.name}</span>
          {!rankable && <Badge tone="neutral">Few answers</Badge>}
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.accuracy}%</span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-label={`${row.name} accuracy`}
        aria-valuenow={row.accuracy}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn('h-full rounded-full transition-all duration-500', BAR_CLASS[tone])} style={{ width: `${row.accuracy}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        {row.correct} correct · {row.wrong} wrong · {row.skipped} skipped
      </p>
    </li>
  );
}
