import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { ACCUMULATION_CANONICAL, accumulationPresets, accumulationSpecs, deriveAccumulation, type AccumulationState } from './accumulation-lesson';
export default function AccumulationStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="accumulation" frames={deriveAccumulation(ACCUMULATION_CANONICAL).frames} />;
  return <CalculusStage<AccumulationState> kind="accumulation" title="Watch accumulated area change at the rate f(x)" canonical={ACCUMULATION_CANONICAL} derive={deriveAccumulation}
    specs={accumulationSpecs} fields={() => ['a', 'x', 'dx']} presets={accumulationPresets} presetLegend="Choose an integrand or case" />;
}
