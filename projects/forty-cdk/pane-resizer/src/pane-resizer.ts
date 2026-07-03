import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';

import {
  type WritingDirection,
  injectTextDirection,
  clampToRange,
  roundToStepPrecision,
  startPointerResize,
} from 'forty-cdk/core';

/**
 * Headless implementation of the
 * [WAI-ARIA Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/):
 * the focusable divider between two resizable panes. Carries `role="separator"`
 * with live `aria-valuenow` / `aria-valuemin` / `aria-valuemax`, is tabbable,
 * handles arrow keys / Page Up-Down / Home / End / (optional) Enter, and
 * supports pointer drag with `setPointerCapture`. Emits `(resizing)` on every
 * mutation and `(resizeCommit)` once per key release / drag end.
 *
 * It is essentially a 1-D slider wearing a separator role; the static
 * `[forSeparator]` divider stays a separate, thinner primitive so a visual-only
 * separator never pulls the drag / keyboard-resize code in.
 *
 * Pointer drag arms only after the pointer travels past a small dead-zone (a
 * few px), so a plain click that fires a stray sub-threshold `pointermove`
 * never mutates the value — `(resizing)` won't fire on a jittery click.
 *
 * @example
 * ```html
 * <!-- Vertical divider between two horizontally stacked panes. -->
 * <div
 *   forPaneResizer
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
  selector: '[forPaneResizer]',
  exportAs: 'forPaneResizer',
  host: {
    role: 'separator',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.tabindex]': 'disabled() ? null : "0"',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuetext]': 'valueText() || null',
    '[attr.aria-controls]': 'controls()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '[style.touch-action]': 'touchAction()',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class ForPaneResizer {
  /**
   * Axis the divider line runs along. `horizontal` splits content stacked
   * vertically; `vertical` splits content arranged horizontally. Defaults to
   * `horizontal`.
   *
   * `orientation` describes the *separator line*; the resize axis runs
   * perpendicular to it. APG: a horizontal pane stack uses a vertical
   * separator, and arrow keys move along the resize axis.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Disables the resizer: it drops out of tab order, no keyboard or pointer
   * mutation fires, and `aria-disabled` / `data-disabled` are reflected.
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
   * back. `(resizing)` carries the same value with a verb-named alias for
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
   * Space-separated list of element ids the resizer splits. Surfaces as
   * `aria-controls`. Recommended per APG so AT can relate the resizer to the
   * panes it affects.
   */
  readonly controls = input<string | null>(null);

  /**
   * Opt-in `Enter` (and `Space`) toggle: collapses the value to `min` and
   * restores the last non-min value on the next press. APG-optional behaviour
   * for resizers that back a collapsible pane. Off by default — enabling it
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
   * `touch-action` for the divider: capture the resize axis so a finger drag
   * across it can't be stolen by page scrolling (which would fire
   * `pointercancel` mid-resize), while freeing the perpendicular axis for
   * scrolling. A `vertical` separator resizes along x (`pan-y`); a `horizontal`
   * separator resizes along y (`pan-x`). Suppressed while disabled (no drag to
   * protect).
   */
  readonly touchAction = computed<string | null>(() => {
    if (this.disabled()) {
      return null;
    }
    return this.orientation() === 'vertical' ? 'pan-y' : 'pan-x';
  });

  /**
   * Verb-named alias for the model change emitter. Fires on every value
   * mutation (keyboard step, pointer-move tick). Emits the same value as
   * `(valueChange)`; pick one or the other based on whether you want
   * two-way binding (`[(value)]`) or one-shot observation.
   */
  readonly resizing = output<number>();

  /**
   * Fires once at the end of a resize burst — when the user releases the
   * pointer (or it is cancelled) or releases an arrow / page key. Useful for
   * persisting the final size after a drag, where `(resizing)` may fire 60+
   * times per second.
   */
  readonly resizeCommit = output<number>();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Last value above `min` — used to restore size when `collapsible` Enter expands. */
  #lastNonMinValue = 0;

  #disposePointer: (() => void) | null = null;

  /** True between the first kbd-driven mutation and the next `keyup`. */
  #pendingKeyboardCommit = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#disposePointer?.());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
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
        next = this.#stepClamp(this.value() + (ltr ? -this.step() : this.step()), this.step());
        break;
      case 'ArrowRight':
        if (axis !== 'horizontal') return;
        next = this.#stepClamp(this.value() + (ltr ? this.step() : -this.step()), this.step());
        break;
      case 'ArrowUp':
        if (axis !== 'vertical') return;
        next = this.#stepClamp(this.value() - this.step(), this.step());
        break;
      case 'ArrowDown':
        if (axis !== 'vertical') return;
        next = this.#stepClamp(this.value() + this.step(), this.step());
        break;
      case 'PageUp':
        next = this.#stepClamp(this.value() - this.largeStep(), this.largeStep());
        break;
      case 'PageDown':
        next = this.#stepClamp(this.value() + this.largeStep(), this.largeStep());
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
    this.resizing.emit(next);
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
    if (this.disabled()) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const ltr = this.dir() !== 'rtl';
    this.#disposePointer = startPointerResize(event, {
      host: this.#host,
      axis: this.orientation() === 'vertical' ? 'x' : 'y',
      startValue: this.value(),
      invert: this.orientation() === 'vertical' && !ltr,
      constrain: (n) => this.#clamp(n),
      onResize: (v) => {
        this.value.set(v);
        this.resizing.emit(v);
      },
      onCommit: (v) => this.resizeCommit.emit(v),
    });
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
    this.resizing.emit(next);
    this.resizeCommit.emit(next);
  }

  #clamp(n: number): number {
    return clampToRange(n, this.min(), this.max());
  }

  /** Clamp a step-derived value, rounding to the step's precision first. */
  #stepClamp(n: number, step: number): number {
    return this.#clamp(roundToStepPrecision(n, step));
  }
}
