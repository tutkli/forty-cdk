import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  clampToRange,
  createPointerDragSession,
  type PointerDragSession,
  DRAG_DEAD_ZONE_PX,
} from 'forty-cdk/core';
import { assertColumnName, injectTableContext } from './table-context';
import { ForTableHeaderCell } from './table-header-cell';

/** Payload of `resizeCommit`: which column was resized and its committed width (px). */
export interface TableResizeDescriptor {
  column: string;
  width: number;
}

/**
 * Turns a focusable element inside a `[forTableHeaderCell]` into a column-resize
 * handle. Supports pointer drag (with a dead-zone so a plain click is a no-op) and
 * `ArrowLeft` / `ArrowRight` keyboard resize, both constrained to `[min, max]`.
 * Pressing `Escape` (or a `pointercancel`) during a drag reverts the width to where
 * the gesture started and emits no `resizeCommit`. Being destroyed mid-drag reverts
 * too, reporting the pre-drag width through the `[widthRevert]` callback because the
 * `[(width)]` model can no longer emit during teardown.
 *
 * On every change it publishes the resolved width as the CSS custom property
 * `--for-table-col-<column>-width` on the table root, so the consumer can apply it
 * to their layout (`grid-template-columns` in `<div>` mode, a `<col>` / cell width
 * in native `<table>` mode). **It never lays out columns itself and never resizes
 * data** — it owns the affordance, accessibility, and the published width only.
 *
 * Reflects `data-resizing` (empty string) while a pointer drag is active. Carries
 * `role="separator"` with `aria-orientation="vertical"` and live `aria-value*`,
 * mirroring `[forPaneResizer]`. The consumer supplies `aria-label`. Before the first
 * gesture, `aria-valuenow` falls back to the header-cell width measured once on mount
 * (browser-only), so a separator with no `[width]` is never announced without a
 * current value; an explicit `[width]` always takes precedence.
 *
 * In `mode="grid"` / `"treegrid"` it yields its tab stop to the composite roving grid
 * (`tabindex="-1"`) and is reached via cell-entry (Enter / F2 focuses the first focusable
 * inside the header cell), so it must sit on a natively-focusable element (a `<button>`)
 * to stay cell-entry-reachable. In `mode="table"` it is a standalone tab stop
 * (`tabindex="0"`).
 *
 * Opt in to size-to-content with `[autoFit]`: double-clicking the handle then fits the
 * column to its widest data-cell content via `fitToContent()` (also callable imperatively
 * through `exportAs="forTableColumnResizer"`, e.g. from a column menu). Unset (default),
 * `dblclick` is a no-op and the resize behaviour is unchanged. Add `[fitIncludesHeader]`
 * to also account for the column header's label (marked with a sibling
 * `[forTableColumnLabel]`), fitting to `max(header label, …data cells)`.
 *
 * @example
 * ```html
 * <th forTableHeaderCell name="name">
 *   Name
 *   <button forTableColumnResizer column="name" [(width)]="nameWidth"
 *           aria-label="Resize Name column"></button>
 * </th>
 * ```
 */
@Directive({
  selector: '[forTableColumnResizer]',
  exportAs: 'forTableColumnResizer',
  host: {
    role: 'separator',
    'aria-orientation': 'vertical',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-valuenow]': 'width() ?? measuredWidth() ?? null',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'ariaValueMax()',
    '[attr.data-resizing]': 'resizing() ? "" : null',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onClick($event)',
    '(dblclick)': 'autoFit() && fitToContent()',
  },
})
export class ForTableColumnResizer {
  protected readonly ctx = injectTableContext('ForTableColumnResizer');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #headerCell = inject(ForTableHeaderCell, { optional: true });

  /** Column identity; included in the `resizeCommit` payload and the published CSS var name. */
  readonly column = input.required<string>();

  /**
   * Current column width in pixels. Two-way bindable via `[(width)]`. Acts as both
   * the controlled value and the base a pointer drag / arrow step is applied to.
   * When unset, the base for the first gesture is measured from the header cell.
   * Its implicit `widthChange` fires on every live update (drag tick, arrow press);
   * `resizeCommit` is the distinct column-aware gesture-end event.
   */
  readonly width = model<number>();

  /** Minimum width in pixels. Default `0`. */
  readonly min = input<number>(0);

  /** Maximum width in pixels. Default `Infinity` (no upper bound). */
  readonly max = input<number>(Infinity);

  /** Pixels applied per `ArrowLeft` / `ArrowRight` press. Default `10`. */
  readonly step = input<number>(10);

  /**
   * Opt-in size-to-content. When set, double-clicking the handle fits the column to
   * its widest data-cell content via `fitToContent()`. Unset (default), `dblclick` is
   * a no-op and the resize behaviour is unchanged.
   */
  readonly autoFit = input(false, { transform: booleanAttribute });

