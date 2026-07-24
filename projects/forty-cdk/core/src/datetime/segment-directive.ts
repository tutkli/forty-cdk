import { computed, Directive, ElementRef, inject, type Signal } from '@angular/core';

import { registerHandle } from '../collection/register-handle';
import type { WritingDirection } from '../keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import type { SegmentEditorDelegate, SegmentType } from './segment-editor';
import { unicodeDigitValue } from './unicode-digit';

/**
 * The coordination surface a date / time root exposes to its segment children,
 * as consumed by the shared {@link ForDateTimeSegmentBase}. The field-level
 * `effectiveDisabled` / `readonly` / `dir` / `roving` signals come off the root
 * directly; every per-part accessor and behavior method lives on the
 * {@link SegmentEditorDelegate} (the field engine itself), reached through
 * `delegate`.
 */
export interface SegmentEditorContext {
  /**
   * The field's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Segments read this so a disabled field
   * (or fieldset) is inert and exposes `aria-disabled`.
   */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction (mirrors ArrowLeft / ArrowRight navigation). */
  readonly dir: Signal<WritingDirection>;
  /** Shared roving-tabindex tracker: one segment owns `tabindex=0` at a time. */
  readonly roving: RovingTabindex;
  /** The field engine backing the per-segment accessors and behavior methods. */
  readonly delegate: SegmentEditorDelegate;
}

/**
 * The shared spinbutton segment directive backing `[forDateFieldSegment]` and
 * `[forTimeFieldSegment]`. It owns `role="spinbutton"`, the `aria-value*`
 * reflection, the roving tabindex, the digit / arrow / Home-End / Backspace
 * (pop last digit) / Delete (clear whole segment) keyboard map (RTL-mirrored
 * ArrowLeft / ArrowRight), and the segment
 * registration. All state lives on the root via {@link SegmentEditorContext};
 * the segment only reads it and forwards intents.
 *
 * `@Directive` without a `selector` so the public subclasses
 * (`ForDateFieldSegment` / `ForTimeFieldSegment`) declare the concrete
 * `[forXxxFieldSegment]` selector, `exportAs`, and the `segment` /
 * `ariaLabel` inputs. The host block and behavior are inherited.
 */
@Directive({
  host: {
    role: 'spinbutton',
    '[attr.tabindex]': 'tabindex()',
    '[attr.inputmode]': 'inputmode()',
    '[attr.autocorrect]': '"off"',
    '[attr.spellcheck]': '"false"',
    '[attr.aria-valuemin]': 'ctx.delegate.segmentMin(segment())',
    '[attr.aria-valuemax]': 'ctx.delegate.segmentMax(segment())',
    '[attr.aria-valuenow]': 'valueNow()',
    '[attr.aria-valuetext]': 'ctx.delegate.segmentValueText(segment())',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'ctx.effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-placeholder]': 'ctx.delegate.isSegmentEmpty(segment()) ? "" : null',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'ctx.readonly() ? "" : null',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export abstract class ForDateTimeSegmentBase {
  /** The coordination surface of the surrounding date / time root. */
  protected abstract readonly ctx: SegmentEditorContext;

  /** Which date or time part this segment edits. */
  abstract readonly segment: Signal<SegmentType>;

  /** Accessible name for this segment. Falls back to the segment type when unset. */
  abstract readonly ariaLabel: Signal<string | null>;

  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The accessible name bound to `aria-label`. Defaults to the explicit
   * `ariaLabel` input, falling back to the raw segment type; the concrete
   * subclasses override this to source localized, injector-scoped defaults.
   */
  protected readonly resolvedAriaLabel: Signal<string> = computed(
    () => this.ariaLabel() ?? this.segment(),
  );

  protected readonly valueNow = computed(() => this.ctx.delegate.segmentValue(this.segment()));

  protected readonly inputmode = computed<'numeric' | null>(() =>
    this.segment() === 'dayPeriod' ? null : 'numeric',
  );

  protected readonly highlighted = computed(
    () => this.ctx.roving.active() === this.host.nativeElement,
  );

  /**
   * APG tabindex: the user-focused segment owns `tabindex=0` (tracked by the
   * shared `RovingTabindex`). Before any interaction the first segment in the
   * locale order is the field's single tab entry; disabled fields are skipped.
   */
  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.ctx.effectiveDisabled()) {
      return -1;
    }
    if (this.ctx.roving.hasActive()) {
      return this.ctx.roving.tabindexFor(this.host.nativeElement);
    }
    return this.ctx.delegate.isFirstSegmentType(this.segment()) ? 0 : -1;
  });

  protected registerSegment(): void {
    const handle = { host: this.host.nativeElement, type: this.segment };
    registerHandle(
      handle,
      (h) => this.ctx.delegate.registerSegment(h),
      (h) => this.ctx.delegate.unregisterSegment(h),
      'afterNextRender',
    );
  }

  protected onFocus(): void {
    this.ctx.delegate.focusSegment(this.segment());
  }

  protected onBlur(): void {
    this.ctx.delegate.endTyping();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.effectiveDisabled()) {
      return;
    }
    const type = this.segment();
    const key = event.key;
    const digit = unicodeDigitValue(key);
    if (digit !== null) {
      event.preventDefault();
      this.ctx.delegate.typeDigit(type, digit);
      return;
    }
    if (type === 'dayPeriod' && this.ctx.delegate.setDayPeriodFromKey(key)) {
      event.preventDefault();
      return;
    }
    const rtl = this.ctx.dir() === 'rtl';
    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        this.ctx.delegate.step(type, 1);
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.delegate.step(type, -1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        this.ctx.delegate.focusSibling(type, rtl ? -1 : 1);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this.ctx.delegate.focusSibling(type, rtl ? 1 : -1);
        return;
      case 'Home':
        event.preventDefault();
        this.ctx.delegate.goToBound(type, 'min');
        return;
      case 'End':
        event.preventDefault();
        this.ctx.delegate.goToBound(type, 'max');
        return;
      case 'Backspace':
        event.preventDefault();
        this.ctx.delegate.backspace(type);
        return;
      case 'Delete':
        event.preventDefault();
        this.ctx.delegate.clear(type);
        return;
      default:
        return;
    }
  }
}
