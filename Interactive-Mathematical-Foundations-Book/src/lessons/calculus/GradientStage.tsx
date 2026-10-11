import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveGradient, GRADIENT_CANONICAL, gradientPresets, gradientSpecs, type GradientState } from './gradient-lesson';
export default function GradientStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="gradient" frames={deriveGradient(GRADIENT_CANONICAL).frames} />;
  return <CalculusStage<GradientState> kind="gradient" title="Measure the rate of change in any direction" canonical={GRADIENT_CANONICAL} derive={deriveGradient}
    specs={gradientSpecs} fields={() => ['x', 'y', 'dx', 'dy']} presets={gradientPresets} presetLegend="Choose a surface or direction" />;
}
