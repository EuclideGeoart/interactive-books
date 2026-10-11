import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { derivePartial, PARTIAL_CANONICAL, partialPresets, partialSpecs, type PartialState } from './partials-lesson';
export default function PartialStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="partials" frames={derivePartial(PARTIAL_CANONICAL).frames} />;
  return <CalculusStage<PartialState> kind="partials" title="Hold one input fixed and differentiate the slice" canonical={PARTIAL_CANONICAL} derive={derivePartial}
    specs={partialSpecs} fields={() => ['x', 'y']} presets={partialPresets} presetLegend="Choose a surface" />;
}
