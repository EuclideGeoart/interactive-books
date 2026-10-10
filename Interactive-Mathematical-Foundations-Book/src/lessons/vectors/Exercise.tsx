/** Exercise — one graded question. The island receives only an id; the definition and grading live in exercises.ts. */
import { useEffect, useState } from 'preact/hooks';
import { IdScope, useScopedId } from '../../ui/ids';
import { exerciseById, type Result } from './exercises';

function ExerciseInner({ id }: { id: string }) {
  const exercise = exerciseById(id);
  const uid = useScopedId();
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!exercise) return null;
  const set = (key: string, value: string) => { setAnswer(prev => ({ ...prev, [key]: value })); setResult(null); };
  const submit = (event: Event) => { event.preventDefault(); const r = exercise.grade(answer); setResult(r); setAttempts(n => n + 1); };
  const reset = () => { setAnswer({}); setResult(null); setAttempts(0); setShowSolution(false); };
  return (
    <form class="exercise" onSubmit={submit} data-exercise={id} data-hydrated={hydrated} data-result={result ? (result.correct ? 'correct' : 'incorrect') : 'none'} aria-labelledby={`${uid}-t`}>
      <p class="exercise-kind">{exercise.kind}</p>
      <h3 id={`${uid}-t`}>{exercise.title}</h3>
      <p>{exercise.prompt}</p>
      {exercise.choices && (
        <fieldset>
          <legend class="sr-only">Choose one answer</legend>
          {exercise.choices.map(c => (
            <label class="choice" key={c.id}>
              <input type="radio" name={`${uid}-c`} value={c.id} checked={answer.choice === c.id} onChange={() => set('choice', c.id)} />
              <span>{c.label}</span>
            </label>
          ))}
        </fieldset>
      )}
      {exercise.fields && (
        <div class="fields">
          {exercise.fields.map(f => (
            <label key={f.id}>
              <span>{f.label}</span>
              <input type="text" inputmode="decimal" autocomplete="off" spellcheck={false} data-field={f.id} value={answer[f.id] ?? ''} onInput={e => set(f.id, (e.currentTarget as HTMLInputElement).value)} />
            </label>
          ))}
        </div>
      )}
      <div class="exercise-actions">
        <button type="submit" class="primary" data-action="check">Check</button>
        <button type="button" onClick={reset} data-action="reset-exercise">Reset</button>
        {attempts > 0 && !showSolution && <button type="button" onClick={() => setShowSolution(true)} data-action="show-solution">Show a worked solution</button>}
      </div>
      <div class="feedback" role="status" aria-live="polite" data-result={result ? (result.correct ? 'correct' : 'incorrect') : 'none'} hidden={!result && !showSolution}>
        {result && <p data-feedback><strong>{result.correct ? 'Correct. ' : 'Not yet. '}</strong>{result.message}</p>}
        {showSolution && <p class="solution" data-solution>{exercise.solution}</p>}
      </div>
    </form>
  );
}

export default function Exercise({ id }: { id: string }) {
  return (
    <IdScope name={`ex-${id}`}>
      <ExerciseInner id={id} />
    </IdScope>
  );
}
