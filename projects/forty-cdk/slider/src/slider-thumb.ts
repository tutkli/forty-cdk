import { computed, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

import { registerHandle, hostAriaLabel } from 'forty-cdk/core';
import {
  injectSliderContext,
  type ForSliderThumbBounds,
  type SliderArrowKey,
} from './slider-context';

/**
 * One slider thumb. Apply on any focusable element (commonly `<span>` /
 * `<div>` with the directive's auto-injected `tabindex`). The directive
 * sets `role="slider"`, the live `aria-value*` attributes, and keyboard
 * handling. Pointer drag is coordinated by the parent `[forSlider]`, whose
 * root-hosted pointer session drags this thumb when the press lands on it.
 *
 * `[index]` is the 0-based position in the parent slider's `value()` array
 * — pass the loop index when rendering N thumbs:
 *
 * ```html
 * @for (v of value(); let i = $index; track i) {
 *   <span forSliderThumb [index]="i" [ariaLabel]="i === 0 ? 'Min' : 'Max'"></span>
 * }
 * ```
 *
 * Custom property exposed:
 * - `--for-slider-thumb-position` — fraction `[0, 1]` already accounting
 *   for `inverted`. Use it via e.g.
 *   `inset-inline-start: calc(var(--for-slider-thumb-position) * 100%)`.
 */
@Directive({
  selector: '[forSliderThumb]',
  exportAs: 'forSliderThumb',
  host: {
    role: 'slider',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-valuemin]': 'ariaValueMin()',
    '[attr.aria-valuemax]': 'ariaValueMax()',
    '[attr.aria-valuenow]': 'ariaValueNow()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'ctx.effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'ctx.readonly() ? "" : null',
    '[attr.data-index]': 'index()',
    '[style.--for-slider-thumb-position]': 'fraction()',
    '[style.touch-action]': 'touchAction()',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
  },
})
export class ForSliderThumb {
  protected readonly ctx = injectSliderContext('ForSliderThumb');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Position in the parent slider's `value()` array (0-based). */
  readonly index = input.required({ transform: numberAttribute });

  /**
   * Optional accessible name for this thumb (e.g. "Minimum price",
   * "Maximum price"), emitted as `aria-label`. Defaults to `null`, so no
   * attribute is emitted when unset. A consumer-set **static** `aria-label`
   * on the host wins over this input. When the name already exists as a
   * visible element in the DOM, write a native `aria-labelledby` on the host
   * instead — the directive never touches that attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  /**
   * Optional human-readable value override (e.g. "$1,200" instead of "1200").
   * Mirrored as `aria-valuetext` only when non-empty; when omitted, no
   * `aria-valuetext` is emitted so assistive tech reads `aria-valuenow`.
   */
  readonly valueText = input<string>('');

  protected readonly tabindex = computed(() => (this.ctx.effectiveDisabled() ? -1 : 0));

  /**
   * `touch-action` for the thumb: capture the slider's own axis so a finger
   * drag along it can't be stolen by page scrolling (which would fire
   * `pointercancel` mid-drag and can commit a mid-drag value), while freeing
   * the perpendicular axis for scrolling. A horizontal slider drags along x
   * (`pan-y`); a vertical slider drags along y (`pan-x`). Suppressed while the
   * slider is disabled or readonly (no drag to protect).
   */
  protected readonly touchAction = computed<string | null>(() => {
    if (this.ctx.effectiveDisabled() || this.ctx.readonly()) {
      return null;
    }
    return this.ctx.orientation() === 'vertical' ? 'pan-x' : 'pan-y';
  });

  protected readonly currentValue = computed(() => {
    const i = this.index();
    const values = this.ctx.value();
    if (i < 0 || i >= values.length) {
      return this.ctx.minValue();
    }
    return values[i]!;
  });

  protected readonly fraction = computed(() => {
    const i = this.index();
    const fr = this.ctx.fractions();
    if (i < 0 || i >= fr.length) {
      return 0;
    }
    return fr[i]!;
  });

  protected readonly ariaValueNow = computed(() => this.currentValue());

  protected readonly ariaValueText = computed(() => this.valueText() || null);

  readonly #bounds = computed<ForSliderThumbBounds>(
    () =>
      this.ctx.thumbBounds()[this.index()] ?? {
        min: this.ctx.minValue(),
        max: this.ctx.maxValue(),
      },
  );

  protected readonly ariaValueMin = computed(() => this.#bounds().min);

  protected readonly ariaValueMax = computed(() => this.#bounds().max);

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      index: this.index,
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerThumb(h),
      (h) => this.ctx.unregisterThumb(h),
    );
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.effectiveDisabled() || this.ctx.readonly()) {
      return;
    }
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        this.ctx.bumpAt(this.index(), event.key as SliderArrowKey, false);
        return;
      case 'PageUp':
        event.preventDefault();
        this.ctx.bumpAt(this.index(), 'ArrowUp', true);
        return;
      case 'PageDown':
        event.preventDefault();
        this.ctx.bumpAt(this.index(), 'ArrowDown', true);
        return;
      case 'Home':
        event.preventDefault();
        this.ctx.setExtreme(this.index(), 'min');
        return;
      case 'End':
        event.preventDefault();
        this.ctx.setExtreme(this.index(), 'max');
        return;
      default:
        return;
    }
  }

  protected onKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'PageUp':
      case 'PageDown':
      case 'Home':
      case 'End':
        this.ctx.commitInteraction(this.index());
        return;
      default:
        return;
    }
  }
}
