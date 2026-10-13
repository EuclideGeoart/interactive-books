import { approx, texNumber } from './fit-lesson';
import { confusion, logistic, multiclass, roc, sigmoid, type ClassificationMode, type ClassificationState, type Metric } from './model/classification';
export const metricText = (metric: Metric) => metric.value === null ? `Undefined: ${metric.reason}` : approx(metric.value);
const TITLES: Record<ClassificationMode, string> = { logistic: 'Logit → probability → likelihood update', threshold: 'One score column → one threshold → four counts', metrics: 'Count denominators → metrics → exact ROC sweep', softmax: 'Class logits → shifted probabilities → gradient matrix' };
export function deriveClassificationLesson(state: ClassificationState, mode: ClassificationMode, renderedWidth = 320) {
  if (!Number.isFinite(renderedWidth) || renderedWidth <= 0) throw new RangeError('Plot width must be positive and finite.');
  if (!(mode in TITLES)) throw new RangeError('Unknown classification mechanism.');
  const values = mode === 'softmax' ? [...state.multiX.flat(), ...state.W.flat(), state.shift] : mode === 'logistic' ? [...state.X.flat(), ...state.weights] : [];
  if (values.some(v => !Number.isFinite(v) || Math.abs(v) > 1000)) throw new RangeError('This sheet supports finite features, logits and coefficients within ±1000. State preserved.');
  if (mode === 'logistic' && state.X.some(r => r[0] !== 1) || mode === 'softmax' && state.multiX.some(r => r[0] !== 1)) throw new RangeError('The first feature is a fixed intercept 1.');
  const binary = mode === 'logistic' ? logistic(state.X, state.labels, state.weights, state.rate) : null;
  const multi = mode === 'softmax' ? multiclass(state.multiX, state.multiLabels, state.W, state.rate, state.shift) : null;
  const scores = binary ? binary.scores : state.scores, labels = binary ? state.labels : state.scoreLabels;
  const counts = multi ? null : confusion(scores, labels, state.threshold);
  const sweep = counts ? roc(scores, labels) : null;
  const rows = counts?.rows.map((r, i) => ({ ...r, id: `s${i + 1}`, x: state.X[i]?.[1] ?? i, logit: binary?.logits[i], loss: binary?.losses[i], cx: 70 + ((state.X[i]?.[1] ?? i) + 3) * 70, cy: 470 - 380 * r.score, labelY: 470 - 380 * r.label, diamond: `M${70 + ((state.X[i]?.[1] ?? i) + 3) * 70},${470 - 380 * r.score - 7}l7,7l-7,7l-7,-7Z` })) ?? [];
  const thresholdLabel = state.threshold === null ? 'Above every score (+∞ sentinel)' : String(state.threshold);
  const n = multi ? state.multiX.length : scores.length, d = multi ? state.W.length : binary ? state.weights.length : 1;
  const inspector = multi ? [
    { label: 'X · rows are samples', value: `${n} × ${d}`, detail: 'Intercept column is fixed at 1.' },
    { label: 'W, ∇W', value: `${d} × ${state.W[0]!.length}` },
    { label: 'Z, P, one-hot Y', value: `${n} × ${state.W[0]!.length}` },
    { label: 'Class-index labels', value: `${n} × 1` },
    { label: 'Cross entropy', value: 'mean / n' },
  ] : binary ? [
    { label: 'X · augmented design', value: `${n} × ${d}` }, { label: 'W, ∇W', value: `${d} × 1` },
    { label: 'z, p, y', value: `${n} × 1` }, { label: 'BCE', value: 'mean / n' },
  ] : [{ label: 'Scores and labels', value: `${n} × 1`, detail: 'The same score array supplies every count, metric and ROC point.' }, { label: 'Decision', value: 'p ≥ threshold' }, { label: 'Score provenance', value: 'Hand-authored', detail: 'Scores are fixed unless explicitly edited; moving a threshold never refits a model.' }];
  const formulas = multi ? [
    { tex: `Z=XW+c\\mathbf1_{${n}\\times${state.W[0]!.length}},\\quad c\\approx${texNumber(state.shift)},\\quad P_{ic}=\\frac{e^{Z_{ic}-m_i}}{\\sum_j e^{Z_{ij}-m_i}}`, label: `Multiply design by weights and add common scalar shift c=${String(state.shift)} to every logit, then subtract each row maximum before normalizing exponentials.` },
    { tex: `L=\\frac1{${n}}\\sum_i\\left(\\log\\sum_c e^{Z_{ic}-m_i}-(Z_{i,y_i}-m_i)\\right)\\approx ${texNumber(multi.loss)}`, label: `Mean multiclass cross entropy ${approx(multi.loss)}.` },
    { tex: `\\nabla_W L=\\frac1{${n}}X^\\mathsf{T}(P-Y),\\quad W^+=W-\\eta\\nabla_W L`, label: 'Gradient matrix has the same shape as W; update uses every old-state entry simultaneously.' },
  ] : [
    ...(binary ? [
      { tex: 'z=XW,\\quad p=\\sigma(z),\\quad \\ell(z,y)=\\max(z,0)-zy+\\log(1+e^{-|z|})', label: 'Stable binary cross entropy from logits, without taking a log of rounded probabilities.' },
      { tex: `L=\\frac1{${n}}\\sum_i\\ell(z_i,y_i)\\approx ${texNumber(binary.loss)}`, label: `Mean binary cross entropy ${approx(binary.loss)}.` },
      { tex: `\\nabla_W L=\\frac1{${n}}X^\\mathsf{T}(p-y),\\quad W^+=W-\\eta\\nabla_W L`, label: `Gradient intercept ${approx(binary.gradient[0]!)}, gradient feature ${approx(binary.gradient[1]!)}.` },
    ] : []),
    { tex: '\\hat y_i=\\mathbf1[p_i\\ge t]', label: `Decision uses greater than or equal; threshold ${thresholdLabel}. The above-all sentinel predicts no positives.` },
    ...(mode === 'metrics' ? [
      { tex: '\\operatorname{precision}=\\frac{TP}{TP+FP},\\quad\\operatorname{recall}=\\frac{TP}{TP+FN}', label: `Precision ${metricText(counts!.precision)} Recall ${metricText(counts!.recall)}` },
      { tex: 'F_1=\\frac{2TP}{2TP+FP+FN},\\quad FPR=\\frac{FP}{FP+TN}', label: `F1 ${metricText(counts!.f1)}; zero denominators are explicitly undefined.` },
    ] : []),
  ];
  const sigmoidCurve = binary ? Array.from({ length: 81 }, (_, i) => {
    const x = -3 + 6 * i / 80, p = sigmoid(state.weights[0]! + state.weights[1]! * x);
    return { x, p, cx: 70 + (x + 3) / 6 * 420, cy: 470 - 380 * p };
  }) : [];
  const rocPoints = sweep?.points.filter(r => r.tpr.value !== null && r.fpr.value !== null).map(r => ({ ...r, cx: 70 + 420 * r.fpr.value!, cy: 470 - 420 * r.tpr.value! })) ?? [];
  const sigmoidPath = sigmoidCurve.map((p, i) => `${i ? 'L' : 'M'}${p.cx},${p.cy}`).join(' ');
  const rocPath = rocPoints.map((p, i) => `${i ? 'L' : 'M'}${p.cx},${p.cy}`).join(' ');
  const thresholdY = state.threshold === null ? null : 470 - 380 * state.threshold;
  const probabilitySums = multi?.probabilities.map(r => r.reduce((sum, p) => sum + p, 0)) ?? [];
  const activeFpr = counts ? (counts.fp + counts.tn === 0 ? null : counts.fp / (counts.fp + counts.tn)) : null;
  const activeTpr = counts?.recall.value ?? null;
  const rocActive = activeFpr !== null && activeTpr !== null ? { cx: 70 + 420 * activeFpr, cy: 470 - 420 * activeTpr, fpr: activeFpr, tpr: activeTpr } : null;
  const provenance = multi ? 'Hand-authored three-class toy batch; no seed. Labels are class indices 0, 1 and 2.' : binary ? 'Hand-authored binary toy batch; no seed. Probability estimates come from the current logistic coefficients.' : 'Hand-authored labeled score fixture, shared by the threshold and metric chapters; no seed. These are illustrative scores, not a calibration claim.';
  const summary = multi ? `Mean cross entropy ${approx(multi.loss)}. Predictions ${multi.predicted.join(', ')}.` : `${binary ? `Mean BCE ${approx(binary.loss)}. ` : ''}Threshold ${thresholdLabel}. TP ${counts!.tp}, FP ${counts!.fp}, TN ${counts!.tn}, FN ${counts!.fn}. Precision ${metricText(counts!.precision)}. Recall ${metricText(counts!.recall)}. F1 ${metricText(counts!.f1)}.`;
  return { state, mode, fontSize: Math.max(18, 14 * 560 / renderedWidth), title: TITLES[mode], binary, multi, counts, sweep, rows, thresholdLabel, inspector, formulas, sigmoidCurve, sigmoidPath, thresholdY, probabilitySums, rocPoints, rocPath, rocActive, provenance, summary };
}
