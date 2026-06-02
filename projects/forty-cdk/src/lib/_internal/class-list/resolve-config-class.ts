/**
 * Collapse a config's `class` / `classList` into a single space-separated
 * string suitable for an Angular `[class]` binding or an `el.className`
 * assignment. De-duplicates tokens and drops empty entries so the rendered
 * `class` attribute stays clean. Returns `null` when neither field carries a
 * class.
 *
 * Shared by every imperative overlay manager (`ForToastManager`,
 * `ForDialogManager`, `ForDrawerManager`, and any future one) so the
 * `class` / `classList` config resolves identically across primitives:
 * applied to the overlay root, merged with — never clobbering — the
 * directive's own host attributes (`data-state`, `data-side`, …).
 *
 * @internal
 */
export function resolveConfigClass(config: {
  class?: string;
  classList?: string | readonly string[];
}): string | null {
  const tokens: string[] = [];
  const push = (value: string | readonly string[] | undefined): void => {
    if (typeof value === 'string') {
      tokens.push(...value.split(/\s+/));
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        tokens.push(...entry.split(/\s+/));
      }
    }
  };
  push(config.class);
  push(config.classList);
  const unique = [...new Set(tokens.filter(Boolean))];
  return unique.length > 0 ? unique.join(' ') : null;
}
