/**
 * Island-safe ids. Preact's `useId` is unique within ONE island, but every Astro island is its own root, so two islands
 * on a page both produce "P0-0". A stage wraps itself in <IdScope name="…"> and every id inside is prefixed with that
 * name, which is deterministic on the server and the client (no hydration mismatch) and unique across the page.
 */
import { createContext, type ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import { useId } from 'preact/hooks';

const Scope = createContext('');

export function IdScope({ name, children }: { name: string; children: ComponentChildren }) {
  return <Scope.Provider value={name}>{children}</Scope.Provider>;
}

export function useScopedId(): string {
  const scope = useContext(Scope);
  const id = useId();
  return scope ? `${scope}-${id}` : id;
}
