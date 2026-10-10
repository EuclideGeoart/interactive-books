/**
 * ParameterInput — a numeric control driven by a `ParamSpec` (plan §6.5).
 *
 * Semantics: an ARIA spinbutton (text input + − / + buttons) so the same control works with a mouse, a
 * thumb, a keyboard and a screen reader. Typing is a draft: nothing reaches the model until it parses and is
 * inside the declared domain. Invalid text is REJECTED with a message and `aria-invalid` — never clamped
 * silently, never half-applied. Escape abandons the draft.
 */
import { useEffect, useState } from 'preact/hooks';
import { MINUS, formatGiven } from '../platform/numeric/format';
import { describeDomain, parseParam, stepValue, type Grid, type ParamSpec } from '../platform/params';
import { Formula } from './Formula';
import { useScopedId } from './ids';

export interface ParameterInputProps {
  spec: ParamSpec;
  value: number;
  grid: Grid;
  onCommit(next: number): void;
}

const asEditable = (n: number) => formatGiven(n).text.replace(MINUS, '-');

export function ParameterInput({ spec, value, grid, onCommit }: ParameterInputProps) {
  const id = useScopedId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The model is the authority: when it changes underneath a draft (a drag, a reset), the draft is stale.
  useEffect(() => { setDraft(null); setError(null); }, [value]);

  const commit = (raw: string) => {
    const parsed = parseParam(spec, raw);
    if (!parsed.ok) { setError(parsed.reason); return; }
    setError(null);
    setDraft(null);
    if (parsed.value !== value) onCommit(parsed.value);
  };
  const step = (direction: -1 | 1, coarse = false) => {
    setError(null);
    setDraft(null);
    const next = stepValue(value, direction, spec, grid, coarse);
    if (next !== value) onCommit(next);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    // Enter and blur both fire `change`, which is the single commit path.
    if (event.key === 'Escape') { setDraft(null); setError(null); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); step(event.key === 'ArrowUp' ? 1 : -1, event.shiftKey); }
  };

  return (
    <div class="param" data-param={spec.id}>
      <label class="param-label" for={id}>
        <span class="sym" aria-hidden="true"><Formula tex={spec.symbolTex} /></span>
        <span class="name">{spec.name}</span>
      </label>
      <div class="param-field">
        <button type="button" class="step" aria-label={`Decrease ${spec.name}`} onClick={() => step(-1)}><span aria-hidden="true">{MINUS}</span></button>
        <input
          id={id}
          type="text"
          inputmode="decimal"
          autocomplete="off"
          spellcheck={false}
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={spec.domain.min}
          aria-valuemax={spec.domain.max}
          aria-valuetext={formatGiven(value).spoken}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          value={draft ?? asEditable(value)}
          onInput={event => setDraft((event.currentTarget as HTMLInputElement).value)}
          onChange={event => commit((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" class="step" aria-label={`Increase ${spec.name}`} onClick={() => step(1)}><span aria-hidden="true">+</span></button>
      </div>
      <p class="param-hint" id={`${id}-hint`}>from {describeDomain(spec).replace(' to ', ' to ')}{spec.unit ? ` ${spec.unit}` : ''}{spec.maxDecimals === 0 ? ', whole numbers only' : spec.maxDecimals !== undefined ? `, up to ${spec.maxDecimals} decimal place${spec.maxDecimals === 1 ? '' : 's'}` : ''}</p>
      {error && <p class="param-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
