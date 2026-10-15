import { experiment, initial, type State, type Row } from './model/evaluation';
import { formatNumber } from '../../platform/format';
export type Mode = 'folds' | 'curves' | 'metrics' | 'pipeline' | 'reliability';
export const shown = (v: number | null) => v === null ? 'Undefined: zero denominator / empty bin' : v !== 0 && (Math.abs(v) < .0001 || Math.abs(v) > 1e7) ? v.toExponential(6) : formatNumber(v, 6);
export const headings: Record<Mode, string> = {
  folds: 'Lock the test rows; tune on development folds', curves: 'Fit more training groups; inspect the real errors',
  metrics: 'Count decisions; examine probability errors', pipeline: 'Fit the transform on training rows only', reliability: 'Replay the experiment; inspect arithmetic limits',
};
export function preset(name: 'original' | 'constant' | 'shifted' | 'all-negative'): State {
  const s = initial();
  if (name === 'constant') s.rows = s.rows.map((r): Row => ({ ...r, x: [1], y: 2 }));
  if (name === 'shifted') s.rows = s.rows.map((r): Row => ({ ...r, x: [r.x[0] === null ? null : r.x[0] + 10] }));
  if (name === 'all-negative') s.probabilities = s.probabilities.map(r => ({ ...r, y: 0 }));
  return s;
}
export function derive(s: State, width = 320) {
  const numerical = experiment(s);
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Positive finite plot width required.');
  const max = Math.max(1, ...numerical.curves.flatMap(c => [c.model.trainingMse, c.validation.mse]));
  const curvePoints = numerical.curves.map(c => ({ ...c, x: 90 + 460 * c.n / numerical.curves.at(-1)!.n,
    trainingY: 245 - 180 * c.model.trainingMse / max, validationY: 245 - 180 * c.validation.mse / max }));
  const reliabilityPoints = numerical.metrics.bins.filter(b => b.count > 0).map(b => ({ ...b, x: 90 + 460 * b.meanProbability!, y: 245 - 180 * b.frequency! }));
  const speech = `Seed ${s.seed}. Development ${numerical.board.development.join(', ')}; locked test ${numerical.board.test.join(', ')}. Selected power ${numerical.selected.power}, lambda ${numerical.selected.penalty}. Threshold ${s.threshold}: TP ${numerical.metrics.tp}, FP ${numerical.metrics.fp}, TN ${numerical.metrics.tn}, FN ${numerical.metrics.fn}. Brier ${shown(numerical.metrics.brier)}. Workflow phase ${s.phase + 1}.`;
  const inspector = [
    { label: 'Raw X / engineered X / y', value: `${s.rows.length} × 1 / n × 1 / n × 1`, detail: 'Observations are mathematical columns; batch stores their transpose in rows. Missing raw values use null.' },
    { label: 'Parameters', value: `power=${numerical.selected.power}, λ=${numerical.selected.penalty}`, detail: 'Selected on equal-weight CV MSE; intercept unpenalized; exact ties use first grid candidate.' },
    { label: 'Test group', value: numerical.board.groups[0]!, detail: 'Group allocation uses only IDs/groups and seed. Test values never fit preprocessing, select a model or enter a curve.' },
    { label: 'Data and RNG', value: numerical.provenance.dataVersion, detail: 'Hand-authored rows. Seed controls only group shuffle. Full displayed JSON records edited values.' },
    { label: 'LCG draws (u32)', value: numerical.board.draws.join(', '), detail: '1664525·state + 1013904223 mod 2³²; Fisher–Yates draws descending.' },
    { label: 'Numerical limits', value: 'binary64; finite arithmetic required', detail: 'Overflow and underflow to zero reject the edit. Constant transformed features use scale 1 and zero slope when λ=0.' },
  ];
  return { state: s, numerical, curvePoints, reliabilityPoints, max, speech, inspector, fontSize: Math.max(16, 14.1 * 640 / width) };
}
