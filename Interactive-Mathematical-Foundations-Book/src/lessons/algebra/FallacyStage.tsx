/**
 * FallacyStage — x(x − c) = m(x − c). Dividing both sides by (x − c) gives x = m and loses x = c, where both sides are 0. The left side is a
 * parabola, the right side a line; they cross at every solution. One flat state {c, m} → deriveFallacy → every view.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveFallacy, type FallacyDerived, type FallacyState } from '../../math/algebra/fallacy';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { Curve, PointMarker } from '../../ui/plane/Curve';
import { PlaneLabel } from '../../ui/plane/primitives';
import {
  CANONICAL_FALLACY, FALLACY_FORMULA_LABELS, FALLACY_PRESETS, FALLACY_WINDOW, FC_SPEC, FM_SPEC,
  fallacyCurves, fallacyDescription, fallacyFormulas, fallacyIsCaution, fallacyMarks, fallacyRows, fallacySpoken, fallacyText, fallacyVerdict,
} from './fallacy-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };

function FallacyStageInner() {
  const lesson = useLesson<FallacyState, FallacyDerived>(CANONICAL_FALLACY, deriveFallacy);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curves = useMemo(() => fallacyCurves(s.c, s.m), [s.c, s.m]);
  const marks = useMemo(() => fallacyMarks(d), [d]);
  const rows = useMemo(() => fallacyRows(d, s), [d, s]);
  const formulas = useMemo(() => fallacyFormulas(d), [d]);
  const announce = (next: FallacyState) => setAnnouncement(prev => `${fallacySpoken(deriveFallacy(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: FallacyState) => { lesson.set(next); announce(next); };
  const caution = fallacyIsCaution(d);

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="fallacy" data-hydrated={hydrated} data-c={s.c} data-m={s.m}
      data-solutions={d.solutions.length} data-lost={d.lost === null ? 'none' : String(d.c.num)}
    >
      <header class="stage-head">
        <h3 id={headingId}>Dividing by a factor that can be zero: <Formula tex="x(x-c)=m(x-c)" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_FALLACY); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try an equation</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {FALLACY_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.c === s.c && p.state.m === s.m} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={FALLACY_WINDOW} label="The left side as a parabola and the right side as a line" description={fallacyDescription(d)}>
            <Curve lines={curves.left} role="x" name="left-side" />
            <Curve lines={curves.right} role="y" name="right-side" width={2.5} />
            {marks.map((m, i) => (
              <g key={i}>
                <PointMarker at={m.at} role={m.lost ? 'caution' : 'ink'} filled name={m.lost ? 'solution-lost' : 'solution-kept'} radius={7} />
                <PlaneLabel name={`solution-label-${i + 1}`} at={m.at} dx={14} dy={-14} anchor="start" role={m.lost ? 'caution' : 'ink'} math>{m.lost ? 'lost' : 'kept'}</PlaneLabel>
              </g>
            ))}
          </CoordinatePlane>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The solutions, what the division concludes and what it loses" legend={`${fallacyText(d)}: both sides are equal at every solution`} />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{fallacyVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${FALLACY_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={FC_SPEC} value={s.c} grid={GRID} onCommit={c => update({ ...s, c })} />
        <ParameterInput spec={FM_SPEC} value={s.m} grid={GRID} onCommit={m => update({ ...s, m })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function FallacyStage() {
  return (
    <IdScope name={'fallacy'}>
      <FallacyStageInner />
    </IdScope>
  );
}
