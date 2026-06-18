/**
 * Computes `aria-posinset` / `aria-setsize` for every node in a **flat** list of
 * hierarchical rows, where depth is given only by each node's 1-based `level`
 * (as in an ARIA treegrid: rows are DOM siblings, hierarchy lives in `aria-level`).
 *
 * For a node at level `L`, its siblings are the nodes at the same level under the
 * same parent: contiguous `level === L` entries, skipping any deeper descendants
 * between them and bounded by the first shallower (`level < L`) entry on each side.
 *
 * Returns one `{ posinset, setsize }` entry per input level, in the same order.
 * Both are 1-based. An empty input returns an empty array.
 */
export function computeFlatHierarchy(
  levels: readonly number[],
): { posinset: number; setsize: number }[] {
  return levels.map((level, index) => {
    let before = 0;
    for (let i = index - 1; i >= 0; i--) {
      const l = levels[i]!;
      if (l < level) break;
      if (l === level) before++;
    }
    let after = 0;
    for (let i = index + 1; i < levels.length; i++) {
      const l = levels[i]!;
      if (l < level) break;
      if (l === level) after++;
    }
    return { posinset: before + 1, setsize: before + 1 + after };
  });
}
