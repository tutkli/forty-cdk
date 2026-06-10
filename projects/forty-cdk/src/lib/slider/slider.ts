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
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { Collection } from '../_internal/collection/collection';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  FOR_SLIDER_CONTEXT,
  type ForSliderContext,
  type ForSliderThumbHandle,
  type SliderArrowKey,
} from './slider-context';
import { FOR_SLIDER_DEFAULTS } from './slider-defaults';

/**
 * Round `value` to the number of decimal places `step` carries, so float
 * arithmetic noise (e.g. `0.1 * 3 === 0.30000000000000004`) can't masquerade
 * as a change in the `next === current[index]` equality guard nor leak into
 * `aria-valuenow`. Integer steps round to integers; a `0.1` step rounds to one
 * decimal, and so on.
 */
function roundToStepPrecision(value: number, step: number): number {
  const stepText = String(step);
  const dot = stepText.indexOf('.');
  if (dot < 0) {
    return Math.round(value);
  }
  const decimals = stepText.length - dot - 1;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Headless implementation of the [WAI-ARIA Slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
 * (single thumb) and [Slider (Multi-Thumb)](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multi-thumb/)
 * (range / N thumbs). Implements `FormValueControl<readonly number[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Selection is always modeled as `readonly number[]`:
 * - 1 entry → single-thumb slider.
 * - 2 entries → range slider.
 * - N entries → multi-thumb slider.
 *
 * Values are kept clamped to `[min, max]` and snapped to `step` increments.
 * In multi-thumb mode they're constrained between neighbors so thumbs can't
 * cross (`minStepsBetweenThumbs` forces a minimum gap, in step units).
 *
 * The `model()` change emitter (`(valueChange)`) fires only on internal
 * updates (drag, keyboard, track click), never on consumer writes via
 * `[(value)]` — observe transitions without binding back.
 *
 * For trailing-edge work (network calls, undo entries) bind `(valueCommit)`
 * instead — it fires once at the end of an interaction with the final value
 * array, never per drag step.
 */
@Directive({
  selector: '[forSlider]',
  exportAs: 'forSlider',
  host: {
    role: 'group',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_SLIDER_CONTEXT, useExisting: ForSlider }],
})
export class ForSlider
  extends FormUiControlBase
  implements Omit<FormValueControl<readonly number[]>, 'min' | 'max'>, ForSliderContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #defaults = inject(FOR_SLIDER_DEFAULTS);

  /**
   * Two-way bindable. Selected values, one per thumb. Single-thumb sliders
   * keep one entry, range sliders two, multi-thumb N. Values must be sorted
   * ascending for multi-thumb; thumb-by-thumb clamping keeps the order
   * during interaction. Defaults to `[0]`; set an explicit `[(value)]`
   * when `min` is non-zero.
   */
  readonly value = model<readonly number[]>([0]);

  /**
   * Minimum value. Falls back to `0` internally. A slider's bounds are scalar
   * by the ARIA slider pattern, but since Signal Forms v22 `FormUiControl.min`
   * is typed `NonNullable<TValue>` — an array for this control — so `min` and
   * `max` are excluded from the `FormValueControl` `implements` clause, and
   * the transform widens the write type to satisfy the `[formField]` template
   * type-check (which pushes `readonly number[] | undefined`). The form never
   * produces a `min`/`max` state for an array-valued field at runtime (the
   * `min()`/`max()` validators only apply to numeric fields), so non-number
   * writes normalize to `undefined`.
   */
  readonly min = input(0 as number | undefined, {
    transform: (value: number | readonly number[] | undefined): number | undefined =>
      typeof value === 'number' ? value : undefined,
  });
  /**
   * Maximum value. Falls back to `100` internally. Excluded from the
   * `FormValueControl` `implements` clause and write-type-widened — see
   * {@link min}.
   */
  readonly max = input(100 as number | undefined, {
    transform: (value: number | readonly number[] | undefined): number | undefined =>
      typeof value === 'number' ? value : undefined,
  });
  /**
   * Increment values snap to. Fractional steps (e.g. `0.1`) are supported: the
   * snapped value is rounded to the step's decimal precision so float noise
   * (`0.1 * 3`) can't spuriously emit `valueCommit` or leak into
   * `aria-valuenow`.
   */
  readonly step = input<number>(1);
  /**
   * Step used for PageUp / PageDown. Defaults to 10× `step`. The default is
   * read from `provideForSliderDefaults` for the surrounding scope.
   */
  readonly largeStep = input<number>(this.#defaults.largeStep);

  /** Effective minimum (defaults `0` when input is unset). Exposed to children via context. */
  readonly minValue = computed(() => this.min() ?? 0);
  /** Effective maximum (defaults `100`). Exposed to children via context. */
  readonly maxValue = computed(() => this.max() ?? 100);

  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and flips the
   * horizontal increase direction in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Visual inversion. Flips the mapping between value and screen position
   * (e.g. horizontal LTR with `inverted=true`: max sits on the left).
   * Keyboard semantics still target "toward max" with ArrowUp / ArrowRight
   * (LTR), independent of visual flip.
   */
  readonly inverted = input(false, { transform: booleanAttribute });

  /**
   * Multi-thumb only: minimum gap between adjacent thumbs, in step units.
   * Default `0` (touch but never cross — non-passing per APG).
   */
  readonly minStepsBetweenThumbs = input<number>(0);

  /**
   * Emitted at the end of a value-changing interaction — pointerup /
   * pointercancel after a drag, or keyup after one or more keyboard
   * adjustments — with the final value array. Mirrors Radix / Base UI
   * `onValueCommit`. Use it to defer expensive work (network calls,
   * history entries) to the trailing edge of the interaction instead of
   * running it per step. Stays silent when nothing changed (e.g. press +
   * release without movement, or a non-navigation key on a focused thumb).
   */
  readonly valueCommit = output<readonly number[]>();

  readonly #thumbs = new Collection<ForSliderThumbHandle>();
  readonly #trackEl = signal<HTMLElement | null>(null);
  readonly #destroyRef = inject(DestroyRef);
  readonly #activeDragCleanups = new Set<() => void>();
  #interactionMutated = false;
  #armedThumb: number | null = null;

  readonly fractions = computed(() => {
    const min = this.minValue();
    const max = this.maxValue();
    const inv = this.inverted();
    const span = max - min;
    if (span <= 0) {
      return this.value().map(() => 0);
    }
    return this.value().map((v) => {
      const f = (v - min) / span;
      const clamped = f < 0 ? 0 : f > 1 ? 1 : f;
      return inv ? 1 - clamped : clamped;
    });
  });

  /**
   * Range start fraction. Visual semantics: in single-thumb mode the range
   * always grows from the min edge to the thumb (`0 → fraction[0]`); in
   * multi-thumb mode it spans `min(values) → max(values)`. `inverted` is
   * already baked into the fractions, so consumers can paint blindly.
   */
  readonly rangeStart = computed(() => {
    const fr = this.fractions();
    if (fr.length === 0) {
      return 0;
    }
    if (fr.length === 1) {
      return Math.min(fr[0]!, this.inverted() ? 1 : 0);
    }
    return Math.min(...fr);
  });

  readonly rangeEnd = computed(() => {
    const fr = this.fractions();
    if (fr.length === 0) {
      return 0;
    }
    if (fr.length === 1) {
      return Math.max(fr[0]!, this.inverted() ? 1 : 0);
    }
    return Math.max(...fr);
  });

  constructor() {
    super();
    const stringValues = computed(() => this.value().map((v) => String(v)));
    injectHiddenInput({
      name: this.name,
      values: stringValues,
      disabled: this.disabled,
    });
    this.#destroyRef.onDestroy(() => {
      for (const cleanup of this.#activeDragCleanups) {
        cleanup();
      }
      this.#activeDragCleanups.clear();
    });
  }

  setValueAt(index: number, raw: number): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const current = this.value();
    if (index < 0 || index >= current.length) {
      return;
    }
    const next = this.#clampForIndex(current, index, raw);
    if (next === current[index]) {
      return;
    }
    const updated = current.slice();
    updated[index] = next;
    this.value.set(updated);
    this.#interactionMutated = true;
    this.#armedThumb = index;
  }

  bumpAt(index: number, key: SliderArrowKey, large: boolean): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const current = this.value();
    if (index < 0 || index >= current.length) {
      return;
    }
    const direction = this.#directionFor(key);
    if (direction === 0) {
      return;
    }
    const stepUnit = large ? this.largeStep() : this.step();
    const target = current[index]! + direction * stepUnit;
    this.setValueAt(index, target);
  }

  setExtreme(index: number, which: 'min' | 'max'): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.setValueAt(index, which === 'min' ? this.minValue() : this.maxValue());
  }

  pointerToValue(clientX: number, clientY: number): number {
    const track = this.#trackEl();
    const min = this.minValue();
    const max = this.maxValue();
    if (!track) {
      return min;
    }
    const rect = track.getBoundingClientRect();
    const horizontal = this.orientation() === 'horizontal';
    let fraction: number;
    if (horizontal) {
      const width = rect.width || 1;
      fraction = (clientX - rect.left) / width;
      if (this.dir() === 'rtl') {
        fraction = 1 - fraction;
      }
    } else {
      const height = rect.height || 1;
      // Vertical default: bottom = min, top = max.
      fraction = (rect.bottom - clientY) / height;
    }
    if (this.inverted()) {
      fraction = 1 - fraction;
    }
    fraction = fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
    return min + fraction * (max - min);
  }

  nearestThumbIndex(target: number): number {
    const values = this.value();
    if (values.length === 0) {
      return -1;
    }
    let bestIndex = 0;
    let bestDelta = Math.abs(values[0]! - target);
    let bestValue = values[0]!;
    for (let i = 1; i < values.length; i++) {
      const value = values[i]!;
      const delta = Math.abs(value - target);
      if (delta < bestDelta) {
        bestIndex = i;
        bestDelta = delta;
        bestValue = value;
      } else if (delta === bestDelta) {
        if (target > bestValue) {
          bestIndex = i;
          bestValue = value;
        }
      }
    }
    return bestIndex;
  }

  beginDrag(index: number, event: PointerEvent): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const pointerId = event.pointerId;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) {
        return;
      }
      e.preventDefault();
      this.setValueAt(index, this.pointerToValue(e.clientX, e.clientY));
    };
    // Drag tracking listens on the document's defaultView (the window)
    // so the pointer can leave the slider track without losing the drag.
    // Read it through the injected DOCUMENT to stay SSR-friendly — pointer
    // events themselves only fire in the browser, so the optional chain
    // simply makes this a no-op on the server.
    const win = this.#document.defaultView;
    const cleanup = () => {
      win?.removeEventListener('pointermove', move);
      win?.removeEventListener('pointerup', stop);
      win?.removeEventListener('pointercancel', stop);
      this.#activeDragCleanups.delete(cleanup);
    };
    const stop = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) {
        return;
      }
      cleanup();
      this.markTouched();
      this.commitInteraction();
    };
    win?.addEventListener('pointermove', move);
    win?.addEventListener('pointerup', stop);
    win?.addEventListener('pointercancel', stop);
    this.#activeDragCleanups.add(cleanup);
  }

  setTrack(el: HTMLElement | null): void {
    this.#trackEl.set(el);
  }

  trackElement(): HTMLElement | null {
    return this.#trackEl();
  }

  override markTouched(): void {
    if (!this.touched()) {
      super.markTouched();
    }
  }

  /**
   * Emit `valueCommit` if the running interaction mutated the value at least
   * once, and clear the flag. Pointer drags call this on pointerup with no
   * argument (the drag's own pointerup is already scoped to one thumb). Thumbs
   * call it on keyup of a navigation key, passing their own `thumbIndex` so a
   * keyup on a thumb that did not arm the pending commit (e.g. a second thumb
   * focused and released without moving) cannot mis-attribute or steal another
   * thumb's pending commit — only the thumb that armed it commits.
   */
  commitInteraction(thumbIndex?: number): void {
    if (!this.#interactionMutated) {
      return;
    }
    if (thumbIndex !== undefined && this.#armedThumb !== thumbIndex) {
      return;
    }
    this.#interactionMutated = false;
    this.#armedThumb = null;
    this.valueCommit.emit(this.value());
  }

  /**
   * Move focus to a thumb, implementing `FormUiControl.focus` from
   * `@angular/forms/signals`. Without this override Signal Forms would focus
   * the host `role="group"` wrapper — which is not focusable and carries no
   * keyboard map — so focus-on-error would silently go nowhere. Targets the
   * first registered thumb (the roving-tabindex entry point); no-op when the
   * slider is disabled or has no thumbs.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#thumbs.items()[0]?.host.focus(options);
  }

  registerThumb(handle: ForSliderThumbHandle): void {
    this.#thumbs.register(handle);
  }

  unregisterThumb(handle: ForSliderThumbHandle): void {
    this.#thumbs.unregister(handle);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.markTouched();
  }

  /** Snap, clamp, and (multi-thumb) keep within neighbor bounds. */
  #clampForIndex(values: readonly number[], index: number, raw: number): number {
    const min = this.minValue();
    const max = this.maxValue();
    const step = this.step();
    const gap = this.minStepsBetweenThumbs() * step;
    const snapped =
      step > 0 ? roundToStepPrecision(Math.round((raw - min) / step) * step + min, step) : raw;
    let lo = min;
    let hi = max;
    if (index > 0) {
      lo = Math.max(lo, values[index - 1]! + gap);
    }
    if (index < values.length - 1) {
      hi = Math.min(hi, values[index + 1]! - gap);
    }
    return snapped < lo ? lo : snapped > hi ? hi : snapped;
  }

  /**
   * Returns +1 / -1 / 0 for the keyboard direction's effect on the value,
   * resolving orientation × dir × inverted. Up / Right (LTR) increase by
   * default; `inverted` flips both axes.
   */
  #directionFor(key: SliderArrowKey): 1 | -1 | 0 {
    let positive: boolean;
    switch (key) {
      case 'ArrowUp':
        positive = true;
        break;
      case 'ArrowDown':
        positive = false;
        break;
      case 'ArrowRight':
        positive = this.dir() !== 'rtl';
        break;
      case 'ArrowLeft':
        positive = this.dir() === 'rtl';
        break;
      default:
        return 0;
    }
    if (this.inverted()) {
      positive = !positive;
    }
    return positive ? 1 : -1;
  }
}
