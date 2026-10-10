/** Split "What does a vector actually *store*?" into plain and emphasised runs (no HTML injection from content). */
export function emphasisRuns(text: string): { text: string; em: boolean }[] {
  return text.split('*').map((part, i) => ({ text: part, em: i % 2 === 1 })).filter(run => run.text !== '');
}
