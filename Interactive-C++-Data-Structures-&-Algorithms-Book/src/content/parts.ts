import { chapters } from './book';

type Chapter = (typeof chapters)[number];
interface PartDefinition {
  numeral: string;
  id: string;
  title: string;
  description: string;
  first: number;
  last: number;
}
export interface BookPart extends PartDefinition { chapters: readonly Chapter[] }

// These are the book's published boundaries; chapter identities remain in book.ts.
const definitions = [
  { numeral: '0', id: 'part-0', title: 'C++ Foundations', first: 0, last: 0, description: 'Read C++, follow pointers, and reason about storage, lifetime and ownership.' },
  { numeral: 'I', id: 'part-i', title: 'Linear Structures', first: 1, last: 5, description: 'Follow links, manage a stack, and build memory pools and intrusive lists.' },
  { numeral: 'II', id: 'part-ii', title: 'Queues & Ordered Access', first: 6, last: 9, description: 'Explore FIFO order, ring buffers, priorities and binary heaps.' },
  { numeral: 'III', id: 'part-iii', title: 'Trees', first: 10, last: 17, description: 'Traverse, mutate and balance trees, from binary search trees to tries.' },
  { numeral: 'IV', id: 'part-iv', title: 'Hashing', first: 18, last: 23, description: 'Turn keys into locations and inspect collisions, probing and map design.' },
  { numeral: 'V', id: 'part-v', title: 'Graphs', first: 24, last: 36, description: 'Represent connections, follow traversals, and find paths and spanning trees.' },
  { numeral: 'VI', id: 'part-vi', title: 'Searching & Sorting', first: 37, last: 44, description: 'Find values and order data while tracking comparisons, moves and cost.' },
  { numeral: 'VII', id: 'part-vii', title: 'Algorithmic Techniques', first: 45, last: 50, description: 'Build solutions with recursion, backtracking, greedy choices and dynamic programming.' },
  { numeral: 'VIII', id: 'part-viii', title: 'Engine & Systems', first: 51, last: 59, description: 'Manage storage, handles, ECS data, work lists and concurrent handoffs.' },
  { numeral: 'IX', id: 'part-ix', title: 'Spatial Structures', first: 60, last: 66, description: 'Partition space and query points and bounds with grids, trees and hierarchies.' },
] satisfies readonly PartDefinition[];

export const parts: readonly BookPart[] = definitions.map(part => ({
  ...part,
  chapters: chapters.filter(chapter => Number(chapter.number) >= part.first && Number(chapter.number) <= part.last),
}));

export function partForChapter(number: string): BookPart | undefined {
  return parts.find(part => part.chapters.some(chapter => chapter.number === number));
}