  /**
   * Opt-in: also account for the column header's label width when fitting to content,
   * so `fitToContent()` sizes to `max(header label, …data cells)` instead of data cells
   * only. The header label is isolated through a sibling `[forTableColumnLabel]` marker
   * (the resize handle / sort affordance are excluded). When set without a marker present,
   * it degrades to data-cells-only. Unset (default), the header is ignored.
   */
  readonly fitIncludesHeader = input(false, { transform: booleanAttribute });

  /**
   * Fires once per resize gesture — at pointer-up after a drag, and on every arrow
   * press — with the column identity and its committed width. Bind it to persist
   * the width; live updates during a drag come through `[(width)]` / `widthChange`.
   */
  readonly resizeCommit = output<TableResizeDescriptor>();

  /**
   * Teardown-only revert channel. Called with the pre-drag width when the handle is
   * destroyed mid-drag — the column is removed, or `resizable` is toggled off — so the
   * transient drag width never survives as the consumer's persisted value. On every
   * other revert path (`Escape`, `pointercancel`) the pre-drag width arrives through
   * `[(width)]` / `widthChange` as usual and this callback does not fire.
   *
   * Bound as a function reference (`[widthRevert]="onRevert"`), not as an event binding:
   * the `[(width)]` model — like any `output()` on this directive — is already destroyed
   * when the unmount revert happens, so an emitter-based channel cannot deliver it.
   */
  readonly widthRevert = input<((descriptor: TableResizeDescriptor) => void) | undefined>(
    undefined,
  );

  /** `aria-valuemax`, omitted when `max` is non-finite (the default unbounded case). */
  protected readonly ariaValueMax = computed<number | null>(() =>
    Number.isFinite(this.max()) ? this.max() : null,
  );

  protected readonly tabindex = computed<0 | -1>(() => (this.ctx.mode() === 'table' ? 0 : -1));

  readonly #resizing = signal(false);

  /** Whether a pointer drag is currently active (drives `data-resizing`). */
  protected readonly resizing = this.#resizing.asReadonly();

  readonly #measuredWidth = signal<number | null>(null);

  /**
   * Header-cell width measured once on mount (browser-only). Backs `aria-valuenow`
   * before any explicit `[width]` so the focusable separator never ships without a
   * current value on the measured-fallback path; an explicit `[width]` still wins.
   */
  protected readonly measuredWidth = this.#measuredWidth.asReadonly();

  #pointerSession: PointerDragSession | null = null;

  #dragStartCoord = 0;
  #dragStartValue = 0;
  #dragInvert = false;
  #dragCurrent = 0;

  #publishedColumn: string | null = null;

