/**
 * PixelStage — the same pixel in two coordinate systems. The math plane has y UP and a lattice point (x, y); an image array has row 0 at
 * the TOP, so img[row, col] with row = H − 1 − y and col = x. The plane and the array table are two views of ONE flat state {w, h, x, y}.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { derivePixel, resizePixel, type PixelDerived, type PixelState } from '../../math/coordinates/pixel';
import type { Grid } from '../../platform/params';
import { Formula } from '../../ui/Formula';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { MathScroll } from '../../ui/MathScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useLesson } from '../../ui/useLesson';
import { CoordinatePlane } from '../../ui/plane/CoordinatePlane';
import { DragPoint } from '../../ui/plane/DragPoint';
import { PlaneLabel, Polygon, Segment } from '../../ui/plane/primitives';
import { CANONICAL_PIXEL, H_SPEC, PIXEL_PRESETS, W_SPEC, pixelCells, pixelDescription, pixelFormulas, pixelLabel, pixelRows, pixelScene, pixelSpoken, pixelVerdict, pixelWindow, xSpec, ySpec } from './pixel-lesson';

const SHOWS = [{ id: 'xy', label: '(x, y)' }, { id: 'index', label: 'flat index' }] as const;
type ShowId = (typeof SHOWS)[number]['id'];
const LATTICE: Grid = { kind: 'lattice', step: 1 };

function PixelStageInner() {
  const lesson = useLesson<PixelState, PixelDerived>(CANONICAL_PIXEL, derivePixel);
  const s = lesson.state;
  const d = lesson.derived;
  const [show, setShow] = useState<ShowId>('xy');
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const headingId = useScopedId();
  const hintId = useScopedId();
  const tableId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const win = useMemo(() => pixelWindow(s.w, s.h), [s.w, s.h]);
  const scene = useMemo(() => pixelScene(d), [d]);
  const rows = useMemo(() => pixelRows(d), [d]);
  const formulas = useMemo(() => pixelFormulas(d), [d]);
  const cells = useMemo(() => pixelCells(d), [d]);
  const announce = (next: PixelState) => setAnnouncement(prev => `${pixelSpoken(derivePixel(next))}${prev.endsWith('​') ? '' : '​'}`);
  const update = (next: PixelState) => { lesson.set(next); announce(next); };

  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="pixel" data-hydrated={hydrated} data-w={s.w} data-h={s.h} data-x={s.x} data-y={s.y} data-row={d.row} data-col={d.col}>
      <header class="stage-head">
        <h3 id={headingId}>The same pixel, two coordinate systems</h3>
        <button type="button" class="button quiet" onClick={() => { lesson.reset(); setShow('xy'); announce(CANONICAL_PIXEL); }} disabled={lesson.isCanonical && show === 'xy'} data-action="reset">Reset</button>
      </header>
      <div>
        <p class="presets-label" id={`${headingId}-p`}>Try a pixel</p>
        <div class="presets" role="group" aria-labelledby={`${headingId}-p`}>
          {PIXEL_PRESETS.map(p => <button key={p.id} type="button" aria-label={p.aria} aria-pressed={p.state.w === s.w && p.state.h === s.h && p.state.x === s.x && p.state.y === s.y} data-preset={p.id} onClick={() => update(p.state)}>{p.label}</button>)}
        </div>
      </div>
      <div class="stage-grid">
        <div class="stage-plane">
          <CoordinatePlane window={win} label="The pixels of an image as lattice points in a coordinate plane with y up" description={pixelDescription(d)}>
            <Polygon name="image" corners={scene.image} role="ink" />
            <Polygon name="cell" corners={scene.cell} role="primary" />
            {scene.verticals.map(x => <Segment key={`v${x}`} from={{ x, y: -0.5 }} to={{ x, y: s.h - 0.5 }} role="ink" width={1} />)}
            {scene.horizontals.map(y => <Segment key={`h${y}`} from={{ x: -0.5, y }} to={{ x: s.w - 0.5, y }} role="ink" width={1} />)}
            {scene.rowLabels.map(l => <PlaneLabel key={l.row} name={`row-label-${l.row}`} at={l.at} dx={8} dy={-9} anchor="start" role={l.row === d.row ? 'primary' : 'ink'}>{`row ${l.row}`}</PlaneLabel>)}
            <DragPoint value={scene.p} xSpec={xSpec(s.w)} ySpec={ySpec(s.h)} grid={LATTICE} label={pixelLabel(d)} hintId={hintId} onChange={p => update({ ...s, x: p.x + 0, y: p.y + 0 })} onCommit={() => undefined} />
          </CoordinatePlane>
          <span id={hintId} hidden>Drag with a pointer, or use the arrow keys to move the point from pixel to pixel. Up increases y and decreases the row.</span>
        </div>
        <figure class="pixel-figure">
          <table class="pixel-array" id={tableId} data-table="pixel-array">
            <caption>The same image as an array: <code>img[row, col]</code>, row 0 at the top</caption>
            <thead>
              <tr>
                <th scope="col"><span class="sr-only">row, column</span></th>
                {Array.from({ length: s.w }, (_, c) => <th key={c} scope="col">col {c}</th>)}
              </tr>
            </thead>
            <tbody>
              {cells.map((line, r) => (
                <tr key={r} data-row={r}>
                  <th scope="row">row {r}</th>
                  {line.map(cell => (
                    <td key={cell.col} data-row={cell.row} data-col={cell.col} data-x={cell.x} data-y={cell.y} data-selected={String(cell.selected)} aria-current={cell.selected ? 'true' : undefined}>
                      {show === 'xy' ? `(${cell.x},${cell.y})` : cell.index}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <SegmentedControl<ShowId> legend="Cells show" name={`${headingId}-show`} options={SHOWS} value={show} onChange={setShow} />
        </figure>
      </div>
      <div class="stage-readout">
        <Inspector rows={rows} label="Pixel coordinates, row, column and index" legend="row = H − 1 − y · col = x · index = row · W + col · the two slips are what NOT to write" />
      </div>
      <p class="verdict" data-verdict data-agree="true">{pixelVerdict(d)}</p>
      <div class="formula-panel" role="group" aria-label="Live formulas">
        {formulas.map((tex, i) => <MathScroll key={i} label={`${['Row and column', 'Flat index and the way back'][i]}, scrollable`}><Formula tex={tex} display /></MathScroll>)}
      </div>
      <div class="stage-controls">
        <ParameterInput spec={W_SPEC} value={s.w} grid={LATTICE} onCommit={w => update(resizePixel(s, w, s.h))} />
        <ParameterInput spec={H_SPEC} value={s.h} grid={LATTICE} onCommit={h => update(resizePixel(s, s.w, h))} />
        <ParameterInput spec={xSpec(s.w)} value={s.x} grid={LATTICE} onCommit={x => update({ ...s, x })} />
        <ParameterInput spec={ySpec(s.h)} value={s.y} grid={LATTICE} onCommit={y => update({ ...s, y })} />
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
    </section>
  );
}

export default function PixelStage() {
  return (
    <IdScope name={'pixel'}>
      <PixelStageInner />
    </IdScope>
  );
}
