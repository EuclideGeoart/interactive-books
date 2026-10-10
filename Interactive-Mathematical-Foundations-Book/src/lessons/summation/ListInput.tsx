/**
 * ListInput — the learner's own list a_1, …, a_8 as text. Typing is a draft: nothing reaches the model until the whole list parses
 * (whole numbers, short decimals, fractions). Invalid text is REJECTED with a message and `aria-invalid`; it is never repaired, truncated or
 * partly applied. Enter or leaving the box commits; Escape abandons the draft. Same contract as `ParameterInput`.
 */
import { useEffect, useState } from 'preact/hooks';
import { MAX_LIST } from '../../math/summation/sequences';
import { useScopedId } from '../../ui/ids';
import { parseList } from './sum-lesson';

export function ListInput({ value, onCommit }: { value: string; onCommit(next: string): void }) {
  const id = useScopedId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setDraft(null); setError(null); }, [value]);

  const commit = (raw: string) => {
    const parsed = parseList(raw);
    if (!parsed.ok) { setError(parsed.reason); return; }
    setError(null);
    setDraft(null);
    if (parsed.text !== value) onCommit(parsed.text);
  };
  return (
    <div class="param list-param" data-param="list">
      <label class="param-label" for={id}>
        <span class="sym" aria-hidden="true"><i>a</i><sub>1</sub>…</span>
        <span class="name">your list</span>
      </label>
      <div class="param-field">
        <input
          id={id}
          type="text"
          autocomplete="off"
          spellcheck={false}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          value={draft ?? value}
          onInput={event => setDraft((event.currentTarget as HTMLInputElement).value)}
          onChange={event => commit((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={(event: KeyboardEvent) => { if (event.key === 'Escape') { setDraft(null); setError(null); } }}
        />
      </div>
      <p class="param-hint" id={`${id}-hint`}>1 to {MAX_LIST} numbers separated by commas: whole numbers, decimals with up to 4 places, or fractions such as 1/2. The first entry is a_1.</p>
      {error && <p class="param-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
