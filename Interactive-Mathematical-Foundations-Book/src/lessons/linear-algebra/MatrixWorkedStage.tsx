import { useEffect, useMemo, useState } from 'preact/hooks';
import { cursorAt } from '../../platform/trace';
import { IdScope, useScopedId } from '../../ui/ids';
import { TraceStepper } from '../../ui/TraceStepper';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { Inspector } from '../../ui/Inspector';
import { matrixWorkedFrames, type MatrixChapter } from './matrix-lesson';
import './linear-algebra.css';

function Inner({ chapter }: { chapter: MatrixChapter }) {
  const frames = useMemo(() => matrixWorkedFrames(chapter), [chapter]);
  const [cursor, setCursor] = useState(cursorAt(frames.length)), [hydrated, setHydrated] = useState(false);
  const id = useScopedId();
  useEffect(() => setHydrated(true), []);
  return <section class="stage stage-full" data-stage={`matrix-worked-${chapter}`} data-hydrated={hydrated} aria-labelledby={id}>
    <header class="stage-head"><h3 id={id}>Inspect the worked calculation</h3></header>
    <TraceStepper label="Worked calculation" frames={frames} cursor={cursor} onCursor={setCursor} autoplay
      describeFrame={frame => frame.explanation!} renderFrame={frame => <>
        <p>{frame.explanation}</p><FormulaScroll tex={frame.state.formula} label="Worked calculation, scrollable" />
        <Inspector rows={frame.state.rows} label="Values in the worked example" />
      </>} />
  </section>;
}

export default function MatrixWorkedStage({ chapter }: { chapter: MatrixChapter }) {
  return <IdScope name={`matrix-worked-${chapter}`}><Inner chapter={chapter} /></IdScope>;
}
