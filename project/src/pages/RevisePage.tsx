import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listUserAttempts } from '@/services/attemptService';
import { getAnswerKeys, listQuestions } from '@/services/questionService';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';
import { ReviseDeck } from '@/components/revise/ReviseDeck';
import type { ReviseItem } from '@/lib/reviseAnswers';
import type { AnswerValue } from '@/lib/types';

interface WrongGroup {
  title: string;
  answers: Record<string, AnswerValue>;
  ids: string[];
}

async function loadReviseItems(wrongByTest: Record<string, WrongGroup>): Promise<ReviseItem[]> {
  const groups = await Promise.all(
    Object.entries(wrongByTest).map(async ([testId, group]) => {
      const [questions, keys] = await Promise.all([
        listQuestions(testId),
        getAnswerKeys(testId).catch(() => ({} as Record<string, string>)),
      ]);
      const wanted = new Set(group.ids);
      return questions
        .filter((q) => wanted.has(q.id))
        .map<ReviseItem>((q) => ({
          id: q.id,
          testId,
          testTitle: group.title,
          text: q.text,
          options: q.options,
          explanation: q.explanation,
          section: q.section,
          questionType: q.questionType,
          tolerance: q.tolerance,
          correctAnswer: keys[q.id] ?? q.correctAnswer,
          userAnswer: group.answers[q.id],
        }));
    }),
  );
  return groups.flat();
}

export function RevisePage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';

  const attemptsQuery = useQuery({
    queryKey: ['attempts', uid],
    queryFn: () => listUserAttempts(uid),
    enabled: Boolean(uid),
  });

  const submitted = (attemptsQuery.data ?? []).filter((a) => a.status === 'submitted' && a.wrongQuestionIds.length > 0);
  const wrongByTest: Record<string, WrongGroup> = {};
  for (const attempt of submitted) {
    const group = wrongByTest[attempt.testId] ?? { title: attempt.testTitle, answers: {}, ids: [] };
    group.answers = { ...attempt.answers, ...group.answers };
    group.ids = Array.from(new Set([...group.ids, ...attempt.wrongQuestionIds]));
    wrongByTest[attempt.testId] = group;
  }
  const reviseKey = Object.entries(wrongByTest)
    .map(([testId, group]) => `${testId}:${group.ids.join(',')}`)
    .join('|');

  const reviseQuery = useQuery({
    queryKey: ['revise', uid, reviseKey],
    queryFn: () => loadReviseItems(wrongByTest),
    enabled: Boolean(uid) && attemptsQuery.isSuccess && submitted.length > 0,
  });

  const header = (
    <PageHeader
      eyebrow="Quanta Revise"
      title="Revisit what you got wrong"
      description="Flip through every question you missed, answer it again, and retry the ones that still trip you up."
      actions={
        <Link to="/dashboard">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      }
    />
  );

  if (attemptsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        {header}
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (attemptsQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8"><ErrorState onRetry={() => void attemptsQuery.refetch()} /></div>
      </div>
    );
  }
  if (submitted.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8">
          <EmptyState
            icon={Zap}
            title="Nothing to revise yet"
            description="Once you submit a test with wrong answers, they will appear here."
            action={<Link to="/categories"><Button>Take a test</Button></Link>}
          />
        </div>
      </div>
    );
  }

  const items = reviseQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      {header}
      {reviseQuery.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-64" /></div>
      ) : reviseQuery.isError ? (
        <ErrorState message="We could not load your revision questions." onRetry={() => void reviseQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No wrong answers to revise" description="You have no incorrect responses in your submitted tests." />
      ) : (
        <ReviseDeck key={reviseKey} items={items} />
      )}
    </div>
  );
}
