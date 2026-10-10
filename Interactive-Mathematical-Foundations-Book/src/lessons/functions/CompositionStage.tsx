/**
 * CompositionStage — wiring two machines one after the other, in both orders. Pick f and g and an input x; f ∘ g sends x through g first, g ∘ f through f
 * first. The graph shows both composites, the pipelines show every value, and a number line shows the domain of each composite. One flat state
 * {f, g, x} → deriveComposition → every view; both curves are memoised on (f, g) only.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveComposition, type CompositionDerived, type CompositionState, type FnId } from '../../math/functions/compose';
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
import {
  CANONICAL_COMPOSITION, COMPOSITION_FORMULA_LABELS, COMPOSITION_PRESETS, COMPOSITION_WINDOW, CX_SPEC, compositionCurves, compositionDescription, compositionFormulas,
  compositionIsCaution, compositionRows, compositionScene, compositionSpoken, compositionVerdict, domainLineDescription, tagsFor,
} from './composition-lesson';
import { FN_CHOICES, setText } from './format';
import { Pipeline } from './Pipeline';
import { SetLine } from './SetLine';

const GRID: Grid = { kind: 'lattice', step: 0.5 };

function CompositionStageInner() {
  const lesson = useLesson<CompositionState, CompositionDerived>(CANONICAL_COMPOSITION, deriveComposition);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curves = useMemo(() => compositionCurves(s.f, s.g), [s.f, s.g]);
  const scene = useMemo(() => compositionScene(d), [d]);
  const rows = useMemo(() => compositionRows(d), [d]);
  const formulas = useMemo(() => compositionFormulas(d), [d]);
  const announce = (next: CompositionState) => setAnnouncement(prev => `${compositionSpoken(deriveComposition(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: CompositionState) => { lesson.set(next); announce(next); };
  const caution = compositionIsCaution(d);
  const x = rationalForm(d.x).text;
  const tagsFg = useMemo(() => tagsFor(s.f, s.g, 'f', 'g'), [s.f, s.g]);
  const tagsGf = useMemo(() => tagsFor(s.g, s.f, 'g', 'f'), [s.f, s.g]);

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="composition" data-hydrated={hydrated} data-f={s.f} data-g={s.g} data-x={s.x}
      data-fg-defined={String(d.fgDefined)} data-gf-defined={String(d.gfDefined)} data-same={String(d.sameValue)}
    >
      <header class="stage-head">
        <h3 id={headingId}>Two machines in a row: <Formula tex="f\circ g" /> and <Formula tex="g\circ f" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_COMPOSITION); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a pair</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {COMPOSITION_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.f === s.f && p.state.g === s.g && p.state.x === s.x} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={COMPOSITION_WINDOW} label="The graphs of f after g and g after f, with the value of each at the chosen input" description={compositionDescription(d)}>
            <Curve lines={curves.gf} role="y" dashed name="curve-gf" />
            <Curve lines={curves.fg} role="primary" name="curve-fg" />
            {scene.fg && !scene.fgClamped && <PointMarker at={scene.fg} role="primary" filled radius={6.5} name="point-fg" />}
            {scene.gf && !scene.gfClamped && <PointMarker at={scene.gf} role="y" filled={false} radius={8} name="point-gf" />}
            {scene.fg && !scene.fgClamped && <PlaneLabel name="label-fg" at={scene.fg} dx={scene.x >= 0 ? -14 : 14} dy={scene.fg.y >= 0 ? -16 : 18} anchor={scene.x >= 0 ? 'end' : 'start'} role="primary" math>f∘g</PlaneLabel>}
            {scene.gf && !scene.gfClamped && <PlaneLabel name="label-gf" at={scene.gf} dx={scene.x >= 0 ? 14 : -14} dy={scene.gf.y >= 0 ? 18 : -16} anchor={scene.x >= 0 ? 'start' : 'end'} role="y" math>g∘f</PlaneLabel>}
            {(!scene.fg || !scene.gf) && <PlaneLabel name="label-refused" at={{ x: -5.8, y: -5.2 }} anchor="start" role="caution">{`${!scene.fg ? 'f∘g' : ''}${!scene.fg && !scene.gf ? ' and ' : ''}${!scene.gf ? 'g∘f' : ''}: no value at x = ${x}`}</PlaneLabel>}
          </CoordinatePlane>
          <p class="legend-line" aria-hidden="true">Solid curve with a filled dot: f ∘ g. Dashed curve with a hollow dot: g ∘ f.</p>
          {(scene.fgClamped || scene.gfClamped) && (
            <p class="legend-line" data-offgraph>
              {scene.fgClamped && scene.gfClamped ? 'Both heights are' : `The height of ${scene.fgClamped ? 'f ∘ g' : 'g ∘ f'} is`} beyond the top or bottom of this graph, so no dot is drawn; the numbers on the right give it exactly.
            </p>
          )}
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="Both orders at this input, and the domain of each composite" legend="= exact · ≈ rounded to 6 decimals · f ∘ g means g first, then f" />
        </div>
      </div>
      <div class="pipelines">
        <div class="pipeline-block">
          <p class="pipeline-title">f ∘ g: g first, then f</p>
          <Pipeline evaluation={d.fg} tags={tagsFg} label="f after g, step by step" name="fg" />
        </div>
        <div class="pipeline-block">
          <p class="pipeline-title">g ∘ f: f first, then g</p>
          <Pipeline evaluation={d.gf} tags={tagsGf} label="g after f, step by step" name="gf" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{compositionVerdict(d)}</p>
      <div class="setlines">
        <div class="setline-block">
          <p class="setline-title">Domain of f ∘ g: <span data-domain="fg">{setText(d.fgDomain)}</span></p>
          <SetLine set={d.fgDomain} role="primary" label={domainLineDescription('The composite f after g', d.fgDomain)} name="fg" />
        </div>
        <div class="setline-block">
          <p class="setline-title">Domain of g ∘ f: <span data-domain="gf">{setText(d.gfDomain)}</span></p>
          <SetLine set={d.gfDomain} role="y" label={domainLineDescription('The composite g after f', d.gfDomain)} name="gf" />
        </div>
      </div>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${COMPOSITION_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <SegmentedControl<FnId> legend="f is" name={`${headingId}-f`} options={FN_CHOICES} value={s.f} onChange={f => update({ ...s, f })} />
        <SegmentedControl<FnId> legend="g is" name={`${headingId}-g`} options={FN_CHOICES} value={s.g} onChange={g => update({ ...s, g })} />
        <ParameterInput spec={CX_SPEC} value={s.x} grid={GRID} onCommit={xv => update({ ...s, x: xv })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function CompositionStage() {
  return (
    <IdScope name={'composition'}>
      <CompositionStageInner />
    </IdScope>
  );
}
