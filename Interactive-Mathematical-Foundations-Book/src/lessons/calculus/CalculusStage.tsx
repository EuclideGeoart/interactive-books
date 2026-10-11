/**
 * The Part III stage: one canonical state, a pure `derive`, and views that only draw the derived structure (planes, inspector, live formulas,
 * verdict, replayable trace). Pointer, keyboard, preset, segmented and numeric controls all write the same state.
 */
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TraceStepper } from '../../ui/TraceStepper';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { Arrow, PlaneLabel, Polygon, Segment } from '../../ui/plane/primitives';
import { cursorAt, type TraceFrame } from '../../platform/trace';
import type { ParamSpec } from '../../platform/params';
import type { CalcChoice, CalcDerived, CalcFrame, CalcScene, CalcTable } from './calculus-view';
import './calculus.css';

export function TableView({ table, label }: { table: CalcTable; label: string }) {
  // The caption is ordinary text OUTSIDE the scroll region, so it wraps at the viewport width; the table keeps an accessible caption.
  return <><p class="calc-table-caption" aria-hidden="true">{table.caption}</p><div class="calc-table" role="region" aria-label={label} tabIndex={0}>
    <table><caption class="sr-only">{table.caption}</caption>
      <thead><tr>{table.head.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
      <tbody>{table.rows.map((cells, i) => <tr key={i}>{cells.map((c, j) => j === 0 ? <th scope="row" key={j}>{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div></>;
}

export function Replay({ frames, label = 'Live mathematical trace' }: { frames: readonly TraceFrame<CalcFrame>[]; label?: string }) {
  const [cursor, setCursor] = useState(cursorAt(frames.length));
  return <TraceStepper label={label} frames={frames} cursor={cursor} onCursor={setCursor} autoplay
    describeFrame={frame => frame.state.title}
    renderFrame={frame => <>
      <h3>{frame.state.title}</h3><p>{frame.state.detail}</p>
      <FormulaScroll tex={frame.state.formula} label={`${label}: equation of this step, scrollable`} />
      {frame.state.table && <TableView table={frame.state.table} label={`${label}: values of this step`} />}
    </>} />;
}

export function SceneView({ s, hint, specs, onMove, onCommit }: {
  s: CalcScene; hint: string; specs: Record<string, ParamSpec>;
  onMove(fields: Readonly<Record<string, number>>): void; onCommit(source: 'pointer' | 'keyboard'): void;
}) {
  return <div class="stage-plane" data-scene={s.id} data-window={JSON.stringify(s.window)}><h3>{s.title}</h3>
    <CoordinatePlane window={s.window} label={s.title} description={s.description}>
      {s.polygons.map(p => <Polygon key={p.name} name={p.name} corners={p.corners} role={p.role} />)}
      {s.curves.map(c => <Curve key={c.name} name={c.name} lines={c.lines} role={c.role} dashed={c.dashed} width={c.width} />)}
      {s.segments.map(l => <Segment key={l.name} name={l.name} from={l.from} to={l.to} role={l.role} dashed={l.dashed} width={l.width ?? 2.5} />)}
      {s.arrows.map(a => <Arrow key={a.name} name={a.name} from={a.from} to={a.to} role={a.role} width={3} />)}
      {s.markers.map(m => <PointMarker key={m.name} name={m.name} at={m.at} role={m.role} filled={m.filled} radius={m.radius} />)}
      {s.labels.map(l => <PlaneLabel key={l.name} name={l.name} at={l.at} role={l.role} dx={l.dx ?? 0} dy={l.dy ?? -16} anchor={l.anchor ?? 'middle'}>{l.text}</PlaneLabel>)}
      {s.handles.map(h => {
        const xSpec = h.spec ?? specs[h.xField]!;
        const ySpec: ParamSpec = h.ySpec ?? (h.yField ? specs[h.yField]! : { ...xSpec, id: `${h.id}-height`, domain: { min: h.at.y, max: h.at.y } });
        return <DragPoint key={h.id} role={h.role} value={h.at} label={h.label} hintId={hint} xSpec={xSpec} ySpec={ySpec} grid={{ kind: 'lattice', step: h.step }}
          onChange={(at) => onMove(h.write ? h.write(at.x + 0, at.y + 0) : { [h.xField]: at.x + 0, ...(h.yField ? { [h.yField]: at.y + 0 } : {}) })}
          onCommit={(_, source) => onCommit(source)} />;
      })}
    </CoordinatePlane>
  </div>;
}

interface Props<S extends object> {
  kind: string; title: string; canonical: S; derive: (state: S) => CalcDerived;
  specs: Record<string, ParamSpec>; fields: (state: S) => readonly string[];
  presets?: readonly { id: string; label: string; state: S }[];
  presetLegend?: string;
  choices?: (state: S) => readonly CalcChoice[];
  extra?: (state: S, derived: CalcDerived, commit: (next: S) => void) => ComponentChildren;
}
function Inner<S extends object>(props: Props<S>) {
  const { kind, title, canonical, derive, specs, fields, presets = [], presetLegend = 'Explore a configuration', choices, extra } = props;
  const lesson = useLesson(canonical, derive), { state, derived } = lesson;
  const id = useScopedId(), hint = useScopedId(), radio = useScopedId();
  const [hydrated, setHydrated] = useState(false), [announcement, setAnnouncement] = useState('');
  useEffect(() => setHydrated(true), []);
  // A zero-width toggle makes a repeated identical verdict still count as a new announcement.
  const announce = (next: S) => setAnnouncement(old => `${derive(next).verdict}${old.endsWith('​') ? '' : '​'}`);
  const commit = (next: S) => { lesson.set(next); announce(next); };
  const latest = { current: state };
  const move = (fields: Readonly<Record<string, number>>) => {
    const next = { ...latest.current, ...fields } as S;
    latest.current = next; lesson.set(next);
  };
  return <section class="stage stage-full calculus-stage" aria-labelledby={id} data-stage={`calculus-${kind}`} data-hydrated={hydrated}
    data-state={JSON.stringify(state)} data-status={derived.status} data-metrics={JSON.stringify(derived.metrics)}>
    <header class="stage-head"><h2 id={id}>{title}</h2><button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical} onClick={() => { lesson.reset(); announce(canonical); }}>Reset</button></header>
    {presets.length > 0 && <div class="presets" role="group" aria-label={presetLegend}>{presets.map(preset => <button key={preset.id} type="button" data-preset={preset.id}
      aria-pressed={Object.entries(preset.state).every(([key, value]) => state[key as keyof S] === value)} onClick={() => commit(preset.state)}>{preset.label}</button>)}</div>}
    {choices && choices(state).map(choice => <SegmentedControl key={choice.field} legend={choice.legend} name={`${radio}-${choice.field}`} options={choice.options}
      value={String(state[choice.field as keyof S])} onChange={value => commit({ ...state, [choice.field]: value })} />)}
    <div class="stage-grid">
      <div class={`calc-scenes${derived.scenes.length > 1 ? ' multiple' : ''}`}>
        {derived.scenes.map(s => <SceneView key={s.id} s={s} hint={hint} specs={specs} onMove={move} onCommit={() => announce(latest.current)} />)}
      </div>
      <Inspector rows={derived.rows} label="Mathematical quantities" legend="Exact values use =; binary64 approximations use ≈. Undefined values state their reason." />
    </div>
    <p class="verdict" data-verdict data-agree={derived.caution ? 'false' : 'true'}>{derived.caution && <span class="verdict-cue">Exceptional case: </span>}{derived.verdict}</p>
    <div class="formula-panel" role="group" aria-label="Live formulas">{derived.formulas.map((tex, i) => <FormulaScroll key={i} tex={tex} label={`Calculation ${i + 1}, scrollable`} />)}</div>
    {derived.table && <TableView table={derived.table} label="Live table of values" />}
    {extra?.(state, derived, commit)}
    <Replay key={JSON.stringify(state)} frames={derived.frames} />
    <div class="stage-controls">{fields(state).map(field => <ParameterInput key={field} spec={specs[field]!} value={state[field as keyof S] as number}
      grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [field]: value })} />)}</div>
    <span id={hint} hidden>{derived.hint}</span>
    <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
  </section>;
}
export default function CalculusStage<S extends object>(props: Props<S>) {
  return <IdScope name={`calculus-${props.kind}`}><Inner {...props} /></IdScope>;
}

export function CalculusWorkedStage({ kind, frames, title = 'Replay the worked derivation' }: { kind: string; frames: readonly TraceFrame<CalcFrame>[]; title?: string }) {
  return <IdScope name={`calculus-worked-${kind}`}><Worked kind={kind} frames={frames} title={title} /></IdScope>;
}
function Worked({ kind, frames, title }: { kind: string; frames: readonly TraceFrame<CalcFrame>[]; title: string }) {
  const id = useScopedId(), [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <section class="stage stage-full calculus-stage" data-stage={`calculus-worked-${kind}`} data-hydrated={hydrated} aria-labelledby={id}>
    <header class="stage-head"><h3 id={id}>{title}</h3></header><Replay frames={frames} label="Worked derivation trace" />
  </section>;
}
