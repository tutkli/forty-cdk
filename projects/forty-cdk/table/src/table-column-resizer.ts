import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
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

import { clampToRange, startPointerResize } from 'forty-cdk/core';
import { injectTableContext } from './table-context';

/** Payload of `resizeCommit`: which column was resized and its committed width (px). */
export interface TableResizeDescriptor {
  column: string;
  width: number;
}

/**
 * Turns a focusable element inside a `[forTableHeaderCell]` into a column-resize
 * handle. Supports pointer drag (with a dead-zone so a plain click is a no-op) and
 * `ArrowLeft` / `ArrowRight` keyboard resize, both constrained to `[min, max]`.
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
    '[attr.tabindex]': '"0"',
    '[attr.aria-valuenow]': 'width() ?? measuredWidth() ?? null',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'ariaValueMax()',
    '[attr.data-resizing]': 'resizing() ? "" : null',
    '(pointerdown)': 'onPointerDown($event)',
    '(keydown)': 'onKeyDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class ForTableColumnResizer {
  protected readonly ctx = injectTableContext('ForTableColumnResizer');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

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
   * Fires once per resize gesture — at pointer-up after a drag, and on every arrow
   * press — with the column identity and its committed width. Bind it to persist
   * the width; live updates during a drag come through `[(width)]` / `widthChange`.
   */
  readonly resizeCommit = output<TableResizeDescriptor>();

  /** `aria-valuemax`, omitted when `max` is non-finite (the default unbounded case). */
  protected readonly ariaValueMax = computed<number | null>(() =>
    Number.isFinite(this.max()) ? this.max() : null,
  );

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

  #disposePointer: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#disposePointer?.());
    effect(() => {
      const w = this.width();
      if (w != null) {
        this.ctx.setColumnWidth(this.column(), w);
      }
    });
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      afterNextRender(() => this.#measuredWidth.set(this.#measureBaseWidth()));
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const ltr = this.ctx.dir() !== 'rtl';
    this.#disposePointer = startPointerResize(event, {
      host: this.#host,
      axis: 'x',
      startValue: this.width() ?? this.#measureBaseWidth(),
      invert: !ltr,
      constrain: (n) => clampToRange(n, this.min(), this.max()),
      onResize: (w) => {
        this.#resizing.set(true);
        this.width.set(w);
      },
      onCommit: (w) => {
        this.#resizing.set(false);
        this.resizeCommit.emit({ column: this.column(), width: w });
      },
    });
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
    const cell = this.#host.closest<HTMLElement>('[forTableHeaderCell]');
    return (cell ?? this.#host).getBoundingClientRect().width;
  }
}