  #destroying = false;

  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      const column = this.column();
      assertColumnName(column, 'ForTableColumnResizer');
      const w = this.width();
      if (this.#publishedColumn !== null && this.#publishedColumn !== column) {
        this.ctx.removeColumnWidth(this.#publishedColumn);
      }
      if (w != null) {
        this.ctx.setColumnWidth(column, w);
        this.#publishedColumn = column;
      } else {
        this.ctx.removeColumnWidth(column);
        this.#publishedColumn = null;
      }
    });
    destroyRef.onDestroy(() => this.ctx.removeColumnWidth(this.column()));
    if (this.#isBrowser) {
      afterNextRender(() => this.#measuredWidth.set(this.#measureBaseWidth()));
      this.#pointerSession = createPointerDragSession({
        host: this.#host,
        document: this.#document,
        armThreshold: DRAG_DEAD_ZONE_PX,
        capturePointer: true,
        cancelOnEscape: true,
        cancelOnDestroy: true,
        canStart: (event) => this.#onDragStart(event),
        onLift: () => true,
        onMove: (event) => this.#onDragMove(event),
        onCommit: () => this.#onDragCommit(),
        onCancel: () => this.#onDragCancel(),
      });
      destroyRef.onDestroy(() => {
        this.#destroying = true;
        this.#pointerSession?.destroy();
      });
    }
  }

  /**
   * Sizes the column to its content: measures the widest natural width across the
   * column's data cells (resolved through the table context, browser-only) — and, when
   * `[fitIncludesHeader]` is set with a sibling `[forTableColumnLabel]` present, the
   * header label too, so the fit becomes `max(header label, …data cells)`. Clamps the
   * result to `[min, max]`, applies it as the new `[(width)]`, and emits `resizeCommit`.
   * Wired to a `dblclick` on the handle when `[autoFit]` is set, and callable
   * imperatively (e.g. from a column menu) via `exportAs="forTableColumnResizer"`.
   * Returns the applied width; a no-op returning the current width off the browser.
   */
  fitToContent(): number {
    if (!this.#isBrowser) {
      return this.width() ?? this.min();
    }
    const next = clampToRange(this.#measureContentWidth(), this.min(), this.max());
    this.width.set(next);
    this.resizeCommit.emit({ column: this.column(), width: next });
    return next;
  }

  #onDragStart(event: PointerEvent): boolean {
    if (event.button !== 0) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    const ltr = this.ctx.dir() !== 'rtl';
    this.#dragInvert = !ltr;
    this.#dragStartCoord = event.clientX;
    this.#dragStartValue = this.width() ?? this.#measureBaseWidth();
    this.#dragCurrent = this.#dragStartValue;
    return true;
  }

  #onDragMove(event: PointerEvent): void {
    let delta = event.clientX - this.#dragStartCoord;
    if (this.#dragInvert) {
      delta = -delta;
    }
    const next = clampToRange(this.#dragStartValue + delta, this.min(), this.max());
    if (next === this.#dragCurrent) {
      return;
    }
    this.#dragCurrent = next;
    this.#resizing.set(true);
    this.width.set(next);
  }

  #onDragCommit(): void {
    this.#resizing.set(false);
    this.resizeCommit.emit({ column: this.column(), width: this.#dragCurrent });
  }

  #onDragCancel(): void {
    this.#resizing.set(false);
    if (this.#dragCurrent === this.#dragStartValue) {
      return;
    }
    this.#dragCurrent = this.#dragStartValue;
    if (this.#destroying) {
      this.widthRevert()?.({ column: this.column(), width: this.#dragStartValue });
      return;
    }
    this.width.set(this.#dragStartValue);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const ltr = this.ctx.dir() !== 'rtl';
    const base = this.width() ?? this.#measureBaseWidth();
    let next: number;
    if (event.key === 'ArrowRight') {
      next = clampToRange(base + (ltr ? this.step() : -this.step()), this.min(), this.max());
    } else if (event.key === 'ArrowLeft') {
      next = clampToRange(base + (ltr ? -this.step() : this.step()), this.min(), this.max());
    } else {
      return;
    }
    event.preventDefault();
    if (next === this.width()) {
      return;
    }
    this.width.set(next);
    this.resizeCommit.emit({ column: this.column(), width: next });
  }

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  #measureBaseWidth(): number {
    const cell = this.#headerCell?.el.nativeElement ?? this.#host;
    return cell.getBoundingClientRect().width;
  }

  #measureContentWidth(): number {
    const column = this.column();
    const cells = this.ctx
      .rows()
      .flatMap((row) => row.cells())
      .map((cell) => cell.host)
      .filter((host) => host.getAttribute('data-column') === column);
    const headerCell = this.#headerCell?.el.nativeElement ?? null;
    const labelEl = this.fitIncludesHeader() ? (this.#headerCell?.labelEl() ?? null) : null;
    if (cells.length === 0 && !labelEl) {
      return this.#measureBaseWidth();
    }
    const doc = this.#host.ownerDocument;
    const root =
      this.#host.closest<HTMLElement>('[role="table"], [role="grid"], [role="treegrid"]') ??
      doc.body;
    const probe = doc.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;top:0;left:-9999px;visibility:hidden;pointer-events:none;';
    root.appendChild(probe);
    try {
      let widest = 0;
      for (const cell of cells) {
        widest = Math.max(widest, this.#measureClone(probe, cell));
      }
      if (labelEl && headerCell) {
        widest = Math.max(
          widest,
          this.#measureClone(probe, labelEl) + this.#horizontalBox(headerCell),
        );
      }
      return widest;
    } finally {
      root.removeChild(probe);
    }
  }

  #measureClone(probe: HTMLElement, source: HTMLElement): number {
    const clone = source.cloneNode(true) as HTMLElement;
    const style = source.ownerDocument.defaultView?.getComputedStyle(source);
    if (style) {
      clone.style.fontFamily = style.fontFamily;
      clone.style.fontSize = style.fontSize;
      clone.style.fontWeight = style.fontWeight;
      clone.style.fontStyle = style.fontStyle;
      clone.style.letterSpacing = style.letterSpacing;
      clone.style.textTransform = style.textTransform;
    }
    clone.style.display = 'inline-block';
    clone.style.width = 'auto';
    clone.style.minWidth = '0';
    clone.style.maxWidth = 'none';
    clone.style.whiteSpace = 'nowrap';
    probe.appendChild(clone);
    return clone.getBoundingClientRect().width;
  }

  #horizontalBox(el: HTMLElement): number {
    const style = el.ownerDocument.defaultView?.getComputedStyle(el);
    if (!style) {
      return 0;
    }
    const px = (value: string): number => parseFloat(value) || 0;
    return (
      px(style.paddingLeft) +
      px(style.paddingRight) +
      px(style.borderLeftWidth) +
      px(style.borderRightWidth)
    );
  }
}
