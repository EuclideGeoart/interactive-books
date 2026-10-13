import planData from './plan.json' with { type: 'json' };

/** @typedef {{id:string, slug:string}} ChapterRegistration */
/** @typedef {{part:string, chapters:readonly ChapterRegistration[]}} PartManifest */
/** @typedef {{id:string, title:string, role?:string}} PlannedChapter */
/** @typedef {{id:string,numeral:string,title:string,slug:string,chapters:readonly PlannedChapter[]}} PartPlan */
/** @type {readonly PartPlan[]} */
export const plan = planData;

/** One registration validator is used by Astro discovery and the Node validation runners.
 * @param {Readonly<Record<string, PartManifest>>} manifests
 */
export function registerParts(manifests) {
  /** @type {Map<string, ChapterRegistration>} */
  const registered = new Map();
  const slugs = new Set();
  for (const [path, manifest] of Object.entries(manifests).sort(([a], [b]) => a.localeCompare(b))) {
    const owner = path.match(/^\.\.\/parts\/(p0[1-9])\/manifest\.json$/)?.[1];
    if (!owner || manifest?.part !== owner || !Array.isArray(manifest.chapters)) throw new Error(`Wrong manifest owner or structure: ${path}`);
    const part = plan.find(p => p.id === owner);
    if (!part) throw new Error(`Unknown Part: ${owner}`);
    for (const chapter of manifest.chapters) {
      if (!part.chapters.some(c => c.id === chapter.id)) throw new Error(`${chapter.id} is not owned by ${part.id}`);
      if (typeof chapter.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapter.slug)) throw new Error(`Invalid chapter slug: ${chapter.slug}`);
      if (registered.has(chapter.id) || slugs.has(chapter.slug)) throw new Error(`Repeated chapter ID or slug: ${chapter.id}`);
      registered.set(chapter.id, chapter); slugs.add(chapter.slug);
    }
  }
  return plan.map(part => ({ ...part, chapters: part.chapters.map(chapter => ({
    ...chapter, partId: part.id, numeral: part.numeral, slug: registered.get(chapter.id)?.slug,
    status: registered.has(chapter.id) ? 'available' : 'planned',
  })) }));
}
