import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { CHAIN_CANONICAL, chainChoices, chainPresets, chainSpecs, deriveChain, type ChainState } from './chain-lesson';
export default function ChainStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="chain" frames={deriveChain(CHAIN_CANONICAL).frames} />;
  return <CalculusStage<ChainState> kind="chain" title="Propagate a change through nested functions" canonical={CHAIN_CANONICAL} derive={deriveChain}
    specs={chainSpecs} fields={() => ['x', 'dx']} presets={chainPresets} choices={chainChoices} presetLegend="Choose a composition" />;
}
