import {
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';

/**
 * Headless separator implementing both variants of the
 * [WAI-ARIA Separator pattern](https://www.w3.org/WAI/ARIA/apg/patterns/separator/):
 *
 * - **Static** (default) — non-focusable, semantic-only. Use to divide groups
 *   of content visually and semantically. Set `decorative` so screen readers
 *   skip the line when the surrounding layout already conveys the split.
 * - **Focusable** (`focusable`) — the divider between two resizable panes.
 *   Tabbable, exposes `aria-valuenow` / `aria-valuemin` / `aria-valuemax` live,
 *   handles arrow keys / Page Up-Down / Home / End / (optional) Enter, and
 *   supports pointer drag with `setPointerCapture`. Emits `(resize)` on every
 *   mutation and `(resizeCommit)` once per key release / drag end.
 *
 * @example
 * ```html
 * <hr forSeparator />
 * <div forSeparator orientation="vertical"></div>
 * <span forSeparator decorative></span>
 *
 * <!-- Focusable variant: vertical divider between two horizontally stacked panes. -->
 * <div
 *   forSeparator
 *   focusable
 *   orientation="vertical"
 *   [(value)]="size"
 *   [min]="100"
 *   [max]="700"
 *   [step]="8"
 *   [largeStep]="80"
 *   aria-controls="pane-a pane-b"
 * ></div>
 * ```
 */
@Directive({
  selector: '[forSeparator]',
  exportAs: 'forSeparator',
  host: {
    '[attr.role]': 'roleAttr()',
    '[attr.aria-orientation]': 'ariaOrientationAttr()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.tabindex]': 'tabindexAttr()',
    '[attr.aria-valuenow]': 'ariaValueAttr(value())',
    '[attr.aria-valuemin]': 'ariaValueAttr(min())',
    '[attr.aria-valuemax]': 'ariaValueAttr(max())',
    '[attr.aria-valuetext]': 'focusable() ? valueText() : null',
    '[attr.aria-controls]': 'focusable() ? controls() : null',
    '[attr.aria-disabled]': 'focusable() && disabled() ? "true" : null',
    '[attr.data-disabled]': 'focusable() && disabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class ForSeparator {
  /**
   * Axis the separator divides along. `horizontal` splits content stacked
   * vertically; `vertical` splits content arranged horizontally. Defaults to
   * `horizontal`, matching the `<hr>` element.
   *
   * In the focusable variant `orientation` describes the *separator line*; the
   * resize axis runs perpendicular to it. APG: a horizontal pane stack uses a
   * vertical separator, and arrow keys move along the resize axis.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * When true, the separator is purely visual: it gets `role="none"` and no
   * ARIA, so assistive tech treats surrounding content as a single flow. Use
   * when the line is redundant with adjacent semantics. Always wins over
   * `focusable` — a decorative separator never participates in keyboard /
   * pointer interaction.
   */
  readonly decorative = input(false, { transform: booleanAttribute });

  /**
   * Switch from the static APG variant (default) to the focusable resizer
   * variant. When true, the separator becomes tabbable, exposes
   * `aria-valuenow` / `valuemin` / `valuemax`, and emits `(resize)` /
   * `(resizeCommit)` on keyboard or pointer drag. Ignored when `decorative`.
   */
  readonly focusable = input(false, { transform: booleanAttribute });

  /**
   * Disables the focusable variant: the separator drops out of tab order, no
   * keyboard or pointer mutation fires, and `aria-disabled` / `data-disabled`
   * are reflected. No-op when the separator is static or decorative.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Two-way bindable. The current value along the resize axis. Units are
   * consumer-defined (px, %, fr, rem, …) — the directive treats this as an
   * opaque number constrained by `min` / `max`. Pointer drag adds raw px
   * deltas, so use px units when wiring drag directly; keyboard navigation is
   * unit-agnostic.
   *
   * The `model()` change emitter (`(valueChange)`) follows the project-wide
   * contract: it fires only on internal updates (keyboard, drag), never on
   * consumer writes via `[(value)]` — observe transitions without binding
   * back. `(resize)` carries the same value with a verb-named alias for
   * one-way wiring.
   */
  readonly value = model<number>(0);

  /** Lower bound for `value`. Default `0`. */
  readonly min = input<number>(0);

  /** Upper bound for `value`. Default `100` (matches a percentage default). */
  readonly max = input<number>(100);

  /** Step applied by ArrowKeys along the resize axis. Default `1`. */
  readonly step = input<number>(1);

  /** Step applied by `Page Up` / `Page Down`. Default `10`. */
  readonly largeStep = input<number>(10);

  /**
   * Optional human-readable value for `aria-valuetext`. Use when the bare
   * number is not meaningful to AT (e.g. `"30 percent of viewport"`). When
   * `null`, AT reads `aria-valuenow`.
   */
  readonly valueText = input<string | null>(null);

  /**
   * Space-separated list of element ids the separator splits. Surfaces as
   * `aria-controls`. Recommended for the focusable variant per APG so AT can
   * relate the resizer to the panes it affects.
   */
  readonly controls = input<string | null>(null);

  /**
   * Opt-in `Enter` (and `Space`) toggle: collapses the value to `min` and
   * restores the last non-min value on the next press. APG-optional behaviour
   * for separators that back a collapsible pane. Off by default — enabling it
   * changes the meaning of `Enter`.
   */
  readonly collapsible = input(false, { transform: booleanAttribute });

  /**
   * Reading direction. RTL inverts ArrowLeft / ArrowRight on a vertical
   * separator (horizontal pane stack) and the horizontal axis of pointer
   * drag. When unset (default `null`), the inherited ambient direction is
   * resolved from the nearest ancestor carrying a `dir` attribute (or
   * `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins and
   * the resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Verb-named alias for the model change emitter. Fires on every value
   * mutation (keyboard step, pointer-move tick). Emits the same value as
   * `(valueChange)`; pick one or the other based on whether you want
   * two-way binding (`[(value)]`) or one-shot observation.
   */
  readonly resize = output<number>();

  /**
   * Fires once at the end of a resize burst — when the user releases the
   * pointer (or it is cancelled) or releases an arrow / page key. Useful for
   * persisting the final size after a drag, where `(resize)` may fire 60+
   * times per second.
   */
  readonly resizeCommit = output<number>();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Last value above `min` — used to restore size when `collapsible` Enter expands. */
  #lastNonMinValue = 0;

  // Pointer drag state. Plain instance fields — drag lives outside the reactive graph.
  #dragging = false;
  #dragStartValue = 0;
  #dragStartCoord = 0;

  /** True between the first kbd-driven mutation and the next `keyup`. */
  #pendingKeyboardCommit = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#endDrag());
  }

  protected roleAttr(): 'separator' | 'none' {
    return this.decorative() ? 'none' : 'separator';
  }

  protected ariaOrientationAttr(): 'horizontal' | 'vertical' | null {
    if (this.decorative()) {
      return null;
    }
    if (this.focusable()) {
      // Focusable variant: explicit per APG so valuenow/min/max have axis context.
      return this.orientation();
    }
    // Static variant: omit the attribute for `horizontal` (the ARIA default) to
    // preserve back-compat with the pre-focusable contract.
    return this.orientation() === 'vertical' ? 'vertical' : null;
  }

  protected tabindexAttr(): string | null {
    if (!this.focusable() || this.decorative() || this.disabled()) {
      return null;
    }
    return '0';
  }

  protected ariaValueAttr(value: number): number | null {
    if (!this.focusable() || this.decorative()) {
      return null;
    }
    return value;
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (!this.#interactive()) {
      return;
    }

    // Vertical separator (line) → resize axis is horizontal → ArrowLeft/Right.
    // Horizontal separator (line) → resize axis is vertical → ArrowUp/Down.
    const axis: 'horizontal' | 'vertical' =
      this.orientation() === 'vertical' ? 'horizontal' : 'vertical';
    const ltr = this.dir() !== 'rtl';

    let next: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        if (axis !== 'horizontal') return;
        next = this.#clamp(this.value() + (ltr ? -this.step() : this.step()));
        break;
      case 'ArrowRight':
        if (axis !== 'horizontal') return;
        next = this.#clamp(this.value() + (ltr ? this.step() : -this.step()));
        break;
      case 'ArrowUp':
        if (axis !== 'vertical') return;
        next = this.#clamp(this.value() - this.step());
        break;
      case 'ArrowDown':
        if (axis !== 'vertical') return;
        next = this.#clamp(this.value() + this.step());
        break;
      case 'PageUp':
        next = this.#clamp(this.value() - this.largeStep());
        break;
      case 'PageDown':
        next = this.#clamp(this.value() + this.largeStep());
        break;
      case 'Home':
        next = this.min();
        break;
      case 'End':
        next = this.max();
        break;
      case 'Enter':
      case ' ':
        if (!this.collapsible()) return;
        event.preventDefault();
        this.#toggleCollapsed();
        return;
      default:
        return;
    }

    event.preventDefault();
    if (next === this.value()) {
      return;
    }
    this.value.set(next);
    this.resize.emit(next);
    this.#pendingKeyboardCommit = true;
  }

  protected onKeyUp(_event: KeyboardEvent): void {
    if (!this.#pendingKeyboardCommit) {
      return;
    }
    this.#pendingKeyboardCommit = false;
    this.resizeCommit.emit(this.value());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.#interactive()) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.#dragging = true;
    this.#dragStartValue = this.value();
    this.#dragStartCoord = this.orientation() === 'vertical' ? event.clientX : event.clientY;
    this.#host.setPointerCapture(event.pointerId);
    this.#host.addEventListener('pointermove', this.#onPointerMove);
    this.#host.addEventListener('pointerup', this.#onPointerUp);
    this.#host.addEventListener('pointercancel', this.#onPointerUp);
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (!this.#dragging) {
      return;
    }
    const orient = this.orientation();
    const ltr = this.dir() !== 'rtl';
    const raw = orient === 'vertical' ? event.clientX : event.clientY;
    let delta = raw - this.#dragStartCoord;
    if (orient === 'vertical' && !ltr) {
      // RTL inverts the horizontal drag axis so the visible end of the start
      // pane still tracks the pointer.
      delta = -delta;
    }
    const next = this.#clamp(this.#dragStartValue + delta);
    if (next === this.value()) {
      return;
    }
    this.value.set(next);
    this.resize.emit(next);
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    if (!this.#dragging) {
      return;
    }
    this.#endDrag();
    if (this.#host.hasPointerCapture(event.pointerId)) {
      this.#host.releasePointerCapture(event.pointerId);
    }
    this.resizeCommit.emit(this.value());
  };

  #endDrag(): void {
    if (!this.#dragging) {
      return;
    }
    this.#dragging = false;
    this.#host.removeEventListener('pointermove', this.#onPointerMove);
    this.#host.removeEventListener('pointerup', this.#onPointerUp);
    this.#host.removeEventListener('pointercancel', this.#onPointerUp);
  }

  #toggleCollapsed(): void {
    const current = this.value();
    const min = this.min();
    let next: number;
    if (current <= min) {
      // Restore last non-min value, falling back to max if the consumer has
      // not produced one yet (initial value === min).
      next = this.#clamp(this.#lastNonMinValue > min ? this.#lastNonMinValue : this.max());
    } else {
      this.#lastNonMinValue = current;
      next = min;
    }
    if (next === current) {
      return;
    }
    this.value.set(next);
    this.resize.emit(next);
    this.resizeCommit.emit(next);
  }

  #clamp(n: number): number {
    return Math.max(this.min(), Math.min(this.max(), n));
  }

  #interactive(): boolean {
    return this.focusable() && !this.decorative() && !this.disabled();
  }
}
