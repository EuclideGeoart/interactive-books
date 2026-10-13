import { useLayoutEffect, useState } from 'preact/hooks';

interface Props { label: string; value: number; min: number; max: number; step?: number; onCommit(value: number): void }
export default function NumberField({ label, value, min, max, step = .1, onCommit }: Props) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  useLayoutEffect(() => { setDraft(String(value)); setError(''); }, [value]);
  function commit(raw: string) {
    const next = Number(raw);
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) || !Number.isFinite(next) || next < min || next > max) {
      setError(`Enter ${label.toLowerCase()} between ${min} and ${max}.`); return;
    }
    try { if (next + 0 !== value) onCommit(next + 0); setDraft(String(next + 0)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'This value cannot be used.'); }
  }
  return <label class="number-field"><span>{label}</span><input type="text" inputMode="decimal" value={draft} aria-invalid={!!error}
    onInput={event => setDraft(event.currentTarget.value)} onBlur={() => commit(draft)}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); commit(draft); }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault(); commit(String(Math.min(max, Math.max(min, value + (event.key === 'ArrowUp' ? 1 : -1) * step * (event.shiftKey ? 5 : 1)))));
      }
    }} /><small>{error || `${min} to ${max} · Enter to apply`}</small>{error && <span class="sr-only" role="alert">{error}</span>}</label>;
}
