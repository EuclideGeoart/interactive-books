import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveLesson, CANONICAL, fields, presets, specs, TITLES, type Chapter, type State } from './chapter-lesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { Arc, Arrow, Dot, PlaneLabel, Polygon, RightAngle, Segment } from '../../ui/plane/primitives';
import type { Point } from '../../platform/geometry/viewport';

function Inner({ chapter }: { chapter: Chapter }) {
  const derive = useMemo(() => (s: State) => deriveLesson(chapter, s), [chapter]);
  const lesson = useLesson(CANONICAL[chapter], derive), s = lesson.state, d = lesson.derived;
  const spec = useMemo(() => specs(chapter), [chapter]);
  const [hydrated, setHydrated] = useState(false), [announcement, setAnnouncement] = useState('');
  const [last, setLast] = useState<'u' | 'v' | 'p'>('v');
  const id = useScopedId(), hint = useScopedId();
  useEffect(() => setHydrated(true), []);
  const grid = { kind: 'lattice', step: 0.5 } as const;
  const announce = (next: State) => {
    const value = derive(next);
    setAnnouncement(old => `${value.rows.map(r => `${r.name}: ${r.description.spoken}`).join('. ')}. ${value.verdict}${old.endsWith('​') ? '' : '​'}`);
  };
  const commit = (next: State) => { lesson.set(next); announce(next); };
  const move = (prefix: 'u' | 'v' | 'p', at: Point): State => ({ ...s, [`${prefix}x`]: at.x + 0, [`${prefix}y`]: at.y + 0 });
  const scene = d.scene;
  return (
    <section class="stage stage-full" aria-labelledby={id} data-stage={`la-${chapter}`} data-hydrated={hydrated}
      data-ux={s.ux} data-uy={s.uy} data-vx={s.vx} data-vy={s.vy} data-a={s.a} data-b={s.b} data-px={s.px} data-py={s.py}
      data-result-x={d.result?.x} data-result-y={d.result?.y} data-rank={d.rank} data-radius={scene.window.xMax}>
      <header class="stage-head">
        <h3 id={id}>{TITLES[chapter]}</h3>
        <button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical} onClick={() => { lesson.reset(); setLast('v'); announce(CANONICAL[chapter]); }}>Reset</button>
      </header>
      <div class="presets" role="group" aria-label="Explore a configuration">
        {presets(chapter).map(p => <button key={p.id} type="button" data-preset={p.id} aria-pressed={fields(chapter).every(f => p.state[f] === s[f])} onClick={() => commit(p.state)}>{p.label}</button>)}
        {chapter === 'dot' && <button type="button" data-action="rotate" onClick={() => commit({ ...s, vx: -s.vy + 0, vy: s.vx })}>Turn v by π/2</button>}
        {chapter === 'addition' && <button type="button" data-action="swap" onClick={() => commit({ ...s, ux: s.vx, uy: s.vy, vx: s.ux, vy: s.uy })}>Swap the two moves</button>}
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={scene.window} label={TITLES[chapter]} description={d.verdict}>
            {scene.polygons.map(p => <Polygon key={p.name} {...p} />)}
            {scene.lines.map(l => <Segment key={l.name} {...l} width={l.dashed ? 1.5 : 3} />)}
            {scene.arrows.map(a => <Arrow key={a.name} {...a} width={a.role === 'primary' ? 4.5 : 3} />)}
            {scene.arc && <Arc centre={{ x: 0, y: 0 }} radiusPx={38} from={scene.arc.from} to={scene.arc.to} role="derived" name="angle" />}
            {scene.rightAngle && <RightAngle {...scene.rightAngle} />}
            <Dot at={{ x: 0, y: 0 }} />
            {scene.arrows.filter(a => a.from.x !== a.to.x || a.from.y !== a.to.y).map((a, i) => (
              <PlaneLabel key={a.name} name={`label-${a.name}`} at={{ x: (a.from.x + a.to.x) / 2, y: (a.from.y + a.to.y) / 2 }} dy={i % 2 ? 16 : -16} role={a.role} math>{a.label}</PlaneLabel>
            ))}
            {scene.handles.map(h => <g key={h.prefix} class={h.prefix === last ? undefined : 'behind'}>
              <DragPoint role={h.role} value={h.at} xSpec={spec[`${h.prefix}x`]} ySpec={spec[`${h.prefix}y`]} grid={grid}
                label={`${h.prefix === 'p' ? 'target p' : `vector ${h.prefix}`} (${s[`${h.prefix}x`]}, ${s[`${h.prefix}y`]})`} hintId={hint}
                onChange={at => { lesson.set(move(h.prefix, at)); setLast(h.prefix); }} onCommit={at => announce(move(h.prefix, at))} />
            </g>)}
          </CoordinatePlane>
          <span id={hint} hidden>Drag this tip, or use arrow keys to move by 0.5. Hold Shift for a larger step. The numeric fields provide the same controls.</span>
        </div>
        <div class="stage-readout"><Inspector rows={d.rows} label="Mathematical quantities" legend="Exact expressions use =. Rounded computations use ≈. All arrows use these same quantities." /></div>
      </div>
      <p class="verdict" data-verdict>{d.verdict}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {d.formulas.map((tex, i) => <FormulaScroll key={i} tex={tex} label={`Calculation ${i + 1}, scrollable`} />)}
      </div>
      <div class="stage-controls">
        {fields(chapter).map(f => <ParameterInput key={f} spec={spec[f]} value={s[f]} grid={{ kind: 'free' }} onCommit={n => commit({ ...s, [f]: n })} />)}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function LinearStage({ chapter }: { chapter: Chapter }) {
  return <IdScope name={`la-${chapter}`}><Inner chapter={chapter} /></IdScope>;
}
