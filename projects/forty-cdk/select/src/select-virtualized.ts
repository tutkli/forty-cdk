import { Directive, effect, input, numberAttribute, output } from '@angular/core';

import {
  isRangeSelectShortcut,
  runVirtualizedNavigatorBridge,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
  VirtualizedResume,
} from 'forty-cdk/core';
import { injectSelectContext } from './select-context';
import {
  createSelectVirtualizedNavigator,
  type SelectPositionEntry,
  type SelectVirtualizedNavigator,
} from './select-virtualized-navigator';

/**
 * Opts a `[forSelect]` into the virtualized focus model, for a listbox whose
 * options the consumer's virtualizer mounts only while they are in view. Placed
 * on the `[forSelect]` element itself. While `totalCount` is set, DOM focus
 * stays on `[forSelectContent]`, the active option is reflected as
 * `aria-activedescendant`, each rendered option carries `aria-setsize` /
 * `aria-posinset`, and keyboard navigation and typeahead reach options outside
 * the rendered window through `(scrollToIndex)`.
 *
 * A select without this directive never bundles the virtualized navigation
 * engine.
 *
 * @example
 * ```html
 * <div forSelect forSelectVirtualized [totalCount]="items.length"
 *      [visibleRange]="range()" (scrollToIndex)="virtualizer.scrollToIndex($event)">
 *   …
 * </div>
 * ```
 */
@Directive({
  selector: '[forSelectVirtualized]',
  exportAs: 'forSelectVirtualized',
})
export class ForSelectVirtualized {
  readonly #ctx = injectSelectContext('ForSelectVirtualized');

  /**
   * Total number of items in the source data. When set, switches the listbox
   * to the virtualized `aria-activedescendant` focus model and populates
   * `aria-setsize` on each rendered option. Leave unset (default) for the
   * standard DOM-focus model.
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` index range of the currently rendered options, as provided
   * by `injectVirtualizer`. Decides whether a navigation target is inside the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Open-time reveal hint: the absolute index of the currently committed option
   * within the full source dataset. Consulted on open by the scroll-to-selected
   * algorithm as the authoritative index when the committed value's option lies
   * outside the rendered window and has never been rendered (so its position is
   * absent from the navigator snapshot). Bind it from the consumer's own
   * value→index lookup.
   *
   * This is a reveal hint, **not** a selection source — `value` / `[(value)]`
   * stay authoritative; it only decides which option is scrolled into view on
   * open. It is singular: in multiple mode it seeds the first committed option.
   * Leave unset (default) when the committed option is always inside the initial
   * window. An off-window committed value with no `[selectedIndex]` that was never
   * rendered falls back to focusing the first enabled option; an out-of-range
   * index (or an empty selection) is silently ignored.
   */
  readonly selectedIndex = input<number | undefined>(undefined);

  /**
   * Tells the select the source dataset changed **without** a `totalCount`
   * transition — a same-length re-sort or refresh (e.g. sorting a 1000-row
   * list). Bind any value that changes on such a refresh (a version counter,
   * the array reference, a sort-key string); when it changes the position
   * snapshot rebuilds from empty so navigation never resolves against a stale
   * off-window entry. Leave unset (default) when the dataset only ever changes
   * length. Equivalent to calling {@link ForSelectVirtualized.invalidateSnapshot}
   * imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when navigation reaches an option outside the rendered window, or
   * on open-time scroll-to-selected when the committed option's absolute index
   * is resolvable — it is in the rendered window, was previously rendered (in
   * the snapshot), or was supplied via `[selectedIndex]`. Pass to
   * `injectVirtualizer`'s `scrollToIndex` so the correct option mounts.
   */
  readonly scrollToIndex = output<number>();

  #navigator: SelectVirtualizedNavigator<unknown> | null = null;

  readonly #resume = new VirtualizedResume<unknown, SelectPositionEntry<unknown>>({
    totalCount: this.totalCount,
    snapshotByPos: () => this.#requireNavigator().snapshotByPos(),
    compareWith: this.#ctx.compareWith,
  });

  readonly #host = this.#ctx.registerVirtualization({
    totalCount: this.totalCount,
    selectedIndex: this.selectedIndex,
    resume: this.#resume,
    navigator: () => this.#requireNavigator(),
    rejectRangeSelect: (event) => this.#rejectRangeSelect(event),
    assertSelectionFollowsFocusSupported: () => this.#assertSelectionFollowsFocusSupported(),
  });

  constructor() {
    // @sanctioned-pull(navigator-position-map): the rendered window is transient,
    // so a window nothing reads during is lost to the lazy fold.
    effect(() => {
      runVirtualizedNavigatorBridge({
        items: this.#host.items,
        virtualized: () => this.totalCount() !== undefined,
        requireNavigator: () => this.#requireNavigator(),
      });
    });
  }

  /**
   * Force the position snapshot to rebuild from empty on the next fold,
   * discarding stale off-window entries. Call after a same-length dataset
   * refresh (a re-sort / reload that keeps `totalCount` unchanged) when you
   * cannot express the change through the reactive `[dataVersion]` input. No-op
   * while `totalCount` is unset.
   */
  invalidateSnapshot(): void {
    if (this.totalCount() === undefined) {
      return;
    }
    this.#requireNavigator().invalidateSnapshot();
  }

  #requireNavigator(): SelectVirtualizedNavigator<unknown> {
    return (this.#navigator ??= createSelectVirtualizedNavigator(
      {
        items: this.#host.items,
        totalCount: this.totalCount,
        visibleRange: this.visibleRange,
        loop: this.#host.loop,
        getActiveId: () => this.#host.getActiveId(),
        setActiveId: (id) => this.#host.setActiveId(id),
        emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
        getResumePos: () => this.#resume.pos(),
        dataVersion: this.dataVersion,
      },
      (host) => this.#host.scrollActiveIntoView(host),
    ));
  }

  #rejectRangeSelect(event: KeyboardEvent): boolean {
    if (
      !this.#ctx.multiple() ||
      !isRangeSelectShortcut(event, { orientation: this.#ctx.orientation(), dir: this.#ctx.dir() })
    ) {
      return false;
    }
    event.preventDefault();
    throwUnsupportedVirtualizedRangeSelect({
      primitive: 'select',
      focusModel: 'DOM-focus',
      collection: 'listbox',
      shortcuts: 'Shift+Arrow, Shift+Space, Ctrl/Cmd+A, Ctrl+Shift+Home/End',
      alternative: 'Toggle options individually with Enter, Space, or click',
    });
    return true;
  }

  #assertSelectionFollowsFocusSupported(): void {
    if (this.#ctx.selectionFollowsFocus()) {
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'select',
        focusModel: 'DOM-focus',
        collection: 'listbox',
      });
    }
  }
}
