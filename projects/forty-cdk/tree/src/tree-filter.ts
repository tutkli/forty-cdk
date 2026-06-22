/**
 * Returns the de-duplicated ancestor values that must be added to a tree's
 * `expanded` set so every matched node becomes visible.
 *
 * Pure and headless: filtering stays consumer-owned — the consumer matches its
 * own data, re-renders the tree, and feeds its hierarchy through `ancestorsOf`.
 * Merge the result into `[(expanded)]`:
 *
 * ```ts
 * this.expanded.update((open) => [
 *   ...new Set([...open, ...expandToReveal(matches, this.ancestorsOf)]),
 * ]);
 * ```
 *
 * The matched nodes themselves are not returned — a node is made visible by
 * expanding its ancestors, so a root-level match contributes nothing.
 *
 * @param matches The values of the nodes that matched the current filter.
 * @param ancestorsOf Returns a node's ancestor values (the node itself excluded);
 *   order is irrelevant and a root node returns an empty list.
 * @returns The unique ancestor values to expand. Empty when `matches` is empty
 *   or every match is a root.
 */
export function expandToReveal(
  matches: Iterable<string>,
  ancestorsOf: (value: string) => readonly string[],
): readonly string[] {
  const reveal = new Set<string>();
  for (const match of matches) {
    for (const ancestor of ancestorsOf(match)) {
      reveal.add(ancestor);
    }
  }
  return [...reveal];
}
