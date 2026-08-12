import { linkedSignal, untracked, type WritableSignal } from '@angular/core';

import {
  firstEnabledHandle,
  isUnset,
  lastEnabledHandle,
  runVirtualizedNavigatorBridge,
} from 'forty-cdk/core';
import type { ForComboboxInitialFocus, ForComboboxOptionHandle } from './combobox-context';
import type { ComboboxVirtualizedNavigator } from './combobox-virtualized-navigator';

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
 * Builds the host's activedescendant pointer as a `linkedSignal`, so what should be highlighted
 * given `open` / `items` / `autoHighlight` is a pure derivation. The result stays writable for the
 * imperative moves that own their own scroll — arrow navigation, hover, multi-mode activation, and
 * the virtualized pending-nav resolution.
 *
 * The reset and seed rule, in order:
 *
 * - A `query` change drops the prior pointer, since the active option may have been filtered out.
 * - A pointer no longer matching a registered option is dropped, covering a list mutated without
 *   touching `query`.
 * - A surviving valid pointer is preserved.
 * - Otherwise, when not virtualized, {@link resolveAutoHighlightSeed} seeds the first or last
 *   enabled option while the listbox is open. The virtualized case returns `null` and is seeded
 *   imperatively instead, because that seed orders by absolute `posInSet` and must lose to a
 *   pending `(scrollToIndex)` resolution.
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
 * when a `'selected'` seed can't yet read its options — see `isUnset`).
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
  const target = initialFocus === 'last' ? lastEnabledHandle(items) : firstEnabledHandle(items);
  return target?.id() ?? null;
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
    const value = item.value();
    if (isUnset(value)) {
      return NOT_READY;
    }
    if (values.some((sel) => equals(value, sel))) {
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
  readonly requireNavigator: () => ComboboxVirtualizedNavigator<T>;
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
 * The imperative tail of the auto-highlight flow, run from the host's constructor `effect`. The
 * activedescendant *decision* is a pure derivation in {@link createActiveIdSignal}; this performs
 * only the side effects that escape the reactive graph, reacting to `items()`, `autoHighlight()`
 * and `open()`.
 *
 * When virtualized, it resolves a pending `(scrollToIndex)` navigation: once the option for the
 * requested `posInSet` mounts, activedescendant is seeded to its id and scrolled into view. That
 * write takes precedence over the auto-highlight seed. The passive `seedFirstRenderedEnabled` then
 * points at the topmost or bottommost rendered enabled option without touching the consumer's
 * scroll position.
 *
 * When not virtualized, it scrolls the seeded option into view so a seed below the fold is visible,
 * matching `navigate()`. The activedescendant is read `untracked`, so scrolling never re-triggers
 * the effect and hover never scrolls. The initial-open scroll is re-applied by
 * `ForCombobox.scrollActiveOptionIntoView` after the content portals, since portaling resets
 * `scrollTop`.
 *
 * The label cache is not pulled here: it tracks the selection, so every commit of
 * `value` would re-run this effect's writes and scrolls. The position map is pulled, through
 * {@link runVirtualizedNavigatorBridge}, because its sources are already tracked by this bridge's
 * own `items()` read and priming it widens nothing.
 */
export function runAutoHighlightBridge<T>(deps: AutoHighlightBridgeDeps<T>): void {
  const items = deps.items();
  const open = deps.open();
  const autoHighlight = deps.autoHighlight();
  const virtualized = deps.virtualized();

  if (virtualized) {
    const navigator = deps.requireNavigator();
    const resolved = runVirtualizedNavigatorBridge({
      items: deps.items,
      virtualized: deps.virtualized,
      requireNavigator: () => navigator,
    });
    if (resolved) {
      return;
    }
    if (autoHighlight && open && untracked(() => deps.getActiveId()) === null && items.length > 0) {
      navigator.seedFirstRenderedEnabled(deps.initialFocus() === 'last' ? 'last' : 'first');
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
