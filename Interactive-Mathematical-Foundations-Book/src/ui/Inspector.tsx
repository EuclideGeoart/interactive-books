/**
 * Inspector — the first-class "what are the actual quantities right now?" surface (plan §6.6).
 * Generic: it renders rows of `ValueDescription`; it knows nothing about vectors.
 *
 * Each row: symbol · name · value lines. An exact value gets an "=" line and, when it is not an integer, a
 * "≈" line; a computed value is only ever "≈"; an undefined value says so and why (with a ⚠ glyph, so the
 * caution role never relies on colour alone).
 */
import type { ValueDescription } from '../platform/numeric/quantity';
import { Formula } from './Formula';

export interface InspectorRowData {
  readonly id: string;
  readonly role: 'primary' | 'x' | 'y' | 'derived' | 'caution' | 'ink';
  readonly symbolTex: string;
  readonly name: string;
  readonly description: ValueDescription;
  readonly secondary?: boolean;
}

export function Inspector({ rows, label, legend }: { rows: readonly InspectorRowData[]; label: string; legend?: string }) {
  return (
    <div class="inspector-wrap">
    <dl class="inspector" aria-label={label}>
      {rows.map(row => (
        <div class={`inspector-row role-${row.role}${row.secondary ? ' is-secondary' : ''}`} key={row.id} data-quantity={row.id} data-status={row.description.status}>
          <dt>
            <span class="sym" aria-hidden="true"><Formula tex={row.symbolTex} /></span>
            <span class="name">{row.name}</span>
          </dt>
          <dd>
            {row.description.lines.map((line, i) => (
              <span class="line" key={i} data-relation={line.relation}>
                <span class="rel" aria-hidden="true">{line.relation}</span>
                <span class="val">{line.text}</span>
              </span>
            ))}
            {row.description.note && (
              <span class="note"><span aria-hidden="true">⚠ </span>{row.description.note}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
    {legend && <p class="inspector-legend">{legend}</p>}
    </div>
  );
}
