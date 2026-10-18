import { Directive, effect, input, numberAttribute, output } from '@angular/core';

import {
  runVirtualizedNavigatorBridge,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
  VirtualizedResume,
} from 'forty-cdk/core';
import { ActiveDescendantFocusModel, type TreePositionEntry } from './focus-model';
import { injectTreeContext } from './tree-context';

/**
 * Opts a `[forTree]` into the virtualized focus model, for a tree whose
 * flattened nodes the consumer's virtualizer mounts only while they are in
 * view. Placed on the `[forTree]` element itself. While `totalCount` is set,
 * DOM focus stays on the tree host, the active node is reflected as
 * `aria-activedescendant`, and keyboard navigation, entering a child, leaving to
 * a parent and typeahead reach nodes outside the rendered window through
 * `(scrollToIndex)`.
 *
 * A tree without this directive never bundles the virtualized navigation
 * engine.
 *
 * @example
 * ```html
 * <ul forTree forTreeVirtualized [totalCount]="rows().length"
 *     [visibleRange]="range()" (scrollToIndex)="virtualizer.scrollToIndex($event)">
 *   …
 * </ul>
 * ```
 */
@Directive({
  selector: '[forTreeVirtualized]',
  exportAs: 'forTreeVirtualized',
})
export class ForTreeVirtualized {
  readonly #ctx = injectTreeContext('ForTreeVirtualized');

  /**
   * Total number of nodes in the flattened visible-node list. When set, enables
   * the virtualized activedescendant focus model. Leave unset (default
   * `undefined`) for the standard roving-tabindex model.
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` index range of the currently rendered
   * nodes. The virtualizer provides this; the tree uses it to decide whether a
   * navigation target is in the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Tells the tree the flattened node list changed **without** a `totalCount`
   * transition — a same-length re-sort or refresh. Bind any value that changes
   * on such a refresh (a version counter, the array reference, a sort-key
   * string); when it changes the position snapshot rebuilds from empty so
   * navigation never resolves against a stale off-window entry. Leave unset
   * (default) when the node count always changes on a refresh. Equivalent to
   * calling {@link ForTreeVirtualized.invalidateSnapshot} imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when keyboard navigation reaches a node outside the rendered
   * window. The consumer passes this index to `injectVirtualizer`'s
   * `scrollToIndex` so the correct node mounts.
   */
  readonly scrollToIndex = output<number>();

  #focusModel: ActiveDescendantFocusModel<unknown> | null = null;

  readonly #resume = new VirtualizedResume<unknown, TreePositionEntry<unknown>>({
    totalCount: this.totalCount,
    snapshotByPos: () => this.#requireFocusModel().snapshotByPos(),
    compareWith: this.#ctx.compareWith,
  });

  readonly #host = this.#ctx.registerVirtualization({
    totalCount: this.totalCount,
    resume: this.#resume,
    focusModel: () => this.#requireFocusModel(),
    rejectRangeSelect: () => this.#rejectRangeSelect(),
    assertSelectionFollowsFocusSupported: () => this.#assertSelectionFollowsFocusSupported(),
  });

  constructor() {
    // @sanctioned-pull(navigator-position-map): the rendered window is transient,
    // so a window nothing reads during is lost to the lazy fold.
    effect(() => {
      runVirtualizedNavigatorBridge({
        items: this.#host.items,
        virtualized: () => this.totalCount() !== undefined,
        requireNavigator: () => this.#requireFocusModel(),
      });
    });
  }

  /**
   * Force the position snapshot to rebuild from empty on the next fold,
   * discarding stale off-window entries. Call after a same-length refresh of
   * the flattened node list (a re-sort / reload that keeps `totalCount`
   * unchanged) when you cannot express the change through the reactive
   * `[dataVersion]` input. No-op while `totalCount` is unset.
   */
  invalidateSnapshot(): void {
    if (this.totalCount() === undefined) {
      return;
    }
    this.#requireFocusModel().invalidateSnapshot();
  }

  #requireFocusModel(): ActiveDescendantFocusModel<unknown> {
    return (this.#focusModel ??= new ActiveDescendantFocusModel({
      items: this.#host.items,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      getActiveId: () => this.#host.getActiveId(),
      setActiveId: (id) => {
        this.#host.suppressPointer();
        this.#host.setActiveId(id);
      },
      emitScrollToIndex: (idx) => {
        this.#host.suppressPointer();
        this.scrollToIndex.emit(idx);
      },
      resume: this.#resume,
      dataVersion: this.dataVersion,
      typeahead: this.#host.typeahead,
    }));
  }

  /**
   * The shortcut list is the trio `[forTreeItem]` implements on the
   * non-virtualized path; the tree spends `Ctrl+Shift+Home/End` on a plain
   * focus move in both, so naming it here would report a restriction
   * virtualization does not impose.
   */
  #rejectRangeSelect(): void {
    throwUnsupportedVirtualizedRangeSelect({
      primitive: 'tree',
      focusModel: 'roving-tabindex',
      collection: 'tree',
      shortcuts: 'Shift+Arrow, Shift+Space, Ctrl/Cmd+A',
      alternative: 'Use `selectionMode="checkbox"` for multi-select over large virtualized trees',
    });
  }

  #assertSelectionFollowsFocusSupported(): void {
    if (this.#ctx.selectionFollowsFocus() && !this.#host.multiSelect()) {
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'tree',
        focusModel: 'roving-tabindex',
        collection: 'tree',
      });
    }
  }
}
