import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { isAnswered, isCorrect, LETTERS } from '@/lib/scoring';
import {
  answerIndices,
  answerLines,
  correctLines,
  usesOptionChoices,
  type CardStatus,
  type ReviseItem,
} from '@/lib/reviseAnswers';
import type { AnswerValue } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ReviseFlashCardProps {
  item: ReviseItem;
  position: number;
  total: number;
  isLast: boolean;
  onResult: (status: CardStatus) => void;
  onNext: () => void;
}

export function ReviseFlashCard({ item, position, total, isLast, onResult, onNext }: ReviseFlashCardProps) {
  const [answer, setAnswer] = useState<AnswerValue | undefined>(undefined);
  const [result, setResult] = useState<CardStatus | null>(null);

  const flipped = result !== null;
  const choiceMode = usesOptionChoices(item.questionType);
  const selectedIndices = answerIndices(answer);
  const canSubmit = Boolean(item.correctAnswer) && isAnswered(answer);

  const submit = () => {
    if (!canSubmit || !item.correctAnswer || answer === undefined) return;
    setResult(isCorrect(item.questionType, answer, item.correctAnswer, item.tolerance) ? 'correct' : 'wrong');
  };

  const showAnswer = () => setResult('wrong');

  const toggleChoice = (index: number) => {
    if (flipped) return;
    if (item.questionType === 'multiple') {
      const next = selectedIndices.includes(index)
        ? selectedIndices.filter((value) => value !== index)
        : [...selectedIndices, index].sort((a, b) => a - b);
      setAnswer(next.length > 0 ? next : undefined);
      return;
    }
    setAnswer(index);
  };

  const next = () => {
    if (result === null) return;
    onResult(result);
    onNext();
  };

  const banner =
    result === 'correct'
      ? { icon: CheckCircle2, text: 'Correct', className: 'text-success-700 dark:text-success-500' }
      : result === 'wrong' && isAnswered(answer)
        ? { icon: XCircle, text: 'Not quite', className: 'text-error-600 dark:text-error-500' }
        : { icon: Eye, text: 'Answer revealed', className: 'text-slate-600 dark:text-slate-300' };
  const BannerIcon = banner.icon;

  return (
    <div className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {position} / {total}
        </span>
        <Badge tone="primary">{item.testTitle}</Badge>
        <Badge tone="neutral">{item.section}</Badge>
      </div>

      <div className="grid [perspective:1400px]">
        <div
          className={cn(
            'col-start-1 row-start-1 grid transition-transform duration-500 ease-out [transform-style:preserve-3d]',
            flipped && '[transform:rotateY(180deg)]',
          )}
        >
          <section
            aria-hidden={flipped}
            className="surface col-start-1 row-start-1 flex flex-col p-6 [backface-visibility:hidden] sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">Question</p>
            <div className="mt-3 text-lg leading-relaxed text-slate-900 sm:text-xl dark:text-slate-100">
              <MathText text={item.text} />
            </div>

            {choiceMode ? (
              <div className="mt-6 space-y-2.5" role="group" aria-label="Answer options">
                {item.options.map((option, index) => {
                  const selected = selectedIndices.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleChoice(index)}
                      disabled={flipped}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-default',
                        selected
                          ? 'border-primary-600 bg-primary-50 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
                          : 'border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {LETTERS[index] ?? index + 1}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <MathText text={option} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6">
                <label htmlFor="revise-answer" className="label-base">Your answer</label>
                <input
                  id="revise-answer"
                  type="text"
                  inputMode={item.questionType === 'integer' || item.questionType === 'numerical' ? 'decimal' : 'text'}
                  className="input-base mt-1.5"
                  placeholder="Type your answer"
                  value={typeof answer === 'string' ? answer : ''}
                  disabled={flipped}
                  onChange={(event) => setAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submit();
                  }}
                />
              </div>
            )}

            <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-8">
              <Button variant="ghost" onClick={showAnswer}>Skip and show answer</Button>
              <Button onClick={submit} disabled={!canSubmit}>Submit answer</Button>
            </div>
          </section>

          <section
            aria-hidden={!flipped}
            className="surface col-start-1 row-start-1 flex flex-col p-6 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8"
          >
            <p className={cn('flex items-center gap-2 text-sm font-semibold', banner.className)}>
              <BannerIcon className="h-5 w-5 shrink-0" aria-hidden />
              {banner.text}
            </p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-accent-50 p-4 dark:bg-accent-900/30">
                <dt className="text-xs font-semibold text-accent-700 dark:text-accent-400">Correct answer</dt>
                <dd className="mt-1.5 space-y-1 text-slate-900 dark:text-slate-100">
                  {correctLines(item).map((line, index) => (
                    <div key={index}>
                      <MathText text={line} />
                    </div>
                  ))}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/70">
                <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">Your answer</dt>
                <dd className="mt-1.5 space-y-1 text-slate-800 dark:text-slate-200">
                  {answerLines(item, answer).map((line, index) => (
                    <div key={index}>
                      <MathText text={line} />
                    </div>
                  ))}
                </dd>
              </div>
            </dl>

            {item.explanation && (
              <div className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Explanation</p>
                <MathText text={item.explanation} />
              </div>
            )}

            <div className="mt-auto flex justify-end pt-8">
              <Button onClick={next} icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                {isLast ? 'See results' : 'Next card'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
