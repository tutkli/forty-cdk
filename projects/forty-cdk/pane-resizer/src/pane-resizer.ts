import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
} from '@angular/core';

import {
  type WritingDirection,
  createPointerDragSession,
  type PointerDragSession,
  injectTextDirection,
  clamp,
  roundToStepPrecision,
  DRAG_DEAD_ZONE_PX,
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
 * A press also focuses the divider (the drag's `preventDefault` suppresses the
 * browser's native focus-on-press), so arrow-key fine-tuning works immediately
 * after a release and AT tracks `aria-valuenow` during the gesture.
 * Pressing `Escape` (or a `pointercancel`) during a drag reverts the value to
 * where the gesture started and emits no `(resizeCommit)`. Being destroyed
 * mid-drag reverts too, reporting the pre-drag value through the
 * `[valueRevert]` callback because `[(value)]` can no longer emit during
 * teardown.
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
    '(blur)': 'onBlur()',
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
   * Opt-in `Enter` (and `Space`) toggle: collapses the value to `min`, and on
   * the next press restores the last size the resizer itself settled on above
   * `min` — whether that came from a pointer drag, a keyboard burst, or a
   * previous collapse. It falls back to `max` only when no such size exists
   * yet (nothing above `min` has ever been committed). APG-optional behaviour
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
   * pointer (or it is cancelled), releases an arrow / page key, or the burst
   * ends because focus left the divider before the key was released
   * (Tab-away). Useful for persisting the final size after a drag, where
   * `(resizing)` may fire 60+ times per second.
   */
  readonly resizeCommit = output<number>();

  /**
   * Teardown-only revert channel. Called with the pre-drag value when the resizer is
   * destroyed mid-drag (the pane layout is unmounted while the pointer is still down),
   * so the transient drag value never survives as the consumer's persisted size. On
   * every other revert path (`Escape`, `pointercancel`) the pre-drag value arrives
   * through `[(value)]` / `(resizing)` as usual and this callback does not fire.
   *
   * Bound as a function reference (`[valueRevert]="onRevert"`), not as an event binding:
   * the `[(value)]` model — like `(resizing)` and every other `output()` here — is
   * already destroyed when the unmount revert happens, so an emitter-based channel
   * cannot deliver it.
   */
  readonly valueRevert = input<((value: number) => void) | undefined>(undefined);

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #destroyRef = inject(DestroyRef);

  /** Last value above `min` — used to restore size when `collapsible` Enter expands. */
  #lastNonMinValue = 0;

  #pointerSession: PointerDragSession | null = null;

  #dragAxis: 'x' | 'y' = 'x';
  #dragStartCoord = 0;
  #dragStartValue = 0;
  #dragInvert = false;
  #dragCurrent = 0;

  /** True between the first kbd-driven mutation and the next `keyup`. */
  #pendingKeyboardCommit = false;

  #keyBurstStartValue = 0;

  #destroying = false;

  constructor() {
    if (this.#isBrowser) {
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
      this.#destroyRef.onDestroy(() => {
        this.#destroying = true;
        this.#pointerSession?.destroy();
      });
    }
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
    const current = this.value();
    if (next === current) {
      return;
    }
    if (!this.#pendingKeyboardCommit) {
      this.#keyBurstStartValue = current;
      this.#pendingKeyboardCommit = true;
    }
    this.value.set(next);
    this.resizing.emit(next);
  }

  protected onKeyUp(_event: KeyboardEvent): void {
    this.#flushKeyboardCommit();
  }

  protected onBlur(): void {
    this.#flushKeyboardCommit();
  }

  #onDragStart(event: PointerEvent): boolean {
    if (this.disabled()) {
      return false;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return false;
    }
    event.preventDefault();
    this.#host.focus();
    const ltr = this.dir() !== 'rtl';
    this.#dragAxis = this.orientation() === 'vertical' ? 'x' : 'y';
    this.#dragInvert = this.orientation() === 'vertical' && !ltr;
    this.#dragStartCoord = this.#dragAxis === 'x' ? event.clientX : event.clientY;
    this.#dragStartValue = this.value();
    this.#dragCurrent = this.#dragStartValue;
    return true;
  }

  #onDragMove(event: PointerEvent): void {
    const raw = this.#dragAxis === 'x' ? event.clientX : event.clientY;
    let delta = raw - this.#dragStartCoord;
    if (this.#dragInvert) {
      delta = -delta;
    }
    const next = this.#clamp(this.#dragStartValue + delta);
    if (next === this.#dragCurrent) {
      return;
    }
    this.#dragCurrent = next;
    this.value.set(next);
    this.resizing.emit(next);
  }

  #onDragCommit(): void {
    this.#recordNonMin(this.#dragCurrent, this.#dragStartValue);
    this.resizeCommit.emit(this.#dragCurrent);
  }

  #onDragCancel(): void {
    if (this.#dragCurrent === this.#dragStartValue) {
      return;
    }
    this.#dragCurrent = this.#dragStartValue;
    if (this.#destroying) {
      this.valueRevert()?.(this.#dragStartValue);
      return;
    }
    this.value.set(this.#dragStartValue);
    this.resizing.emit(this.#dragStartValue);
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
      this.#recordNonMin(min, current);
      next = min;
    }
    if (next === current) {
      return;
    }
    this.value.set(next);
    this.resizing.emit(next);
    this.resizeCommit.emit(next);
  }

  #flushKeyboardCommit(): void {
    if (!this.#pendingKeyboardCommit) {
      return;
    }
    this.#pendingKeyboardCommit = false;
    const committed = this.value();
    this.#recordNonMin(committed, this.#keyBurstStartValue);
    this.resizeCommit.emit(committed);
  }

  #recordNonMin(committed: number, burstStart: number): void {
    const min = this.min();
    if (committed > min) {
      this.#lastNonMinValue = committed;
    } else if (burstStart > min) {
      this.#lastNonMinValue = burstStart;
    }
  }

  #clamp(n: number): number {
    return clamp(n, this.min(), this.max());
  }

  /** Clamp a step-derived value, rounding to the step's precision first. */
  #stepClamp(n: number, step: number): number {
    return this.#clamp(roundToStepPrecision(n, step));
  }
}
