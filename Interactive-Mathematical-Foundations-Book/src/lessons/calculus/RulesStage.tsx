import CalculusStage, { CalculusWorkedStage } from './CalculusStage';
import { deriveRules, RULES_CANONICAL, rulesChoices, rulesFields, rulesPresets, rulesSpecs, type RulesState } from './rules-lesson';
export default function RulesStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CalculusWorkedStage kind="rules" frames={deriveRules(RULES_CANONICAL).frames} />;
  return <CalculusStage<RulesState> kind="rules" title="Derive sum, product and quotient rules" canonical={RULES_CANONICAL} derive={deriveRules}
    specs={rulesSpecs} fields={rulesFields} presets={rulesPresets} choices={rulesChoices} presetLegend="Choose a configuration" />;
}
