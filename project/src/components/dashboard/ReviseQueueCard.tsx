import { Link } from 'react-router-dom';
import { NotebookPen, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReviseQueueCardProps {
  count: number;
}

export function ReviseQueueCard({ count }: ReviseQueueCardProps) {
  return (
    <section className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
          <NotebookPen className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Revise queue</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {count > 0 ? 'Questions you missed and can practise again.' : 'No missed questions to revisit.'}
          </p>
        </div>
      </div>
      <Link to="/revise">
        <Button variant="outline" size="sm" icon={<Play className="h-4 w-4" aria-hidden />}>Start revising</Button>
      </Link>
    </section>
  );
}
