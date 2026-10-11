import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveQuadrature, QUADRATURE_CANONICAL, quadratureChoices, quadraturePresets, quadratureSpecs, type QuadratureState } from './quadrature-lesson';
export default function QuadratureStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="quadrature" frames={deriveQuadrature(QUADRATURE_CANONICAL).frames} />;
  return <CalculusStage<QuadratureState> kind="quadrature" title="Refine a quadrature rule and measure its order" canonical={QUADRATURE_CANONICAL} derive={deriveQuadrature}
    specs={quadratureSpecs} fields={() => ['k']} presets={quadraturePresets} choices={quadratureChoices} presetLegend="Choose an integrand or rule" />;
}
