import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Layers, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listUserAttempts } from '@/services/attemptService';
import { accuracyTrend, aggregateBreakdown, type BreakdownRow, type TrendPoint } from '@/lib/topicStats';
import { cn, percent } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';
import {
  BreakdownItem,
  FocusList,
  MIN_ANSWERS_FOR_RANKING,
  RevisePrompt,
  StatTile,
  TREND_WINDOW,
  TrendChart,
} from '@/components/weak-areas/WeakAreaWidgets';

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
        <Link to="/revise" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">Open Quanta Revise</Button>
        </Link>
      }
    />
  );

  if (attemptsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
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
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:space-y-8 sm:px-6 sm:py-14">
      {header}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        <StatTile label="Overall accuracy" value={`${percent(totals.correct, answered)}%`} hint={`${answered} answered`} />
        <StatTile label="Tests submitted" value={String(submitted.length)} hint="From your history" />
        <StatTile label="Correct answers" value={String(totals.correct)} hint={`${totals.wrong} wrong`} />
        <StatTile label="Skip rate" value={`${percent(totals.skipped, seen)}%`} hint={`${totals.skipped} left blank`} />
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Accuracy trend</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your last {Math.min(trend.length, 12)} tests, oldest on the left.</p>
          </div>
          {delta !== null && (
            <Badge tone={delta >= 0 ? 'success' : 'error'} className="self-start">
              {delta >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="mr-1 h-3.5 w-3.5" aria-hidden />}
              {delta >= 0 ? '+' : ''}{delta} pts vs previous {TREND_WINDOW}
            </Badge>
          )}
        </div>
        <TrendChart points={trend.slice(-12)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px] lg:gap-6">
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Breakdown type" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:inline-flex dark:bg-slate-800">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === option.value}
                  onClick={() => setScope(option.value)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
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
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-600 sm:flex-row sm:items-center sm:gap-2 dark:text-slate-400">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="input-base py-2 sm:w-auto"
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
            <ul className="mt-5 space-y-3">
              {rows.map((row) => (
                <BreakdownItem key={row.name} row={row} />
              ))}
            </ul>
          )}
        </div>

        <aside className="surface order-first h-fit p-5 sm:p-6 lg:sticky lg:top-24 lg:order-none">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Focus next</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Your three lowest-accuracy {scope === 'topicStats' ? 'topics' : 'sections'} with at least {MIN_ANSWERS_FOR_RANKING} answers.
          </p>
          <FocusList rows={focus} />
          <RevisePrompt />
        </aside>
      </section>
    </div>
  );
}
