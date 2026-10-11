import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveJacobian, JACOBIAN_CANONICAL, jacobianPresets, jacobianSpecs, type JacobianState } from './jacobian-lesson';
export default function JacobianStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="jacobian" frames={deriveJacobian(JACOBIAN_CANONICAL).frames} />;
  return <CalculusStage<JacobianState> kind="jacobian" title="Predict a vector map with its local linear transformation" canonical={JACOBIAN_CANONICAL} derive={deriveJacobian}
    specs={jacobianSpecs} fields={() => ['x', 'y', 'dx', 'dy']} presets={jacobianPresets} presetLegend="Choose a map or case" />;
}
