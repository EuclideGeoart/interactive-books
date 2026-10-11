import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveHessian, HESSIAN_CANONICAL, hessianPresets, hessianSpecs, type HessianState } from './hessian-lesson';
export default function HessianStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="hessian" frames={deriveHessian({ fn: 'double-well', x: -1, y: 0, angle: 30 }).frames} />;
  return <CalculusStage<HessianState> kind="hessian" title="Read curvature from second derivatives" canonical={HESSIAN_CANONICAL} derive={deriveHessian}
    specs={hessianSpecs} fields={() => ['x', 'y', 'angle']} presets={hessianPresets} presetLegend="Choose a surface and point" />;
}
