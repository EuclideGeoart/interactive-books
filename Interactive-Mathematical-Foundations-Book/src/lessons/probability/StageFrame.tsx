import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cursorAt } from '../../platform/trace';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { useScopedId } from '../../ui/ids';
import type { MassItem, ProbabilityView } from './view';
import './probability.css';

export function MassBars({ items, label }: { items: readonly MassItem[]; label: string }) {
  return <div class="prob-masses" role="group" aria-label={label}>{items.map((item, i) => <div class={`prob-mass role-${item.role}`} key={i} data-mass={item.label} data-fraction={`${item.mass.num}/${item.mass.den}`}>
    <div class="prob-mass-label"><span>{item.label}</span><strong>= {item.text}</strong></div>
    <div class="prob-track" aria-hidden="true"><span style={{ width: `${item.width}%` }} /></div>
  </div>)}</div>;
}

export default function StageFrame({ name, view, controls, board, reset, isCanonical, announcement, error }: {
  name: string; view: ProbabilityView; controls: ComponentChildren; board: ComponentChildren;
  reset(): void; isCanonical: boolean; announcement: string; error?: string;
}) {
  const uid = useScopedId();
  const [hydrated, setHydrated] = useState(false), [cursor, setCursor] = useState(cursorAt(view.trace.length));
  useEffect(() => setHydrated(true), []);
  useEffect(() => setCursor(cursorAt(view.trace.length)), [view.trace]);
  const current = cursorAt(view.trace.length, cursor.index);
  const title = `${name.endsWith('-worked') ? 'Worked example: ' : ''}${view.title}`;
  return <section class="stage stage-full probability-stage" data-stage={`probability-${name}`} data-hydrated={hydrated} aria-labelledby={`${uid}-title`}>
    <header class="stage-head"><h2 id={`${uid}-title`}>{title}</h2><button type="button" class="button quiet" data-action="reset" disabled={isCanonical} onClick={reset}>Reset</button></header>
    <div class="stage-body"><div class="prob-board" role="group" aria-label={`${title}: probability model`}>
      {board}<p class="prob-description" data-description>{view.description}</p>
    </div><Inspector rows={view.rows} label={`${title}: inspector`} legend="= exact model quantity · ≈ numerical companion or observed estimate" /></div>
    <div class="prob-controls">{controls}</div>
    {error && <p class="prob-error" role="alert">{error}</p>}
    <div class="prob-verdict" data-verdict>{view.verdict}</div>
    <div class="prob-formulas">{view.formulas.map((formula, i) => <FormulaScroll tex={formula} key={i} label={`${title}: equation ${i + 1}`} />)}</div>
    <TraceStepper label={`${title}: mathematical replay`} frames={view.trace} cursor={current} onCursor={setCursor} autoplay
      describeFrame={frame => frame.state.title}
      renderFrame={frame => <><p class="trace-label">{frame.state.title}</p><p data-trace-detail>{frame.state.detail}</p>
        <FormulaScroll tex={frame.state.formula} label={`${title}: replay equation`} />
        {frame.state.masses && <MassBars items={frame.state.masses} label="Mass in this immutable replay state" />}</>} />
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </section>;
}
