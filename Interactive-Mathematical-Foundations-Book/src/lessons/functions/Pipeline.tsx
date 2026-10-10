/**
 * Pipeline — the machine as boxes: the input, then each operation, then the value it produced, and so on to the output. Presentation only: every
 * value and every operation comes from an `Evaluation` the model produced. After the first refusal the remaining boxes are shown as "not reached".
 */
import { Fragment } from 'preact';
import type { Evaluation } from '../../math/functions/value';
import { Formula } from '../../ui/Formula';
import { numTex, opWords } from './format';

export function Pipeline({ evaluation, tags, label, name }: { evaluation: Evaluation; tags: readonly string[]; label: string; name: string }) {
  const values = [evaluation.input, ...evaluation.rows.map(r => r.after)];
  const refusedAt = values.findIndex(v => v.kind === 'undefined');
  return (
    <ol class="pipeline" aria-label={label} data-pipeline={name}>
      {values.map((v, i) => {
        const skipped = refusedAt >= 0 && i > refusedAt;
        const refused = i === refusedAt;
        const op = i > 0 ? evaluation.rows[i - 1]!.op : null;
        return (
          <Fragment key={i}>
            {op && <li class={`pipe-op${skipped ? ' is-skipped' : ''}`} key={`op-${i}`} data-step={i}><span class="pipe-arrow" aria-hidden="true">→</span><span class="pipe-words">{opWords(op)}</span></li>}
            <li class={`pipe-value${refused ? ' is-refused' : ''}${skipped ? ' is-skipped' : ''}`} key={`v-${i}`} data-value={i} data-kind={v.kind}>
              {tags[i] ? <span class="pipe-tag">{tags[i]}</span> : null}
              {skipped
                ? <span class="pipe-num">not reached</span>
                : refused
                  ? <span class="pipe-num"><span aria-hidden="true">⚠ </span>undefined</span>
                  : <span class="pipe-num"><Formula tex={numTex(v)} /></span>}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
