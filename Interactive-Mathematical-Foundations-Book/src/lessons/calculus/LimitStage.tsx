import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveLimit, LIMIT_CANONICAL, limitPresets, limitSpecs, type LimitState } from './limits-lesson';
export default function LimitStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="limits" frames={deriveLimit(LIMIT_CANONICAL).frames} />;
  return <CalculusStage<LimitState> kind="limits" title="Approach a point from both sides" canonical={LIMIT_CANONICAL} derive={deriveLimit}
    specs={limitSpecs} fields={() => ['a', 'x']} presets={limitPresets} presetLegend="Choose a function" />;
}
