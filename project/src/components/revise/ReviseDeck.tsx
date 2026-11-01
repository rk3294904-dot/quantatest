import { useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReviseFlashCard } from '@/components/revise/ReviseFlashCard';
import type { CardStatus, ReviseItem } from '@/lib/reviseAnswers';
import { cn } from '@/lib/utils';

interface ReviseDeckProps {
  items: ReviseItem[];
}

export function ReviseDeck({ items }: ReviseDeckProps) {
  const [round, setRound] = useState(1);
  const [queueIds, setQueueIds] = useState(() => items.map((item) => item.id));
  const [index, setIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({});

  const byId = new Map(items.map((item) => [item.id, item]));
  const queue = queueIds.map((id) => byId.get(id)).filter((item): item is ReviseItem => item !== undefined);
  const current = queue[index];
  const mastered = queue.filter((item) => statuses[item.id] === 'correct').length;
  const missed = queue.filter((item) => statuses[item.id] === 'wrong');

  const startRound = (ids: string[]) => {
    setRound((value) => value + 1);
    setQueueIds(ids);
    setIndex(0);
    setStatuses({});
  };

  if (!current) {
    const reviewedCount = queue.length - missed.length;
    return (
      <section className="surface animate-fade-up space-y-6 p-6 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
          <Trophy className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Round {round} complete</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            You got {reviewedCount} of {queue.length} right on the first pass. {missed.length > 0 ? `${missed.length} still need another look.` : 'Nothing left to review.'}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {missed.length > 0 && (
            <Button onClick={() => startRound(missed.map((item) => item.id))} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
              Retry {missed.length} missed
            </Button>
          )}
          <Button variant="outline" onClick={() => startRound(items.map((item) => item.id))}>
            Start over with all {items.length}
          </Button>
        </div>
      </section>
    );
  }

  const progress = (index / queue.length) * 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Round {round}</p>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-success-700 dark:text-success-500">Mastered {mastered}</span>
          <span className={cn(missed.length > 0 ? 'text-error-600 dark:text-error-500' : 'text-slate-500 dark:text-slate-400')}>
            To review {missed.length}
          </span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={queue.length}>
        <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <ReviseFlashCard
        key={`${round}-${current.id}`}
        item={current}
        position={index + 1}
        total={queue.length}
        isLast={index === queue.length - 1}
        onResult={(status) => setStatuses((prev) => ({ ...prev, [current.id]: status }))}
        onNext={() => setIndex((value) => value + 1)}
      />
    </div>
  );
}
