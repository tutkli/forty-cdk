import { linkedSignal, untracked, type WritableSignal } from '@angular/core';

import { tryReadHandle } from 'forty-cdk/core';
import type { ForComboboxInitialFocus, ForComboboxOptionHandle } from './combobox-context';
import type { VirtualizedNavigator } from './combobox-virtualized-navigator';

/**
 * Inputs for {@link resolveAutoHighlightSeed}. Mirror the tracked source of the
 * host's `#activeId` linkedSignal: the live registered options, the current
 * selection (for `initialFocus === 'selected'`), and the equality fn used to
 * match selected values to options.
 */
export interface AutoHighlightSeedInput<T> {
  /** Live registered options in DOM order. */
  readonly items: readonly ForComboboxOptionHandle<T>[];
  /** Where auto-highlight should land: first / last enabled, or the selection. */
  readonly initialFocus: ForComboboxInitialFocus;
  /** Current selection — only read when `initialFocus === 'selected'`. */
  readonly value: readonly T[];
  /** Identity comparison used to match a selected value to a registered option. */
  readonly equals: (a: T, b: T) => boolean;
}

/**
 * Reactive source for the host's `#activeId` linkedSignal. Each accessor reads
 * one of the host signals the activedescendant decision depends on.
 */
export interface ActiveIdSource<T> {
  /** Visible input text — a change drops the prior pointer (it may be filtered out). */
  readonly query: () => string;
  /** Whether the listbox is open. */
  readonly open: () => boolean;
  /** Whether auto-highlight is enabled. */
  readonly autoHighlight: () => boolean;
  /** `true` when the consumer set `totalCount()` (virtualized path). */
  readonly virtualized: () => boolean;
  /** Where auto-highlight should land. */
  readonly initialFocus: () => ForComboboxInitialFocus;
  /** Live registered options in DOM order. */
  readonly items: () => readonly ForComboboxOptionHandle<T>[];
  /** Current selection — only read for `initialFocus === 'selected'`. */
  readonly value: () => readonly T[];
  /** Identity comparison used to match a selected value to a registered option. */
  readonly equals: () => (a: T, b: T) => boolean;
}

/**
 * Build the host's activedescendant pointer as a `linkedSignal` so the
 * "what should be highlighted given open / items / autoHighlight" decision is a
 * **pure derivation**, never a write from an `effect` (the banned
 * state-propagation pattern). The returned signal is still writable for the
 * genuinely imperative moves that own their own scroll — arrow / Home / End
 * navigation, pointer-move hover, multi-mode activation, and the virtualized
 * pending-nav resolution (`navigate` / `seedFromIndexedSnapshot` /
 * `tryResolvePending` in `combobox-virtualized-navigator.ts`).
 *
 * The reset/seed rule, in order:
 * - On a `query` change the previously-active option may have been filtered
 *   out, so the prior pointer is dropped.
 * - A pointer that no longer matches a registered option is dropped (covers the
 *   consumer mutating the list without touching `query`).
 * - When a valid pointer survives, it is preserved (arrow nav, hover).
 * - Otherwise, in the **non-virtualized** case, auto-highlight seeds the
 *   first / last enabled option (per `initialFocus`) while the listbox is open
 *   via {@link resolveAutoHighlightSeed}. The virtualized case returns `null`
 *   here and the host's effect seeds it imperatively, because that seed must
 *   order options by absolute `posInSet` and must lose to a pending
 *   `(scrollToIndex)` resolution.
 *
 * Internal — not re-exported from `combobox/index.ts` or `public-api.ts`.
 */
