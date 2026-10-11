import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { TraceStepper } from '../../ui/TraceStepper';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Arrow, Dot, PlaneLabel, Polygon, Segment } from '../../ui/plane/primitives';
import { cursorAt } from '../../platform/trace';
import type { ParamSpec } from '../../platform/params';
import type { WorldWindow } from '../../platform/geometry/viewport';
import { rtext, type CompletionDerived, type CompletionFrame } from './completion-view';
import type { TraceFrame } from '../../platform/trace';
import './completion.css';

function Replay({ frames, label = 'Live mathematical trace' }: { frames: readonly TraceFrame<CompletionFrame>[]; label?: string }) {
  const [cursor, setCursor] = useState(cursorAt(frames.length));
  return <TraceStepper label={label} frames={frames} cursor={cursor} onCursor={setCursor} autoplay
    describeFrame={frame => frame.state.detail} renderFrame={frame => <>
      <h3>{frame.state.title}</h3><p>{frame.state.detail}</p>
      {frame.state.matrix && <div class="row-matrix" role="region" aria-label={`${label}: exact matrix in this frame`} tabIndex={0}>
        <table><caption>Rows of the current mathematical state; ◆ marks a pivot</caption><tbody>
          {frame.state.matrix.values.map((values, i) => <tr key={i}><th scope="row">R{i + 1}</th>{values.map((value, j) =>
            <td key={j} class={j === frame.state.coefficientCols ? 'augmentation' : ''} data-pivot={frame.state.pivots?.[i] === j ? 'true' : undefined}>
              {frame.state.pivots?.[i] === j && <span aria-label="pivot">◆ </span>}{rtext(value)}
            </td>)}</tr>)}
        </tbody></table>
      </div>}
      <FormulaScroll tex={frame.state.formula} label="Current trace equations, scrollable" />
    </>} />;
}
interface Props<S extends object> {
  kind: string; title: string; canonical: S; derive: (state: S) => CompletionDerived;
  fields: (state: S) => readonly string[]; specs: Record<string, ParamSpec>;
  presets: readonly { id: string; label: string; state: S }[];
  extra?: (state: S, commit: (next: S) => void) => ComponentChildren;
}
function Inner<S extends object>(props: Props<S>) {
  const { kind, title, canonical, derive, fields, specs, presets, extra } = props;
  const lesson = useLesson(canonical, derive), { state, derived } = lesson;
  const id = useScopedId(), hint = useScopedId();
  const [hydrated, setHydrated] = useState(false), [announcement, setAnnouncement] = useState('');
  const [dragWindow, setDragWindow] = useState<WorldWindow | null>(null);
  useEffect(() => setHydrated(true), []);
  const announce = (next: S) => setAnnouncement(old => `${derive(next).verdict}${old.endsWith('​') ? '' : '​'}`);
  const commit = (next: S) => { lesson.set(next); announce(next); };
  return <section class="stage stage-full completion-stage" aria-labelledby={id} data-stage={`completion-${kind}`} data-hydrated={hydrated}
    data-state={JSON.stringify(state)} data-status={derived.status} data-rank={derived.rank} data-result-x={derived.result?.x} data-result-y={derived.result?.y}>
    <header class="stage-head"><h2 id={id}>{title}</h2><button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical} onClick={() => { lesson.reset(); announce(canonical); }}>Reset</button></header>
    <div class="presets" role="group" aria-label="Explore a configuration">{presets.map(preset => <button key={preset.id} type="button" data-preset={preset.id}
      aria-pressed={Object.entries(preset.state).every(([key, value]) => state[key as keyof S] === value)} onClick={() => commit(preset.state)}>{preset.label}</button>)}</div>
    {derived.scenes.length > 0 && <div class="stage-grid">
      <div class={`completion-scenes${derived.scenes.length > 1 ? ' multiple' : ''}`}>
        {derived.scenes.map((s, i) => <div class="stage-plane" key={s.title} data-scene={i} data-radius={s.window.xMax}><h3>{s.title}</h3>
          <CoordinatePlane window={dragWindow ?? s.window} label={s.title} description={s.description}>
            {s.polygons.map(p => <Polygon key={p.name} {...p} />)}
            {s.lines.map(line => <Segment key={line.name} {...line} />)}
            {s.arrows.map(a => <Arrow key={a.name} {...a} />)}<Dot at={{ x: 0, y: 0 }} />
            {s.arrows.filter(a=>a.from.x!==a.to.x||a.from.y!==a.to.y).map((a, j) => <PlaneLabel key={a.name} name={`label-${a.name}`} at={a.to} role={a.role}
              dx={a.labelDx??(a.to.x>=0?-12:12)} anchor={(a.labelDx??(a.to.x>=0?-12:12))<0?'end':'start'}
              dy={a.to.y>s.window.yMax*.7?22:a.to.y<s.window.yMin*.7?-22:j%2?22:-22}>{a.label}</PlaneLabel>)}
            {s.handles.map(h => <DragPoint key={h.id} role={h.role} value={h.at} label={`${h.label} (${h.at.x}, ${h.at.y})`} hintId={hint}
              xSpec={specs[h.xField]!} ySpec={specs[h.yField]!} grid={{ kind: 'lattice', step: 0.5 }}
              onChange={(at, source) => { if (source === 'pointer') setDragWindow(current => current ?? s.window); lesson.set({ ...state, [h.xField]: at.x + 0, [h.yField]: at.y + 0 }); }}
              onCommit={(at, source) => { if (source === 'pointer') setDragWindow(null); announce({ ...state, [h.xField]: at.x + 0, [h.yField]: at.y + 0 }); }} />)}
          </CoordinatePlane>
        </div>)}
      </div><Inspector rows={derived.rows} label="Mathematical quantities" legend="Exact values use =; numerical companions use ≈. Rank and zero decisions are exact." />
    </div>}
    {derived.scenes.length === 0 && <Inspector rows={derived.rows} label="Mathematical quantities" />}
    <p class="verdict" data-verdict>{derived.verdict}</p>
    <div class="formula-panel" role="group" aria-label="Live formulas">{derived.formulas.map((tex, i) => <FormulaScroll key={i} tex={tex} label={`Calculation ${i + 1}, scrollable`} />)}</div>
    {extra?.(state, commit)}
    <Replay key={JSON.stringify(state)} frames={derived.frames} />
    <div class="stage-controls">{fields(state).map(field => <ParameterInput key={field} spec={specs[field]!} value={state[field as keyof S] as number}
      grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [field]: value })} />)}</div>
    <span id={hint} hidden>Drag, or use arrow keys for steps of 0.5. Shift makes a larger step. Numeric fields control the same state.</span>
    <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
  </section>;
}
export default function CompletionStage<S extends object>(props: Props<S>) {
  return <IdScope name={`completion-${props.kind}`}><Inner {...props} /></IdScope>;
}

export function CompletionWorkedStage({ kind, frames }: { kind: string; frames: readonly TraceFrame<CompletionFrame>[] }) {
  return <IdScope name={`completion-worked-${kind}`}><Worked kind={kind} frames={frames} /></IdScope>;
}
function Worked({ kind, frames }: { kind: string; frames: readonly TraceFrame<CompletionFrame>[] }) {
  const id = useScopedId(), [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <section class="stage stage-full completion-stage" data-stage={`completion-worked-${kind}`} data-hydrated={hydrated} aria-labelledby={id}>
    <header class="stage-head"><h3 id={id}>Replay the worked derivation</h3></header><Replay frames={frames} label="Worked derivation trace" />
  </section>;
}
