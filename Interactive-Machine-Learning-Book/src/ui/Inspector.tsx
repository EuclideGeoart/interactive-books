export interface InspectorRow { label: string; value: string; detail?: string }
export default function Inspector({ rows }: { rows: readonly InspectorRow[] }) {
  return <dl class="inspector">{rows.map(row => <div><dt>{row.label}{row.detail && <small>{row.detail}</small>}</dt><dd>{row.value}</dd></div>)}</dl>;
}
