/**
 * InverseStage — running a machine backwards. The graph of f and the graph of its inverse are mirror images in the line y = x. The square has no
 * inverse on all of ℝ (x and −x give one output); restricted to x ≥ 0 it has one. One flat state {fn, x, restrict} → deriveInverse → every view;
 * the three curves are memoised on (fn, restrict) only.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveInverse, type FnId, type InverseDerived, type InverseState } from '../../math/functions/compose';
import { rationalForm } from '../../math/quantity/exactform';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { PlaneLabel } from '../../ui/plane/primitives';
import { FN_CHOICES, numText } from './format';
import {
  CANONICAL_INVERSE, INVERSE_FORMULA_LABELS, INVERSE_PRESETS, INVERSE_WINDOW, IX_SPEC, inverseCurves, inverseDescription, inverseFormulas, inverseIsCaution, inverseRows,
  inverseScene, inverseSpoken, inverseVerdict,
} from './inverse-lesson';
import { Pipeline } from './Pipeline';

const GRID: Grid = { kind: 'lattice', step: 0.5 };
type Allowed = 'all' | 'pos';
const ALLOWED_CHOICES: readonly { readonly id: Allowed; readonly label: string }[] = Object.freeze([
  { id: 'all', label: 'every real x' },
  { id: 'pos', label: 'only x ≥ 0' },
]);

function InverseStageInner() {
  const lesson = useLesson<InverseState, InverseDerived>(CANONICAL_INVERSE, deriveInverse);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curves = useMemo(() => inverseCurves(s.fn, s.restrict), [s.fn, s.restrict]);
  const scene = useMemo(() => inverseScene(d), [d]);
  const rows = useMemo(() => inverseRows(d), [d]);
  const formulas = useMemo(() => inverseFormulas(d), [d]);
  const announce = (next: InverseState) => setAnnouncement(prev => `${inverseSpoken(deriveInverse(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: InverseState) => { lesson.set(next); announce(next); };
  const caution = inverseIsCaution(d);
  const x = rationalForm(d.x).text;
  const y = d.inDomain ? numText(d.forward.output) : '';
  const forwardTags = useMemo(() => ['input x', ...d.forward.rows.map((_, i) => (i === d.forward.rows.length - 1 ? 'output y' : ''))], [d]);
  const backwardTags = useMemo(() => (d.backward ? ['input y', ...d.backward.rows.map((_, i) => (i === d.backward!.rows.length - 1 ? 'output x' : ''))] : []), [d]);
  const mirrorRole = d.hasInverse ? 'derived' : 'caution';

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="inverse" data-hydrated={hydrated} data-fn={s.fn} data-x={s.x} data-restrict={String(s.restrict)}
      data-has-inverse={String(d.hasInverse)} data-in-domain={String(d.inDomain)}
    >
      <header class="stage-head">
        <h3 id={headingId}>Running a machine backwards: <Formula tex="f^{-1}" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_INVERSE); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a machine</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {INVERSE_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.fn === s.fn && p.state.restrict === s.restrict && p.state.x === s.x} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={INVERSE_WINDOW} label="The graph of the function, the line y equals x, and the mirror image of the graph in that line" description={inverseDescription(d)}>
            <Curve lines={curves.diagonal} role="ink" dashed name="diagonal" />
            <Curve lines={curves.mirror} role={mirrorRole} dashed={!d.hasInverse} name="curve-mirror" />
            <Curve lines={curves.forward} role="primary" name="curve-forward" />
            {scene.twin && !scene.clamped && <PointMarker at={scene.twin} role="caution" filled radius={6.5} name="point-twin" />}
            {scene.p && !scene.clamped && <PointMarker at={scene.p} role="primary" filled radius={6.5} name="point" />}
            {scene.mirror && !scene.clamped && <PointMarker at={scene.mirror} role={mirrorRole} filled={false} radius={8} name="point-mirror" />}
            {scene.p && !scene.clamped && <PlaneLabel name="label-point" at={scene.p} dx={scene.p.x >= 0 ? -14 : 14} dy={scene.p.y >= 0 ? -16 : 18} anchor={scene.p.x >= 0 ? 'end' : 'start'} role="primary" math>{`(${x}, ${y})`}</PlaneLabel>}
            {scene.mirror && !scene.clamped && <PlaneLabel name="label-mirror" at={scene.mirror} dx={scene.mirror.x >= 0 ? 14 : -14} dy={scene.mirror.y >= 0 ? 18 : -16} anchor={scene.mirror.x >= 0 ? 'start' : 'end'} role={mirrorRole} math>{`(${y}, ${x})`}</PlaneLabel>}
            {!d.inDomain && <PlaneLabel name="label-outside" at={{ x: 0, y: 0 }} dx={0} dy={-18} role="caution" math>{`x = ${x} is outside the domain`}</PlaneLabel>}
          </CoordinatePlane>
          <p class="legend-line" aria-hidden="true">
            Solid curve: the function. Dashed line: y = x. {d.hasInverse ? 'Mirror curve: the inverse.' : 'Dashed mirror curve: not the graph of a function.'} A filled dot is (x, y); the hollow dot is its mirror image (y, x).
          </p>
          {scene.clamped && <p class="legend-line" data-offgraph>The point (x, y) lies outside this window; the numbers on the right still give it exactly.</p>}
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The output, whether an inverse exists, and the round trip" legend="= exact · ≈ rounded to 6 decimals · the inverse needs one input for every output" />
        </div>
      </div>
      <div class="pipelines">
        <div class="pipeline-block">
          <p class="pipeline-title">Forward: x to y</p>
          <Pipeline evaluation={d.forward} tags={forwardTags} label="The function, step by step" name="forward" />
        </div>
        <div class="pipeline-block">
          <p class="pipeline-title">Backward: y to x</p>
          {d.backward
            ? <Pipeline evaluation={d.backward} tags={backwardTags} label="The inverse, step by step" name="backward" />
            : <p class="pipeline-none" data-pipeline="backward-none">{d.inDomain ? 'No backward machine: two inputs share this output.' : 'No output, so nothing to run backwards.'}</p>}
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{inverseVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${INVERSE_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <SegmentedControl<FnId> legend="Function" name={`${headingId}-fn`} options={FN_CHOICES} value={s.fn} onChange={fn => update({ ...s, fn })} />
        {s.fn === 'sq' && (
          <SegmentedControl<Allowed> legend="Inputs allowed" name={`${headingId}-allowed`} options={ALLOWED_CHOICES} value={s.restrict ? 'pos' : 'all'} onChange={a => update({ ...s, restrict: a === 'pos' })} />
        )}
        <ParameterInput spec={IX_SPEC} value={s.x} grid={GRID} onCommit={xv => update({ ...s, x: xv })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function InverseStage() {
  return (
    <IdScope name={'inverse'}>
      <InverseStageInner />
    </IdScope>
  );
}