export function createActiveIdSignal<T>(source: ActiveIdSource<T>): WritableSignal<string | null> {
  return linkedSignal<
    {
      query: string;
      open: boolean;
      autoHighlight: boolean;
      virtualized: boolean;
      initialFocus: ForComboboxInitialFocus;
      items: readonly ForComboboxOptionHandle<T>[];
      value: readonly T[];
      equals: (a: T, b: T) => boolean;
    },
    string | null
  >({
    source: () => ({
      query: source.query(),
      open: source.open(),
      autoHighlight: source.autoHighlight(),
      virtualized: source.virtualized(),
      initialFocus: source.initialFocus(),
      items: source.items(),
      value: source.value(),
      equals: source.equals(),
    }),
    computation: (
      { query, open, autoHighlight, virtualized, initialFocus, items, value, equals },
      prev,
    ) => {
      const queryChanged = prev !== undefined && prev.source.query !== query;
      let current = queryChanged ? null : (prev?.value ?? null);
      if (current !== null && !items.some((o) => o.id() === current)) {
        current = null;
      }
      if (current !== null) {
        return current;
      }
      if (virtualized || !autoHighlight || !open || items.length === 0) {
        return null;
      }
      return resolveAutoHighlightSeed({ items, initialFocus, value, equals });
    },
  });
}

/**
 * Resolve the auto-highlight seed for the **non-virtualized** combobox: the id
 * of the option `aria-activedescendant` should fall on when the listbox is open
 * and no pointer survives. Returns `null` when no enabled option qualifies (or
 * when a `'selected'` seed can't yet read its options — see `tryReadHandle`).
 *
 * Pure over its inputs — no signal reads, no DOM access — so the host can call
 * it from inside its `#activeId` linkedSignal computation without leaking the
 * banned write-from-effect pattern. The virtualized branch seeds imperatively
 * via the navigator instead (it orders by absolute `posInSet` and must lose to
 * a pending `(scrollToIndex)` resolution).
 *
 * Internal — not re-exported from `combobox/index.ts` or `public-api.ts`.
 */
export function resolveAutoHighlightSeed<T>(input: AutoHighlightSeedInput<T>): string | null {
  const { items, initialFocus, value, equals } = input;
  if (initialFocus === 'selected') {
    const selected = findSelectedEnabled(items, value, equals);
    if (selected === NOT_READY) {
      return null;
    }
    if (selected) {
      return selected.id();
    }
  }
  const target = initialFocus === 'last' ? findLastEnabled(items) : findFirstEnabled(items);
  return target?.id() ?? null;
}

function findFirstEnabled<T>(
  items: readonly ForComboboxOptionHandle<T>[],
): ForComboboxOptionHandle<T> | null {
  for (const item of items) {
    if (!item.disabled()) {
      return item;
    }
  }
  return null;
}

function findLastEnabled<T>(
  items: readonly ForComboboxOptionHandle<T>[],
): ForComboboxOptionHandle<T> | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item && !item.disabled()) {
      return item;
    }
  }
  return null;
}

const NOT_READY = Symbol('forty-cdk/combobox:not-ready');

function findSelectedEnabled<T>(
  items: readonly ForComboboxOptionHandle<T>[],
  values: readonly T[],
  equals: (a: T, b: T) => boolean,
): ForComboboxOptionHandle<T> | null | typeof NOT_READY {
  if (values.length === 0) {
    return null;
  }
  for (const item of items) {
    if (item.disabled()) {
      continue;
    }
    const read = tryReadHandle(() => ({ value: item.value() }));
    if (read === null) {
      return NOT_READY;
    }
    if (values.some((sel) => equals(read.value, sel))) {
      return item;
    }
  }
  return null;
}

/**
 * Collaborators the auto-highlight bridge reaches for. The host owns the
 * activedescendant (`getActiveId`) and the last-scrolled-into-view id
 * (`getLastPositionedId` / `setLastPositionedId`); the bridge only reads and
 * writes them through these accessors so it can stay outside the directive.
 */
