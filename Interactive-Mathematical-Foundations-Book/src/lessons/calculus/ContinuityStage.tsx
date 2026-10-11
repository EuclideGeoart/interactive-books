import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { continuityChoices, continuityFields, continuityPresets, continuitySpecs, CONTINUITY_CANONICAL, deriveContinuity, type ContinuityState } from './continuity-lesson';
export default function ContinuityStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="continuity" frames={deriveContinuity({ ...CONTINUITY_CANONICAL, c: 1, mode: 'custom', v: 0 }).frames} />;
  return <CalculusStage<ContinuityState> kind="continuity" title="Test the three conditions of continuity" canonical={CONTINUITY_CANONICAL} derive={deriveContinuity}
    specs={continuitySpecs} fields={continuityFields} presets={continuityPresets} choices={continuityChoices} presetLegend="Choose a situation" />;
}
