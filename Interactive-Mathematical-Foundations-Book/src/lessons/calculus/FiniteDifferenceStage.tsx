import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveFD, FD_CANONICAL, fdPresets, fdSpecs, type FDState } from './finite-difference-lesson';
export default function FiniteDifferenceStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="finite-difference" frames={deriveFD(FD_CANONICAL).frames} />;
  return <CalculusStage<FDState> kind="finite-difference" title="Shrink h and watch two errors compete" canonical={FD_CANONICAL} derive={deriveFD}
    specs={fdSpecs} fields={() => ['x', 'k']} presets={fdPresets} presetLegend="Choose a function or step" />;
}
