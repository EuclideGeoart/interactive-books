import { useState } from 'preact/hooks';
interface Choice { label: string; correct: boolean; feedback: string }
export default function ChoiceExercise({ id, prompt, choices }: { id: string; prompt: string; choices: readonly Choice[] }) {
  const [selected, select] = useState<number>();
  const [checked, check] = useState(false);
  const answer = selected === undefined ? undefined : choices[selected];
  return <form class="exercise" data-exercise={id} onSubmit={event => { event.preventDefault(); check(true); }}>
    <fieldset><legend>{prompt}</legend>{choices.map((choice, index) => <label><input type="radio" name={id} checked={selected === index} onChange={() => { select(index); check(false); }} required />{choice.label}</label>)}</fieldset>
    <button type="submit">Check answer</button>{checked && <p role="status">{answer?.correct ? 'Correct. ' : 'Try again. '}{answer?.feedback}</p>}
  </form>;
}
