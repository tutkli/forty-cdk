import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

import { injectSliderContext, type SliderArrowKey } from './slider-context';

/**
 * One slider thumb. Apply on any focusable element (commonly `<span>` /
 * `<div>` with the directive's auto-injected `tabindex`). The directive
 * sets `role="slider"`, the live `aria-value*` attributes, keyboard
 * handling, and starts a drag on pointerdown.
 *
 * `[index]` is the 0-based position in the parent slider's `value()` array
 * — pass the loop index when rendering N thumbs:
 *
 * ```html
 * @for (v of value(); let i = $index; track i) {
 *   <span forSliderThumb [index]="i" [label]="i === 0 ? 'Min' : 'Max'"></span>
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
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-labelledby]': 'labelledby() || null',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-readonly]': 'ctx.readonly() ? "" : null',
    '[attr.data-index]': 'index()',
    '[style.--for-slider-thumb-position]': 'fraction()',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class ForSliderThumb {
  protected readonly ctx = injectSliderContext('ForSliderThumb');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Position in the parent slider's `value()` array (0-based). */
  readonly index = input.required({ transform: numberAttribute });

  /**
   * Optional fixed label for assistive tech (e.g. "Minimum price",
   * "Maximum price"). Mirrored as `aria-label`. Use `[labelledby]`
   * instead if the label lives elsewhere in the DOM.
   */
  readonly label = input<string>('');
  readonly labelledby = input<string>('');

  /**
   * Optional human-readable value override (e.g. "$1,200" instead of "1200").
   * Mirrored as `aria-valuetext`. Falls back to the numeric value.
   */
  readonly valueText = input<string>('');

  protected readonly tabindex = computed(() => (this.ctx.disabled() ? -1 : 0));

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

  protected readonly ariaValueMin = computed(() => {
    const i = this.index();
    const values = this.ctx.value();
    if (i > 0 && i < values.length) {
      // Multi-thumb non-passing: this thumb's lower bound is the previous
      // thumb's value (matches APG multi-thumb guidance).
      return values[i - 1]!;
    }
    return this.ctx.minValue();
  });

  protected readonly ariaValueMax = computed(() => {
    const i = this.index();
    const values = this.ctx.value();
    if (i >= 0 && i < values.length - 1) {
      return values[i + 1]!;
    }
    return this.ctx.maxValue();
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      index: this.index,
    };
    this.ctx.registerThumb(handle);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterThumb(handle));
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
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
        this.ctx.commitInteraction();
        return;
      default:
        return;
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
      return;
    }
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    // Stop the track's pointerdown handler from re-running "nearest thumb"
    // — clicking directly on a thumb should drag *that* thumb.
    event.stopPropagation();
    event.preventDefault();
    this.#host.nativeElement.focus();
    this.ctx.beginDrag(this.index(), event);
  }
}
