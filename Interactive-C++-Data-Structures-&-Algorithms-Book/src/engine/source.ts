export interface SourceLine { number: number; text: string; tag: string | null }
export function sourceLines(source: string, region?: string): SourceLine[] {
  const all = source.split('\n');
  const begin = region ? all.findIndex(line => line.match(/@begin\s+(\S+)/)?.[1] === region) + 1 : 0;
  const end = region ? all.findIndex(line => line.match(/@end\s+(\S+)/)?.[1] === region) : all.length;
  if (region && (begin === 0 || end === -1)) throw new Error(`Missing C++ region ${region}`);
  return all.slice(begin, end).map((text, i) => ({
    number: begin + i + 1,
    tag: text.match(/@trace ([\w.-]+)/)?.[1] ?? null,
    text: text.replace(/\s*\/\/ @trace .*/, '').replace(/^    /, ''),
  }));
}
export function cleanSource(source: string): string {
  return source.replace(/^.*\/\/ @(begin|end).*$/gm, '').replace(/\s*\/\/ @trace [\w.-]+/g, '');
}
