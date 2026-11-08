import { Directive, effect, input, numberAttribute, output } from '@angular/core';

import {
  isRangeSelectShortcut,
  runVirtualizedNavigatorBridge,
  throwUnsupportedVirtualizedRangeSelect,
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
   * Focus-entry hint: the absolute index of the committed option within the full source dataset.
   * Focusing the listbox seeds the committed option, and this index places it when the option lies
   * outside the rendered window and has never been rendered. Bind it from the consumer's own
   * value→index lookup.
   *
   * This is a hint, **not** a selection source: `value` / `[(value)]` stay authoritative. It is
   * singular, so in multiple mode it places the first committed option. Leave unset (default) when
   * the committed option is always inside the initial window. An off-window committed value with no
   * `[selectedIndex]` that was never rendered falls back to the first rendered enabled option; an
   * out-of-range index (or an empty selection) is ignored.
   */
  readonly selectedIndex = input<number | undefined>(undefined);

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
   * window, or when focusing the listbox seeds an off-window option: the option
   * it was on before that option scrolled out, else the committed one. The
   * consumer passes this index to `injectVirtualizer`'s `scrollToIndex` so the
   * correct option mounts.
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
    selectedIndex: this.selectedIndex,
    resume: this.#resume,
    navigator: () => this.#requireNavigator(),
    rejectRangeSelect: (event) => this.#rejectRangeSelect(event),
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
}
