export function expectedRoutes(slugs: readonly string[], baseURL: string): string[] {
  if (slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug))) throw new Error('Every published chapter must have a valid slug');
  return [...new Set(['./', 'contents/', 'foundation/', ...slugs.map(slug => `chapters/${slug}/`)].map(path => new URL(path, baseURL).pathname))];
}

export function routeBatches<T>(routes: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(routes.length / 8) }, (_, index) => routes.slice(index * 8, (index + 1) * 8));
}

export async function visitRoutes(expected: readonly string[], visit: (path: string) => Promise<void>, visited: Set<string>): Promise<void> {
  // The finite publication manifest is the bound, not an arbitrary page count or a growing link queue.
  for (const path of new Set(expected)) { await visit(path); visited.add(path); }
}

export function routeCoverage(expected: readonly string[], visited: Set<string>) {
  return { expected: [...expected], visited: [...visited], missing: expected.filter(path => !visited.has(path)), unexpected: [...visited].filter(path => !expected.includes(path)) };
}