export interface AutoHighlightBridgeDeps<T> {
  /** Lazily build the virtualization navigator (only when `totalCount` is set). */
  readonly requireNavigator: () => VirtualizedNavigator<T>;
  /** Live registered options in DOM order. */
  readonly items: () => readonly ForComboboxOptionHandle<T>[];
  /** Whether the listbox is open. */
  readonly open: () => boolean;
  /** Whether auto-highlight is enabled. */
  readonly autoHighlight: () => boolean;
  /** `true` when the consumer set `totalCount()` (virtualized path). */
  readonly virtualized: () => boolean;
  /** Where auto-highlight should land. */
  readonly initialFocus: () => ForComboboxInitialFocus;
  /** Read the host's current activedescendant id (call inside `untracked`). */
  readonly getActiveId: () => string | null;
  /** Last id the bridge scrolled into view, to avoid re-scrolling on hover. */
  readonly getLastPositionedId: () => string | null;
  /** Persist the last id the bridge scrolled into view. */
  readonly setLastPositionedId: (id: string | null) => void;
}

/**
 * The **imperative tail** of the auto-highlight flow, run from the host's
 * constructor `effect`. The activedescendant *decision* is a pure derivation in
 * {@link createActiveIdSignal}; this only performs the side effects that escape
 * the reactive graph. It reacts to `items()`, `autoHighlight()` and `open()`:
 *
 * The label cache is deliberately **not** pulled here: pulling it tracks the
 * selection, and this effect writes activedescendant and scrolls, so it would
 * re-run those writes on every commit of `value`. The root owns a separate
 * read-only effect for that pull. The virtualization navigator (and its
 * position-map) is primed here, but only when the consumer set `totalCount()`, so
 * a plain combobox never builds it.
 *
 * 1. Virtualized only: resolves a pending `(scrollToIndex)` navigation — once
 *    the option for the requested posInSet mounts, `tryResolvePending` seeds
 *    activedescendant to its id and scrolls it into view. This is the single
 *    sanctioned activedescendant write from an effect, and it is a legitimate
 *    side effect (not state propagation): it integrates the consumer's
 *    virtualizer mounting a row asynchronously, and it must win over the
 *    auto-highlight seed — which is why the virtualized seed can't live in the
 *    linkedSignal. `seedFromIndexedSnapshot` then seeds the topmost / bottommost
 *    *rendered* enabled option (ordered by absolute `posInSet`) deliberately
 *    passively — it only moves the pointer, never the consumer's scroll position.
 * 2. Non-virtualized: scrolls the auto-highlight-seeded option into view so a
 *    seed that lands below the fold is visible, for parity with `navigate()`.
 *    The seed itself comes from the linkedSignal; this is its imperative tail.
 *    The activedescendant is read `untracked` so the scroll never re-triggers
 *    the effect, and pointer-move hover doesn't reach here (it changes none of
 *    the tracked reads), so hovering never scrolls. This handles a re-seed while
 *    the listbox is already open (e.g. the consumer's filter dropped the active
 *    option). The **initial open** scroll runs here too but is wiped a tick
 *    later when `[forComboboxContent]` portals to `document.body` (which resets
 *    `scrollTop`); `ForCombobox.scrollActiveOptionIntoView` re-applies it from
 *    the positioner's first-resolved-position hook, after the portal move and
 *    after the surface is sized (#1066).
 *
 * Internal — not re-exported from `combobox/index.ts` or `public-api.ts`.
 */
export function runAutoHighlightBridge<T>(deps: AutoHighlightBridgeDeps<T>): void {
  const items = deps.items();
  const open = deps.open();
  const autoHighlight = deps.autoHighlight();
  const virtualized = deps.virtualized();

  if (virtualized) {
    const navigator = deps.requireNavigator();
    navigator.prime();
    if (navigator.tryResolvePending()) {
      return;
    }
    if (autoHighlight && open && untracked(() => deps.getActiveId()) === null && items.length > 0) {
      navigator.seedFromIndexedSnapshot(deps.initialFocus() === 'last' ? 'last' : 'first');
    }
    return;
  }

  if (!open) {
    deps.setLastPositionedId(null);
    return;
  }
  const activeId = untracked(() => deps.getActiveId());
  if (activeId === null || activeId === deps.getLastPositionedId()) {
    return;
  }
  const active = items.find((o) => o.id() === activeId);
  active?.host.scrollIntoView?.({ block: 'nearest' });
  deps.setLastPositionedId(activeId);
}
