/**
 * ExtraneousStage — √(x + p) = x + q. Squaring both sides is not an equivalence: it also admits the roots of −√(x + p) = x + q. The solid curve
 * is y = √(x + p), the dashed curve is y = −√(x + p), the line is y = x + q; every root of the squared equation sits on the line, on one branch
 * or the other. One flat state {p, q} → deriveExtraneous → every view; the curves are memoised on (p, q) only.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveExtraneous, type ExtraneousDerived, type ExtraneousState } from '../../math/algebra/extraneous';
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
  CANONICAL_EXTRANEOUS, EP_SPEC, EQ_SPEC, EXTRANEOUS_FORMULA_LABELS, EXTRANEOUS_PRESETS, EXTRANEOUS_WINDOW,
  extraneousCurves, extraneousDescription, extraneousFormulas, extraneousIsCaution, extraneousMarks, extraneousRows, extraneousSpoken, extraneousVerdict,
} from './extraneous-lesson';

const GRID: Grid = { kind: 'lattice', step: 1 };

function ExtraneousStageInner() {
  const lesson = useLesson<ExtraneousState, ExtraneousDerived>(CANONICAL_EXTRANEOUS, deriveExtraneous);
  const s = lesson.state;
  const d = lesson.derived;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const curves = useMemo(() => extraneousCurves(s.p, s.q), [s.p, s.q]);
  const marks = useMemo(() => extraneousMarks(d), [d]);
  const rows = useMemo(() => extraneousRows(d, s), [d, s]);
  const formulas = useMemo(() => extraneousFormulas(d), [d]);
  const announce = (next: ExtraneousState) => setAnnouncement(prev => `${extraneousSpoken(deriveExtraneous(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: ExtraneousState) => { lesson.set(next); announce(next); };
  const caution = extraneousIsCaution(d);

  return (
    <section
      class="stage stage-full" aria-labelledby={headingId} data-stage="extraneous" data-hydrated={hydrated} data-p={s.p} data-q={s.q}
      data-roots={d.roots.length} data-valid={d.validCount} data-extraneous={d.extraneousCount}
    >
      <header class="stage-head">
        <h3 id={headingId}>Squaring can invent roots: <Formula tex="\sqrt{x+p}=x+q" /></h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); announce(CANONICAL_EXTRANEOUS); }} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try an equation</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {EXTRANEOUS_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.p === s.p && p.state.q === s.q} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={EXTRANEOUS_WINDOW} label="The curves y equals plus and minus the square root of x plus p, and the line y equals x plus q" description={extraneousDescription(d)}>
            <Curve lines={curves.lower} role="caution" dashed name="lower-branch" />
            <Curve lines={curves.upper} role="x" name="upper-branch" />
            <Curve lines={curves.line} role="y" name="line" width={2.5} />
            {marks.map((m, i) => (
              <g key={i}>
                <PointMarker at={m.at} role={m.valid ? 'ink' : 'caution'} filled={m.valid} name={m.valid ? 'root-valid' : 'root-extraneous'} radius={7} />
                <PlaneLabel name={`root-label-${i + 1}`} at={m.at} dx={m.at.x >= 0 ? 14 : -14} dy={m.valid ? -14 : 18} anchor={m.at.x >= 0 ? 'start' : 'end'} role={m.valid ? 'ink' : 'caution'} math>{i === 0 ? 'x₁' : 'x₂'}</PlaneLabel>
              </g>
            ))}
          </CoordinatePlane>
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The roots of the squared equation and their check" legend="= exact · ≈ rounded · a root is valid only if the right-hand side x + q is not negative" />
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!caution)}>{extraneousVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${EXTRANEOUS_FORMULA_LABELS[i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={EP_SPEC} value={s.p} grid={GRID} onCommit={p => update({ ...s, p })} />
        <ParameterInput spec={EQ_SPEC} value={s.q} grid={GRID} onCommit={q => update({ ...s, q })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function ExtraneousStage() {
  return (
    <IdScope name={'extraneous'}>
      <ExtraneousStageInner />
    </IdScope>
  );
}
