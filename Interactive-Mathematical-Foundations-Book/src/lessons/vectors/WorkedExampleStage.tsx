/** WorkedExampleStage — four fixed examples, each a step-by-step trace (magnitude, then direction). */
import { IdScope, useScopedId } from '../../ui/ids';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { deriveVector2 } from '../../math/vector2/vector2';
import { cursorAt, reset as resetCursor, type TraceCursor } from '../../platform/trace';
import { Formula } from '../../ui/Formula';
import { MathScroll } from '../../ui/MathScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { WORKED_EXAMPLES, workedFrames } from './direction-lesson';

function WorkedExampleStageInner() {
  const [pick, setPick] = useState(WORKED_EXAMPLES[0]!.id);
  const example = WORKED_EXAMPLES.find(e => e.id === pick)!;
  const frames = useMemo(() => workedFrames({ x: example.x, y: example.y }, deriveVector2({ x: example.x, y: example.y })), [example]);
  const [cursor, setCursor] = useState<TraceCursor>(() => cursorAt(frames.length));
  const [hydrated, setHydrated] = useState(false);
  const headingId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const choose = (id: string) => {
    const next = WORKED_EXAMPLES.find(e => e.id === id)!;
    setPick(id);
    setCursor(resetCursor(cursorAt(workedFrames({ x: next.x, y: next.y }, deriveVector2({ x: next.x, y: next.y })).length)));
  };
  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="worked" data-hydrated={hydrated} data-example={example.id}>
      <header class="stage-head"><h3 id={headingId}>Worked examples: length, then direction</h3></header>
      <div>
        <p class="presets-label">Choose a vector</p>
        <div class="example-picks" role="group" aria-label="Choose a vector">
          {WORKED_EXAMPLES.map(e => <button key={e.id} type="button" aria-pressed={e.id === pick} data-example={e.id} onClick={() => choose(e.id)}>{e.label}</button>)}
        </div>
      </div>
      <TraceStepper label={`Worked example ${example.label}`} frames={frames} cursor={cursor} onCursor={setCursor}
        renderFrame={f => (<><MathScroll label="Computation step, scrollable"><Formula tex={f.state.tex} display /></MathScroll><p class="trace-caption">{f.state.caption}</p></>)}
        describeFrame={f => f.state.caption} />
    </section>
  );
}

export default function WorkedExampleStage() {
  return (
    <IdScope name={'worked'}>
      <WorkedExampleStageInner />
    </IdScope>
  );
}
