/**
 * The two members a bridge effect needs from the navigation engine: the
 * position-map pull and the pending-navigation resolve. Structural on purpose —
 * Select, Listbox and Combobox hold a {@link VirtualizedNavigator} directly,
 * while Tree reaches the same pair through its activedescendant focus model,
 * which wraps one.
 */
export interface VirtualizedNavigatorBridgeTarget {
  /** @see VirtualizedNavigator.prime */
  prime(): void;
  /** @see VirtualizedNavigator.tryResolvePending */
  tryResolvePending(): boolean;
}

/** Signal-graph wiring for {@link runVirtualizedNavigatorBridge}. */
export interface VirtualizedNavigatorBridgeDeps<N extends VirtualizedNavigatorBridgeTarget> {
  /**
   * The live handle window. Read for its dependency alone — the bridge never
   * looks at the value — so the effect re-runs whenever the consumer's
   * virtualizer mounts or unmounts a row.
   */
  readonly items: () => unknown;
  /** Whether the consumer set `totalCount` (the virtualized path). */
  readonly virtualized: () => boolean;
  /**
   * Resolve the navigation engine, constructing it on first use. Called only on
   * the virtualized branch so a plain collection never builds the position-map
   * machinery.
   */
  readonly requireNavigator: () => N;
}

/**
 * The position-map bridge every virtualized collection primitive runs from a
 * single `effect()`: it pulls the navigator's position snapshot while the
 * rendered window is tracked, then resolves any pending off-window navigation
 * the freshly-mounted window can now satisfy. Returns `true` when a pending
 * request was resolved (or continued), so a caller with further work — the
 * Combobox auto-highlight bridge — can stand down.
 *
 * The pull is the load-bearing half and is **not** redundant with the resolve
 * next to it: `tryResolvePending` reads `items()` and the matched handle, never
 * the snapshot, and returns early when nothing is pending. Without the pull the
 * snapshot is a lazy derivation over a transient source, so the positions of
 * every window the user scrolls past never enter the map and off-window
 * navigation stops resolving. The effect that runs this therefore carries the
 * sanctioned-pull marker naming `navigator-position-map` (spelled out only at
 * the marker itself, so the library's grep ledger stays exact), and any write
 * sharing that effect must already track `items` / `totalCount` / the data
 * version — the pull drags those in. The lint bans the pair outright rather
 * than judging that overlap; Combobox's bridge is the one place it holds.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function runVirtualizedNavigatorBridge<N extends VirtualizedNavigatorBridgeTarget>(
  deps: VirtualizedNavigatorBridgeDeps<N>,
): boolean {
  deps.items();
  if (!deps.virtualized()) {
    return false;
  }
  const navigator = deps.requireNavigator();
  navigator.prime();
  return navigator.tryResolvePending();
}
