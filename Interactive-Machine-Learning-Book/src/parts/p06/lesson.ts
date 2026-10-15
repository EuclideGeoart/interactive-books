import { formatNumber } from '../../platform/format';
import { pca, editPoint, CANONICAL, type PCAState, type Vec2 } from './model/pca';
import clouds from '../../../data/p06/clouds.json';
export type Mode = 'covariance' | 'eigenpairs' | 'reconstruction';
export const PLANE = { size: 640, origin: 320, scale: 32, min: -8, max: 8 } as const;
export const shown = (v: number) => v !== 0 && Math.abs(v) < .0001 ? v.toExponential(3) : formatNumber(v, 5);
const tex = (v: number): string => { const [a, e] = String(v).split('e'); return e === undefined ? a! : `${a}\\times10^{${Number(e)}}`; };
export function initialLab(): PCAState { return CANONICAL; }
export function preset(s: PCAState, name: keyof typeof clouds.clouds): PCAState {
  const coordinates = clouds.clouds[name];
  if (!coordinates) throw new RangeError('Unknown cloud.');
  return { ...s, points: coordinates.map((x, i) => ({ id: String.fromCharCode(97 + i), x: [x[0]!, x[1]!] })) };
}
export function editLabPoint(s: PCAState, id: string, change: Partial<{ x: number; y: number }>) {
  for (const v of Object.values(change)) if (!Number.isFinite(v) || Math.abs(v) > 5) throw new RangeError('Editable coordinates must be finite and within −5 to 5.');
  return editPoint(s, id, change);
}
export function movePoint(s: PCAState, id: string, key: string, shift = false) {
  const point = s.points.find(p => p.id === id);
  if (!point) throw new RangeError('Unknown point ID.');
  const step = shift ? .5 : .1;
  const j = key === 'ArrowLeft' || key === 'ArrowRight' ? 0 : 1;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) throw new RangeError('Use an arrow key.');
  const value = Math.min(5, Math.max(-5, point.x[j] + (key === 'ArrowRight' || key === 'ArrowUp' ? step : -step)));
  return editLabPoint(s, id, j === 0 ? { x: value } : { y: value });
}
export function pointerPoint(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }) {
  if (![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) throw new RangeError('Pointer geometry must be finite with positive dimensions.');
  const size = Math.min(bounds.width, bounds.height);
  const left = bounds.left + (bounds.width - size) / 2, top = bounds.top + (bounds.height - size) / 2;
  const snap = (v: number) => Math.min(5, Math.max(-5, Math.round(v * 10) / 10));
  return { x: snap(((clientX - left) * PLANE.size / size - PLANE.origin) / PLANE.scale),
    y: snap((PLANE.origin - (clientY - top) * PLANE.size / size) / PLANE.scale) };
}
export function deriveLab(s: PCAState, width = 320) {
  const numerical = pca(s);
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Plot width must be positive and finite.');
  for (const point of s.points) for (const v of point.x) if (Math.abs(v) > 5) throw new RangeError('Lab coordinates are bounded to −5 to 5.');
  const px = (x: number) => PLANE.origin + PLANE.scale * x;
  const py = (y: number) => PLANE.origin - PLANE.scale * y;
  const fontSize = Math.max(16, 14.1 * PLANE.size / width);
  const hitRadius = Math.max(11, 23 * PLANE.size / width);
  const points = s.points.map((p, i) => {
    const row = numerical.status === 'defined' ? numerical.rows[i]! : null;
    return { ...p, cx: px(p.x[0]), cy: py(p.x[1]), row,
      shadow: row ? { cx: px(row.reconstructed[0]), cy: py(row.reconstructed[1]) } : null,
      residualLine: row ? { x1: px(p.x[0]), y1: py(p.x[1]), x2: px(row.reconstructed[0]), y2: py(row.reconstructed[1]) } : null,
      label: { x: px(p.x[0]) + 9, y: py(p.x[1]) - 10 },
      name: `Point ${p.id}: x ${shown(p.x[0])}, y ${shown(p.x[1])}. Arrow keys move by 0.1; Shift by 0.5.`,
    };
  });
  const axes = numerical.status === 'defined' ? numerical.axes.map((v, i) => ({
    index: i, v, eigenvalue: numerical.eigenvalues[i]!,
    x1: px(numerical.mean[0] - 7 * v[0]), y1: py(numerical.mean[1] - 7 * v[1]),
    x2: px(numerical.mean[0] + 7 * v[0]), y2: py(numerical.mean[1] + 7 * v[1]),
  })) : [];
  const ambiguity = numerical.status === 'undefined' ? numerical.reason : numerical.zeroVariance
    ? 'Zero spread: variance ratios are undefined; any orthonormal basis is valid.' : numerical.repeated
    ? 'Repeated eigenvalues: no unique principal axis. Coordinate basis shown by convention.' : numerical.nearRepeated
    ? 'Nearly repeated eigenvalues: directions are sensitive to small perturbations; no stable preferred axis.'
    : 'Axes are unoriented lines: v and −v describe the same component. Signs are display conventions.';
  const formulas = [
    { label: 'Center the active row-batch data', tex: `X_c=X-\\mathbf1\\mu^T,\\quad X\\in\\mathbb R^{${numerical.n}\\times2},\\quad\\mu=\\begin{bmatrix}${tex(numerical.mean[0])}\\\\${tex(numerical.mean[1])}\\end{bmatrix}` },
    { label: 'Active covariance normalization', tex: numerical.divisor === 0 ? 'C=\\text{undefined},\\quad n-1=0' : `C=\\frac{X_c^TX_c}{${numerical.divisor}},\\quad ${s.normalization === 'sample' ? 'n-1' : 'n'}=${numerical.divisor}` },
    ...(numerical.status === 'defined' ? [
      { label: 'Ordered eigenpairs and retained component count', tex: `Cv_j=\\lambda_jv_j,\\quad V^TV=I,\\quad\\lambda_1\\ge\\lambda_2,\\quad k=${s.k}` },
      { label: 'Projection and reconstruction shapes', tex: `Z=X_cV_k\\in\\mathbb R^{${numerical.n}\\times${s.k}},\\quad\\hat X=ZV_k^T+\\mathbf1\\mu^T` },
      { label: 'Reconstruction SSE and per-observation MSE', tex: `\\mathrm{SSE}=\\lVert X-\\hat X\\rVert_F^2,\\quad\\mathrm{MSE}=\\mathrm{SSE}/${numerical.n}` },
    ] : []),
  ];
  const vector = (v: Vec2) => `[${v.map(shown).join(', ')}]`;
  const inspector = [
    { label: 'Input X / centered Xc', value: `${numerical.n} × 2 / ${numerical.n} × 2`, detail: 'Samples in rows; observations are column vectors in equations. No labels, intercept or standardization.' },
    { label: 'Mean μ', value: vector(numerical.mean), detail: '2 × 1; axes pass through this mean in source coordinates.' },
    { label: 'Covariance C', value: '2 × 2', detail: `${s.normalization} divisor ${numerical.divisor}.` },
    { label: 'Basis Vk / scores Z', value: `2 × ${s.k} / ${numerical.n} × ${s.k}`, detail: 'k=0 gives empty scores and mean-only reconstruction.' },
    { label: 'Ambiguity', value: ambiguity },
  ];
  const speech = numerical.status === 'undefined' ? ambiguity : `${s.k} components. Eigenvalues ${numerical.eigenvalues.map(shown).join(', ')}. Reconstruction SSE ${shown(numerical.sse)}; per-observation MSE ${shown(numerical.mse)}. ${ambiguity}`;
  return { state: s, numerical, points, axes, formulas, inspector, ambiguity, speech, fontSize, hitRadius,
    meanMark: { cx: px(numerical.mean[0]), cy: py(numerical.mean[1]) },
    ticks: [-4, 0, 4].map(value => ({ value, cx: px(value), cy: py(value) })),
  };
}
