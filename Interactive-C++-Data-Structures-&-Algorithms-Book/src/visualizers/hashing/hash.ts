/** Polynomial-31 over lowercase ASCII, modulo 2^32; teaching policy, not a production hash. */
export function teachingHash(key: string): number {
  let hash = 0;
  for (const character of key) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return hash;
}
export function validateKey(key: string): void {
  if (!/^[a-z]{1,12}$/.test(key)) throw new Error('Use one to twelve lowercase ASCII letters for a teaching key.');
}
