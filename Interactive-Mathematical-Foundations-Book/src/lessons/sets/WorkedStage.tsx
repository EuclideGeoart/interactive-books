/** WorkedStage — four fixed examples, each a step-by-step trace. Going back selects an earlier frame; nothing is undone. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { cursorAt, reset as resetCursor, type TraceCursor } from '../../platform/trace';
import { FormulaScroll } from '../families/FormulaScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { IdScope, useScopedId } from '../../ui/ids';
import { WORKED_EXAMPLES, workedFrames } from './worked-lesson';

function WorkedStageInner() {
  const [pick, setPick] = useState(WORKED_EXAMPLES[0]!.id);
  const example = WORKED_EXAMPLES.find(e => e.id === pick)!;
  const frames = useMemo(() => workedFrames(pick), [pick]);
  const [cursor, setCursor] = useState<TraceCursor>(() => cursorAt(frames.length));
  const [hydrated, setHydrated] = useState(false);
  const headingId = useScopedId();
  const pickLabelId = useScopedId();
  useEffect(() => setHydrated(true), []);
  const choose = (id: string) => {
    setPick(id);
    setCursor(resetCursor(cursorAt(workedFrames(id).length)));
  };
  return (
    <section class="stage stage-full" aria-labelledby={headingId} data-stage="worked" data-hydrated={hydrated} data-example={example.id}>
      <header class="stage-head"><h3 id={headingId}>Worked examples, step by step</h3></header>
      <div>
        <p class="presets-label" id={pickLabelId}>Choose an example</p>
        <div class="example-picks" role="group" aria-labelledby={pickLabelId}>
          {WORKED_EXAMPLES.map(e => <button key={e.id} type="button" aria-label={e.aria} aria-pressed={e.id === pick} data-example={e.id} onClick={() => choose(e.id)}>{e.label}</button>)}
        </div>
      </div>
      <TraceStepper label={`Worked example: ${example.label}`} frames={frames} cursor={cursor} onCursor={setCursor}
        renderFrame={f => (<><FormulaScroll label="Computation step, scrollable" tex={f.state.tex} /><p class="trace-caption">{f.state.caption}</p></>)}
        describeFrame={f => f.state.caption} />
    </section>
  );
}

export default function WorkedStage() {
  return (
    <IdScope name="worked">
      <WorkedStageInner />
    </IdScope>
  );
}
