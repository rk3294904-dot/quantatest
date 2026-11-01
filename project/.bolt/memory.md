# Project memory

## Product intent & audience

- **QuantaPrep**: An educational quiz/exam platform supporting multiple question types
- Audience: students taking quizzes, plus admins managing question banks
- Six question types supported: multiple-choice (single), multiple-choice (multiple), integer, numerical, true/false, fill-in-the-blank
- Admin features: question CRUD, bulk CSV upload with preview, answer key management

## Brand personality & voice

- Clean, production-quality educational tool; functional and polished

## Visual design & UX direction

- Math rendering via KaTeX throughout question/answer displays
- Lucide React for icons
- Tailwind CSS for styling; JSX with React hooks
- Results review section: type-specific layouts — multiple-choice shows colored option list (green=correct, red=wrong pick); other types show "Your answer" vs "Correct answer" text comparison
- Question type badges displayed on each question card in both student results and admin lists
- Correct-answer badges format per type: letters for single-choice, comma-separated for multiple, slash-separated for fill_blank
- Admin bulk upload preview table includes a Type column
- All pages must be production-worthy and non-cookie-cutter (per authoritative prompt)

## Decisions, constraints & rationale

- `QuestionEntry` interface has only `{ data: QuestionInput; order: number }` — no `correctOption` field (removed in prior refactor)
- `writeQuestionBatch` accepts `QuestionEntry[]` (data + order format only)
- `ImportRowResult.entry` type is `Omit<QuestionEntry, 'order'> | null` = `{ data: QuestionInput } | null`
- Spreading `{ ...row.entry, order: 0 }` yields valid `QuestionEntry`
- Scoring helpers are exported for reuse by ResultPage
- Build passes with zero errors after all changes
- No UI packages beyond Tailwind, lucide-react, and existing KaTeX

## Open questions & assumptions

- Admin page contents were not directly available; updated based on inferred type signatures and interface contracts
- CSV template format and column list for bulk upload assumed to be documented in the template description
- No state management library mentioned; assuming local React state / context as needed