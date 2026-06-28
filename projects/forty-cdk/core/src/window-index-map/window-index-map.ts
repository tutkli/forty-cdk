/** Previous and new absolute (dataset) index of a reordered windowed row. */
export interface WindowReorderResult {
  /** Previous absolute (dataset) index of the lifted row (0-based). */
  readonly from: number;
  /** New absolute (dataset) index the lifted row moves to (0-based). */
  readonly to: number;
}

/**
 * Absolute index of `value` once the lifted row at `from` has been removed from
 * the dataset: every index above `from` shifts down by one to close the gap the
 * removal opened. The single post-removal shift both insertion branches of
 * {@link translateWindowReorder} share, so the `> from ? 1 : 0` surgery lives in
 * one place rather than being re-derived per branch (the off-by-one shape behind
 * the #808 `gapIndex` overflow).
 */
function indexAfterRemoval(value: number, from: number): number {
  return value - (value > from ? 1 : 0);
}

/**
 * Translates a windowed list's window-relative `previousIndex` / `currentIndex`
 * into absolute dataset indices, so a virtualized list's consumer can apply
 * `moveItemInArray` over the **full** array. `windowIndices` holds the absolute
 * index of every rendered draggable row, in DOM (ascending) order — its length
 * is the rendered window size; `previousIndex` is the lifted row's position in
 * that window and `currentIndex` the resolved insertion index (post-removal
 * space, `0..windowIndices.length - 1`). Reduces to the identity when the window
 * spans the whole dataset, so a non-virtualized list is unaffected.
 */
export function translateWindowReorder(
  windowIndices: readonly number[],
  previousIndex: number,
  currentIndex: number,
): WindowReorderResult {
  const from = windowIndices[previousIndex] ?? previousIndex;
  const rest = windowIndices.filter((_, i) => i !== previousIndex);
  if (currentIndex >= rest.length) {
    const last = rest[rest.length - 1];
    if (last === undefined) {
      return { from, to: from };
    }
    return { from, to: indexAfterRemoval(last + 1, from) };
  }
  const target = rest[currentIndex]!;
  return { from, to: indexAfterRemoval(target, from) };
}

/** Geometry and state for {@link resolveScrubReorder}. */
export interface ScrubReorderParams {
  /**
   * Whether the windowed-scrub affordance is engaged for this gesture (e.g. a
   * modifier key held during a pointer drag). When `false`, scrubbing is off and
   * the resolver returns `null` so the caller falls back to mounted-rect drop
   * resolution.
   */
  readonly engaged: boolean;
  /** Pointer position along the scroll axis, in client pixels. */
  readonly pointer: number;
  /** Scroll viewport's start edge along the scroll axis, in client pixels (top when vertical). */
  readonly viewportStart: number;
  /** Scroll viewport's end edge along the scroll axis, in client pixels (bottom when vertical). */
  readonly viewportEnd: number;
  /** Absolute (dataset) index of the lifted row. */
  readonly from: number;
  /** Total number of items in the full (non-windowed) dataset. */
  readonly count: number;
}

/**
 * Resolves a **windowed-scrub** drop: maps the pointer's position over the scroll
 * viewport to an absolute dataset index, so a single gesture can drop a lifted row
 * at an arbitrary far target without auto-scroll having to mount it first. The
 * viewport's main-axis extent maps linearly onto the whole dataset — the start
 * edge targets index `0`, the end edge the last index — independent of which rows
 * are currently rendered, so a concurrent auto-scroll never desyncs the result.
 *
 * Returns `null` when scrubbing is not engaged or the geometry is degenerate
 * (zero-height viewport, empty dataset); the caller then uses its normal
 * mounted-rect resolution, leaving the in-window path unchanged. Otherwise returns
 * the post-removal `from` / `to` pair (matching {@link translateWindowReorder}), so
 * `moveItemInArray` over the full array moves the right row.
 */
export function resolveScrubReorder(params: ScrubReorderParams): WindowReorderResult | null {
  if (!params.engaged || params.count <= 0) {
    return null;
  }
  const span = params.viewportEnd - params.viewportStart;
  if (span <= 0) {
    return null;
  }
  const fraction = Math.min(1, Math.max(0, (params.pointer - params.viewportStart) / span));
  const target = Math.round(fraction * (params.count - 1));
  return { from: params.from, to: indexAfterRemoval(target, params.from) };
}
