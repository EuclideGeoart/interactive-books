// Bounded work model: no timer measurements, allocations or retained snapshots.
export function stackWork(size: number, operation: 'push' | 'pop' | 'clear') {
  if (!Number.isInteger(size) || size < 0 || size > 1024) throw new Error('Size must be 0–1024.');
  let releases = 0;
  if (operation === 'clear') for (let i = 0; i < size; i++) releases++;
  else if (operation === 'pop' && size) releases++;
  return { arrayAssignments: operation === 'push' ? 2 : operation === 'pop' && !size ? 0 : 1,
    linkedAllocations: operation === 'push' ? 1 : 0, linkedReleases: releases,
    linkedAssignments: operation === 'push' ? 3 : 2 * releases };
}
