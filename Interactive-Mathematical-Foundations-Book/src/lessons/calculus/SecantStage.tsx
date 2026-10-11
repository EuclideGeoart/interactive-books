import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveSecant, SECANT_CANONICAL, secantPresets, secantSpecs, type SecantState } from './secant-lesson';
export default function SecantStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="secant" frames={deriveSecant(SECANT_CANONICAL).frames} />;
  return <CalculusStage<SecantState> kind="secant" title="Shrink a secant toward a tangent" canonical={SECANT_CANONICAL} derive={deriveSecant}
    specs={secantSpecs} fields={() => ['x', 'h']} presets={secantPresets} presetLegend="Choose a function or an exceptional case" />;
}
