import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cursorAt } from '../../platform/trace';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { useScopedId } from '../../ui/ids';
import type { ProbabilityView } from '../probability/view';
import '../probability/probability.css';
import './statistics.css';
export default function StageFrame({ name, view, controls, board, reset, isCanonical, announcement, error }: {
  name: string; view: ProbabilityView; controls: ComponentChildren; board: ComponentChildren;
  reset(): void; isCanonical: boolean; announcement: string; error?: string;
}) {
  const uid = useScopedId(), [hydrated, setHydrated] = useState(false), [cursor, setCursor] = useState(cursorAt(view.trace.length));
  useEffect(() => setHydrated(true), []);
  useEffect(() => setCursor(cursorAt(view.trace.length)), [view.trace]);
  const title = `${name.endsWith('-worked') ? 'Worked example: ' : ''}${view.title}`;
  return <section class="stage stage-full statistics-stage probability-stage" data-stage={`statistics-${name}`} data-hydrated={hydrated} aria-labelledby={`${uid}-title`}>
    <header class="stage-head"><h2 id={`${uid}-title`}>{title}</h2><button type="button" class="button quiet" data-action="reset" disabled={isCanonical} onClick={reset}>Reset</button></header>
    <div class="stage-body"><div class="prob-board">{board}<p data-description class="prob-description">{view.description}</p></div>
      <Inspector rows={view.rows} label={`${title}: inspector`} legend="= exact finite-data/model quantity · ≈ binary64 approximation; empirical results describe this run" /></div>
    <div class="prob-controls">{controls}</div>{error && <p role="alert" class="prob-error">{error}</p>}
    <p class="prob-verdict" data-verdict>{view.verdict}</p>
    <div class="prob-formulas">{view.formulas.map((tex,i) => <FormulaScroll key={i} tex={tex} label={`${title}: equation ${i+1}`} />)}</div>
    <TraceStepper label={`${title}: mathematical replay`} frames={view.trace} cursor={cursorAt(view.trace.length,cursor.index)} onCursor={setCursor} autoplay describeFrame={f => f.state.title}
      renderFrame={f => <><p class="trace-label">{f.state.title}</p><p data-trace-detail>{f.state.detail}</p><FormulaScroll tex={f.state.formula} label="Replay equation" /></>} />
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </section>;
}
