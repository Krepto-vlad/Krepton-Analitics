import type { CSSProperties } from 'react';

/** Passes runtime values into CSS custom properties — the allowed dynamic-style path. */
export function toCssCustomProperties(
  properties: Record<`--${string}`, string | number>
): CSSProperties {
  return properties as CSSProperties;
}
