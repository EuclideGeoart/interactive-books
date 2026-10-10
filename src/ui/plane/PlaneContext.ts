import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { Viewport } from '../../platform/geometry/viewport';

export interface PlaneContextValue {
  readonly vp: Viewport;
  readonly svgRef: RefObject<SVGSVGElement>;
}

export const PlaneContext = createContext<PlaneContextValue | null>(null);

export function usePlane(): PlaneContextValue {
  const value = useContext(PlaneContext);
  if (!value) throw new Error('Plane primitives must be rendered inside <CoordinatePlane>');
  return value;
}
