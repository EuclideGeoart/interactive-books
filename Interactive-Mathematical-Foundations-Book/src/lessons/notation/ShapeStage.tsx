/**
 * ShapeStage — the hero of I.9. An object (scalar, vector, matrix, tensor) with chosen dimensions; one entry named with 1-based indices, with
 * the NumPy index (each minus 1), its position in the flattened array and the slices. An index outside its axis is reported with the reason.
 * One flat state → deriveShape → every view.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Formula } from '../../ui/Formula';
import { Inspector } from '../../ui/Inspector';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import {
  CANONICAL_SHAPE, DIMS_OF, DIM_PARAMS, INDEX_PARAMS, KIND_OPTIONS, SHAPE_PRESETS, axisLegend, deriveShapeLesson, diagramDescription, diagramOf, shapeCode, shapeFormulas, shapePresetMatches,
  shapeRows, shapeSpoken, shapeVerdict, type ShapeLessonDerived, type ShapeLessonState,
} from './shape-lesson';
import { GRID_FREE } from './shared';

function ShapeStageInner() {
  const lesson = useLesson<ShapeLessonState, ShapeLessonDerived>(CANONICAL_SHAPE, deriveShapeLesson);
  const d = lesson.derived;
  const s = lesson.state;
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const presetLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);

  const slabs = useMemo(() => diagramOf(d), [d]);
  const rows = useMemo(() => shapeRows(d), [d]);
  const formulas = useMemo(() => shapeFormulas(d), [d]);
  const legend = useMemo(() => axisLegend(d), [d]);
  const verdict = shapeVerdict(d);
  const sel = d.d.selection;
  const commit = (next: ShapeLessonState) => {
    lesson.set(next);
    setAnnouncement(prev => `${shapeSpoken(deriveShapeLesson(next))}${prev.endsWith('​') ? '' : '​'}`);
  };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="shape" data-hydrated={hydrated} data-kind={s.kind} data-shape={d.d.shapeTuple} data-count={d.d.count} data-valid={sel ? String(sel.valid) : 'true'} data-offset={sel?.offset ?? ''}>
      <header class="stage-head">
        <h2 id={headingId}>An array and its shape: <Formula tex="X_{ij}\leftrightarrow\texttt{X[i-1,\ j-1]}" /></h2>
        <button type="button" class="button quiet" onClick={() => commit(CANONICAL_SHAPE)} disabled={lesson.isCanonical} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={presetLabelId}>Try these</p>
        <div class="presets" role="group" aria-labelledby={presetLabelId}>
          {SHAPE_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={shapePresetMatches(s, p)} data-preset={p.id} onClick={() => commit(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-controls shape-controls">
        <SegmentedControl legend="The object" name={`${headingId}-kind`} options={KIND_OPTIONS} value={s.kind} onChange={kind => commit({ ...s, kind })} />
        {DIMS_OF[s.kind].map(key => <ParameterInput key={key} spec={DIM_PARAMS[key]} value={s[key]} grid={GRID_FREE} onCommit={v => commit({ ...s, [key]: v })} />)}
        {d.d.axes.map(a => <ParameterInput key={a.index} spec={INDEX_PARAMS[a.index]} value={s[a.index]} grid={GRID_FREE} onCommit={v => commit({ ...s, [a.index]: v })} />)}
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <div class="shape-diagram" role="img" aria-label={diagramDescription(d)} data-diagram>
            {slabs.map(slab => (
              <figure key={slab.key} class="slab" data-slab={slab.key}>
                {slab.title && <figcaption>{slab.title}</figcaption>}
                <div class="slab-grid" style={{ '--cols': slab.cols } as Record<string, number>}>
                  {slab.cells.map(c => <span key={c.offset} class="sh-cell" data-offset={c.offset} data-mark={c.mark}>{c.offset}</span>)}
                </div>
              </figure>
            ))}
          </div>
          <p class="diagram-note">Each cell shows its position in the flattened array, counting from 0 and reading row by row. Thick outline: the chosen entry. Tinted: the rest of its row and column.</p>
          {legend.length > 0 && (
            <dl class="axis-legend" aria-label="The axes of the object">
              {legend.map(a => (
                <div key={a.symbol + a.index} data-axis={a.symbol}>
                  <dt><Formula tex={`${a.symbol}=${a.size}`} /> · index <Formula tex={a.index} /></dt>
                  <dd>{a.role}; one step in {a.index} moves {a.stride} {a.stride === 1 ? 'position' : 'positions'}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div class="stage-readout">
          <Inspector rows={rows} label="The object, the chosen entry and its position" legend="= exact · ⚠ undefined" />
          <p class="py-label">The Python being run</p>
          <pre class="py-code" data-code><code>{shapeCode(d)}</code></pre>
        </div>
      </div>
      <p class="verdict" data-verdict data-agree={String(!verdict.caution)}>{verdict.text}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map(f => <FormulaScroll key={f.id} label={f.label} tex={f.tex} />)}
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function ShapeStage() {
  return (
    <IdScope name="shape">
      <ShapeStageInner />
    </IdScope>
  );
}
