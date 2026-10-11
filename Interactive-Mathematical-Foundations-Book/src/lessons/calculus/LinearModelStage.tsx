import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveLinear, LINEAR_CANONICAL, linearPresets, linearSpecs, type LinearState } from './linear-model-lesson';
export default function LinearModelStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="linear-model" frames={deriveLinear(LINEAR_CANONICAL).frames} />;
  return <CalculusStage<LinearState> kind="linear-model" title="Use the tangent line as a local model" canonical={LINEAR_CANONICAL} derive={deriveLinear}
    specs={linearSpecs} fields={() => ['x0', 'dx']} presets={linearPresets} presetLegend="Choose a function or case" />;
}
