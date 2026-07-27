import {
  computed,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  type Signal,
  signal,
} from '@angular/core';

import { type ForTableCellHandle, registerHandle } from 'forty-cdk/core';
import {
  coerceSticky,
  hostHasDraggable,
  injectTableContext,
  injectTableRegistration,
  type TableStickyValue,
} from './table-context';

/**
 * Marks a header cell (`role="columnheader"`). Requires a `name` input that
 * identifies the column — reflected as `data-column` for later phases (sort,
 * resize, reorder) to key off. Optionally sticky via the `sticky` input.
 *
 * In `grid` / `treegrid` mode the header cell joins the roving-navigation grid
 * as a cell of the grid's first row, so the header and body share a single
 * composite tab stop and Arrow keys navigate between them. The active header
 * cell carries `tabindex="0"` (others `-1`), reflects `data-highlighted` when
 * focused, and carries a 1-based `aria-colindex`.
 *
 * When a `[forDraggable]` shares the cell (a `[forTableColumnReorder]` row) the
 * cell still participates in that composite grid — `aria-colindex` and focus
 * activation stay on the cell — but it yields the host `tabindex`, keydown, and
 * `data-highlighted` to the draggable, so the grid keeps a single tab stop and
 * `[forTableColumnReorder]` routes idle Arrow navigation across it.
 */
@Directive({
  selector: '[forTableHeaderCell]',
  exportAs: 'forTableHeaderCell',
  host: {
    role: 'columnheader',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-colindex]': 'colIndex()',
    '[attr.data-column]': 'name()',
    '[attr.data-sticky]': "sticky() ? (sticky() === 'end' ? 'end' : '') : null",
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTableHeaderCell {
  protected readonly ctx = injectTableContext('ForTableHeaderCell');
  readonly #registration = injectTableRegistration('ForTableHeaderCell');

  /**
   * The header cell's host element (`role="columnheader"`). Exposed so a descendant
   * `[forTableColumnResizer]` can resolve the enclosing cell through DI to measure its
   * base width — robust to `hostDirectives` composition, where the `[forTableHeaderCell]`
   * selector attribute is not reflected onto the wrapper's host element.
   */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #host = this.el.nativeElement;

  /**
   * This header cell's element injector. Exposed so a declarative renderer stamping
   * header content from a projected `<ng-template>` (e.g. `ForTableBody`) can pass it
   * as `[ngTemplateOutletInjector]`, letting context-dependent primitives inside that
   * content resolve this cell and the table.
   */
  readonly injector = inject(Injector);

  /** Column identifier, reflected as `data-column`. Required by later phases (sort, resize, reorder). */
  readonly name = input.required<string>();

  readonly #labelEl = signal<HTMLElement | null>(null);

  /** Header cells are never disabled; exposed so the roving grid can treat them uniformly with data cells. */
  readonly #disabled = signal(false);

  /**
   * A co-located affordance (e.g. `[forTableSortHeader]`) that needs the header
   * cell to be a standalone `tabindex="0"` tab stop whenever it is not part of the
   * body's roving composite grid — that is, in `mode="table"`, or in a
   * column-reorder header row where the header does not join the roving grid. The
   * header cell is the single owner of the host `tabindex` — sibling directives
   * never bind it — so it reflects this intent instead of letting a second
   * `[tabindex]` binding fight it on the same element.
   */
  readonly #standaloneTabStop = signal<Signal<boolean> | null>(null);

  /**
   * Registers an intent that makes this header cell a `tabindex="0"` tab stop when
   * it is not participating in the roving composite grid. Called by
   * `[forTableSortHeader]` so the two never bind `[tabindex]` on the same host.
   */
  registerStandaloneTabStop(active: Signal<boolean>): void {
    this.#standaloneTabStop.set(active);
  }

  /** Clears a previously registered standalone tab-stop intent. Reference-based. */
  unregisterStandaloneTabStop(active: Signal<boolean>): void {
    if (this.#standaloneTabStop() === active) {
      this.#standaloneTabStop.set(null);
    }
  }

  /**
   * The element a descendant `[forTableColumnLabel]` marks as this column's label
   * text, or `null` when no marker is present. A sibling `[forTableColumnResizer]`
   * reads it to measure the header label for header-inclusive auto-fit, isolating
   * the label from the resize handle / sort affordance without DOM assumptions.
   */
  readonly labelEl = this.#labelEl.asReadonly();

  /** Registers a descendant `[forTableColumnLabel]` as this header cell's label element. */
  registerLabel(el: HTMLElement): void {
    this.#labelEl.set(el);
  }

  /** Unregisters the label element. Reference-based; safe to call if never registered. */
  unregisterLabel(el: HTMLElement): void {
    if (this.#labelEl() === el) {
      this.#labelEl.set(null);
    }
  }

  /**
   * Sticky placement for this header cell. `true` (or the bare `sticky`
   * attribute) pins to the start edge; `'end'` pins to the end edge; `false`
   * (default) is not sticky. The consumer applies `position: sticky` and the
   * appropriate `top` / `left` / `right` offset in CSS — this input only
   * provides the `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });

  /** `true` when a `[forDraggable]` shares this cell and owns its host `tabindex` / keydown instead. */
  readonly #yieldsToDraggable = hostHasDraggable(this.#host);

  /**
   * `true` when this header row joins the body's composite roving grid (`grid` /
   * `treegrid` mode with a complete header row). A draggable header cell
   * (`[forTableColumnReorder]`) still participates — it carries `aria-colindex`
   * and activates the roving cell on focus — even though it yields the host
   * `tabindex`, keydown, and `data-highlighted` to its co-located `[forDraggable]`.
   */
  readonly #participates = computed(() => this.ctx.headerParticipatesInRoving());

  /** `true` when this cell owns its host `tabindex` / keydown as a plain roving grid cell (no draggable). */
  readonly #inRovingGrid = computed(() => !this.#yieldsToDraggable && this.#participates());

  protected readonly tabindex = computed<0 | -1 | null>(() => {
    if (this.#yieldsToDraggable) {
      return null;
    }
    if (this.#inRovingGrid()) {
      return this.ctx.headerCellTabIndex(this.#host);
    }
    return this.#standaloneTabStop()?.() ? 0 : null;
  });

  protected readonly colIndex = computed<number | null>(() =>
    this.#participates() ? this.ctx.headerCellIndexOf(this.#host) + 1 : null,
  );

  protected readonly highlighted = computed(
    () =>
      !this.#yieldsToDraggable && this.#participates() && this.ctx.isCellHighlighted(this.#host),
  );

  constructor() {
    const handle: ForTableCellHandle = { host: this.#host, disabled: this.#disabled };
    registerHandle(
      handle,
      (h) => this.#registration.registerHeaderCell(h),
      (h) => this.#registration.unregisterHeaderCell(h),
    );
  }

  protected onFocus(): void {
    if (this.#participates()) {
      this.ctx.activateCell(this.#host);
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.#inRovingGrid()) {
      this.ctx.handleCellKeydown(event, this.#host);
    }
  }
}
