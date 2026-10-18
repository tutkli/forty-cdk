import { Directive, effect, input, numberAttribute, output } from '@angular/core';

import {
  isRangeSelectShortcut,
  runVirtualizedNavigatorBridge,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
  VirtualizedResume,
} from 'forty-cdk/core';
import { injectListboxContext } from './listbox-context';
import {
  createListboxVirtualizedNavigator,
  type ListboxPositionEntry,
  type ListboxVirtualizedNavigator,
} from './listbox-virtualized-navigator';

/**
 * Opts a `[forListbox]` into the virtualized focus model, for a list whose
 * options the consumer's virtualizer mounts only while they are in view. Placed
 * on the `[forListbox]` element itself. While `totalCount` is set, DOM focus
 * stays on the listbox host, the active option is reflected as
 * `aria-activedescendant`, each rendered option carries `aria-setsize` /
 * `aria-posinset`, and keyboard navigation and typeahead reach options outside
 * the rendered window through `(scrollToIndex)`.
 *
 * A listbox without this directive never bundles the virtualized navigation
 * engine.
 *
 * @example
 * ```html
 * <div forListbox forListboxVirtualized [totalCount]="items.length"
 *      [visibleRange]="range()" (scrollToIndex)="virtualizer.scrollToIndex($event)">
 *   …
 * </div>
 * ```
 */
@Directive({
  selector: '[forListboxVirtualized]',
  exportAs: 'forListboxVirtualized',
})
export class ForListboxVirtualized {
  readonly #ctx = injectListboxContext('ForListboxVirtualized');

  /**
   * Total number of items in the source data. When set, enables the
   * virtualized activedescendant focus model and populates `aria-setsize`
   * on each rendered option. Leave unset (default `undefined`) for the
   * standard roving-tabindex model.
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` index range of the currently rendered
   * options. The virtualizer provides this; the listbox uses it to decide
   * whether a navigation target is in the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Tells the listbox the source dataset changed **without** a `totalCount`
   * transition — a same-length re-sort or refresh (e.g. sorting a 1000-row
   * list). Bind any value that changes on such a refresh (a version counter,
   * the array reference, a sort-key string); when it changes the position
   * snapshot rebuilds from empty so navigation never resolves against a stale
   * off-window entry. Leave unset (default) when the dataset only ever changes
   * length. Equivalent to calling {@link ForListboxVirtualized.invalidateSnapshot}
   * imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when keyboard navigation reaches an option outside the rendered
   * window. The consumer passes this index to `injectVirtualizer`'s
   * `scrollToIndex` so the correct option mounts.
   */
  readonly scrollToIndex = output<number>();

  #navigator: ListboxVirtualizedNavigator<unknown> | null = null;

  readonly #resume = new VirtualizedResume<unknown, ListboxPositionEntry<unknown>>({
    totalCount: this.totalCount,
    snapshotByPos: () => this.#requireNavigator().snapshotByPos(),
    compareWith: this.#ctx.compareWith,
  });

  readonly #host = this.#ctx.registerVirtualization({
    totalCount: this.totalCount,
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
        items: this.#ctx.options,
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

  #requireNavigator(): ListboxVirtualizedNavigator<unknown> {
    return (this.#navigator ??= createListboxVirtualizedNavigator(
      {
        items: this.#ctx.options,
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
      primitive: 'listbox',
      focusModel: 'roving-tabindex',
      collection: 'listbox',
      shortcuts: 'Shift+Arrow, Shift+Space, Ctrl/Cmd+A, Ctrl+Shift+Home/End',
      alternative: 'Toggle options individually with Enter, Space, or click',
    });
    return true;
  }

  #assertSelectionFollowsFocusSupported(): void {
    if (this.#ctx.selectionFollowsFocus()) {
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'listbox',
        focusModel: 'roving-tabindex',
        collection: 'listbox',
      });
    }
  }
}
