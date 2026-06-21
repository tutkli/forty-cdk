import {
  fencePlaceholderIndex,
  placeholderInsertion,
} from '../_internal/drag-session/placeholder-position';
import type { ForDraggableHandle, ForDropListContext } from './drag-drop-context';

/** Options handed to {@link PlaceholderSorter} at lift time. */
export interface PlaceholderSorterOptions {
  /** The source list the drag originates from (the fence is computed against its items). */
  readonly source: ForDropListContext;
  /** The lifted item's host element (excluded from the target item rects). */
  readonly lifted: HTMLElement;
  /** The owning document (a fragment is built from it to batch the node move). */
  readonly doc: Document;
  /** The source list's items, by host, used to compute the `dragDisabled` fence. */
  readonly sourceItems: () => readonly ForDraggableHandle[];
  /** Index of `lifted` within the source list's items (the fence origin). */
  readonly originIndex: () => number;
}

/**
 * Lazy `liveSort` strategy: relocates the rendered placeholder's root nodes to the live resolved
 * drop index during a pointer drag — within the source list and across connected lists — so
 * siblings part to reveal where the item will land.
 *
 * Created at `pointerLift` only when `liveSort` is on (and on a browser platform); when it is off
 * the list creates no sorter and `#resolveDrop` skips placeholder movement entirely, replacing the
 * former inline `if (this.liveSort())` gate. A `dragDisabled` sibling in the source list acts as a
 * hard visual fence: the placeholder stops at the first pinned item instead of travelling past it.
 *
 * Constructed directly (`new PlaceholderSorter(options)`); it holds no injection context.
 */
export class PlaceholderSorter {
  readonly #source: ForDropListContext;
  readonly #lifted: HTMLElement;
  readonly #doc: Document;
  readonly #sourceItems: () => readonly ForDraggableHandle[];
  readonly #originIndex: () => number;
  #nodes: readonly Node[] | null = null;

  constructor(options: PlaceholderSorterOptions) {
    this.#source = options.source;
    this.#lifted = options.lifted;
    this.#doc = options.doc;
    this.#sourceItems = options.sourceItems;
    this.#originIndex = options.originIndex;
  }

  /** Store (or clear) the placeholder's root nodes supplied by the draggable. */
  setNodes(nodes: readonly Node[] | null): void {
    this.#nodes = nodes;
  }

  /** Move the placeholder to the fenced resolved drop index in `targetCtx`. */
  onTargetChange(targetCtx: ForDropListContext, index: number): void {
    this.#move(targetCtx, this.#fencedIndex(targetCtx, index));
  }

  #fencedIndex(targetCtx: ForDropListContext, index: number): number {
    if (targetCtx !== this.#source) {
      return index;
    }
    const disabled = this.#sourceItems()
      .filter((h) => h.host !== this.#lifted)
      .map((h) => h.disabled());
    const origin = this.#originIndex();
    return fencePlaceholderIndex(index, disabled, origin < 0 ? 0 : origin);
  }

  #move(targetCtx: ForDropListContext, index: number): void {
    const nodes = this.#nodes;
    if (nodes === null || nodes.length === 0) {
      return;
    }
    const fragment = this.#doc.createDocumentFragment();
    for (const node of nodes) {
      fragment.appendChild(node);
    }
    const hosts = targetCtx
      .items()
      .map((h) => h.host)
      .filter((h) => h !== this.#lifted);
    const { parent, ref } = placeholderInsertion(hosts, index, targetCtx.host);
    parent.insertBefore(fragment, ref);
  }
}
