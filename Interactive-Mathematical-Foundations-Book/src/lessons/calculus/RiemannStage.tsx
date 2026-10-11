import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveRiemann, RIEMANN_CANONICAL, riemannPresets, riemannSpecs, ruleChoices, type RiemannState } from './riemann-lesson';
export default function RiemannStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="riemann" frames={deriveRiemann(RIEMANN_CANONICAL).frames} />;
  return <CalculusStage<RiemannState> kind="riemann" title="Accumulate signed area panel by panel" canonical={RIEMANN_CANONICAL} derive={deriveRiemann}
    specs={riemannSpecs} fields={() => ['a', 'b', 'n']} presets={riemannPresets} choices={ruleChoices} presetLegend="Choose an integrand or case" />;
}
