import { Directive, effect, input, numberAttribute, output } from '@angular/core';

import { type LabelCacheEntry, VirtualizedResume } from 'forty-cdk/core';
import { runAutoHighlightBridge } from './combobox-auto-highlight';
import { injectComboboxContext } from './combobox-context';
import { mergeOffWindowEntries } from './combobox-off-window-merge';
import {
  type ComboboxVirtualizedNavigator,
  createComboboxVirtualizedNavigator,
} from './combobox-virtualized-navigator';

/**
 * Opts a `[forCombobox]` into virtualized navigation, for a listbox whose
 * options the consumer's virtualizer mounts only while they are in view. Placed
 * on the `[forCombobox]` element itself. While `totalCount` is set, each
 * rendered option carries `aria-setsize` / `aria-posinset`, keyboard navigation
 * reaches options outside the rendered window through `(scrollToIndex)`, and
 * inline autocomplete matches options scrolled out of view.
 *
 * A combobox without this directive never bundles the virtualized navigation
 * engine.
 *
 * @example
 * ```html
 * <div forCombobox forComboboxVirtualized [totalCount]="items.length"
 *      [visibleRange]="range()" (scrollToIndex)="virtualizer.scrollToIndex($event)">
 *   …
 * </div>
 * ```
 */
@Directive({
  selector: '[forComboboxVirtualized]',
  exportAs: 'forComboboxVirtualized',
})
export class ForComboboxVirtualized {
  readonly #ctx = injectComboboxContext('ForComboboxVirtualized');

  /**
   * Total number of options in the consumer's source array. Set when wiring
   * up a virtualized listbox (only the visible window is rendered) so the
   * combobox can reflect `aria-setsize` and walk the snapshot for
   * navigation past the rendered range. Leave unset (default `undefined`) and
   * the combobox falls back to `options().length` (the live registry).
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` range of options currently rendered
   * in the DOM. Used to translate "move to absolute position N" into either an
   * in-window highlight update or a request to the consumer to scroll N into
   * view (`(scrollToIndex)`). When `undefined` (default), navigation assumes
   * every option in the snapshot is rendered.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Tells the combobox the source dataset changed **without** a `totalCount`
   * transition — a same-length re-sort or refresh (e.g. sorting a 1000-row
   * list). Bind any value that changes on such a refresh (a version counter,
   * the array reference, a sort-key string); when it changes the position
   * snapshot rebuilds from empty so navigation never resolves against a stale
   * off-window entry. Leave unset (default) when the dataset only ever changes
   * length. Equivalent to calling {@link ForComboboxVirtualized.invalidateSnapshot}
   * imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when keyboard navigation needs to land on an option whose
   * absolute index falls outside `visibleRange()`. Wire this to the
   * consumer's virtualizer (`scrollToIndex(idx)` on `@tanstack/virtual`,
   * `virtua`, etc.); once the option mounts, the combobox seeds
   * `aria-activedescendant` automatically.
   */
  readonly scrollToIndex = output<number>();

  #navigator: ComboboxVirtualizedNavigator<unknown> | null = null;

  readonly #resume = new VirtualizedResume<unknown, LabelCacheEntry<unknown>>({
    totalCount: this.totalCount,
    snapshotByPos: () => this.#requireNavigator().snapshotByPos(),
    compareWith: this.#ctx.compareWith,
  });

  readonly #host = this.#ctx.registerVirtualization({
    totalCount: this.totalCount,
    resume: this.#resume,
    navigator: () => this.#requireNavigator(),
    completionEntries: (liveWindow) =>
      mergeOffWindowEntries(
        liveWindow,
        this.#requireNavigator().snapshotByPos(),
        this.#ctx.itemToFormValue(),
      ),
  });

  constructor() {
    // The activedescendant decision is a pure derivation in the root's
    // `#activeId`; this effect runs only its virtualized imperative tail,
    // documented on `runAutoHighlightBridge` in `combobox-auto-highlight.ts`.
    // @sanctioned-pull(navigator-position-map): the rendered window is transient,
    // so a window nothing reads during is lost to the lazy fold.
    effect(() => {
      runAutoHighlightBridge({
        requireNavigator: () => this.#requireNavigator(),
        items: this.#ctx.options,
        open: this.#ctx.open,
        autoHighlight: this.#host.autoHighlight,
        virtualized: () => this.totalCount() !== undefined,
        initialFocus: this.#ctx.initialFocus,
        getActiveId: () => this.#host.getActiveId(),
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

  #requireNavigator(): ComboboxVirtualizedNavigator<unknown> {
    return (this.#navigator ??= createComboboxVirtualizedNavigator(
      {
        items: this.#ctx.options,
        totalCount: this.totalCount,
        visibleRange: this.visibleRange,
        loop: this.#ctx.loop,
        getActiveId: () => this.#host.getActiveId(),
        setActiveId: (id) => this.#host.setActiveId(id),
        emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
        getResumePos: () => this.#resume.pos(),
        dataVersion: this.dataVersion,
      },
      (host) => this.#host.scrollActiveIntoView(host),
    ));
  }
}
