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
  const result: { posinset: number; setsize: number }[] = new Array(levels.length);
  const stack: { level: number; members: number[] }[] = [];

  const close = (group: { level: number; members: number[] }): void => {
    const setsize = group.members.length;
    for (const i of group.members) {
      result[i]!.setsize = setsize;
    }
  };

  for (let index = 0; index < levels.length; index++) {
    const level = levels[index]!;
    while (stack.length > 0 && stack[stack.length - 1]!.level > level) {
      close(stack.pop()!);
    }
    const top = stack[stack.length - 1];
    if (top && top.level === level) {
      top.members.push(index);
      result[index] = { posinset: top.members.length, setsize: 0 };
    } else {
      stack.push({ level, members: [index] });
      result[index] = { posinset: 1, setsize: 0 };
    }
  }

  while (stack.length > 0) {
    close(stack.pop()!);
  }

  return result;
}
