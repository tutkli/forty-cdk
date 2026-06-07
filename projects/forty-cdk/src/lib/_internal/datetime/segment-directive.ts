import { computed, Directive, ElementRef, inject, type Signal } from '@angular/core';

import { registerHandle } from '../collection/register-handle';
import type { WritingDirection } from '../keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import type { SegmentHandle, SegmentType } from './segment-editor';

/**
 * The coordination surface a date / time root exposes to its segment children,
 * as consumed by the shared {@link ForDateTimeSegmentBase}. The reactive per-part
 * accessors and the behavior methods are forwarded straight to the root's
 * {@link import('./segment-editor').SegmentEditor}; `disabled` / `readonly` /
 * `dir` / `roving` come off the root directly.
 */
export interface SegmentEditorContext {
  /** Whether the field is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction (mirrors ArrowLeft / ArrowRight navigation). */
  readonly dir: Signal<WritingDirection>;
  /** Shared roving-tabindex tracker: one segment owns `tabindex=0` at a time. */
  readonly roving: RovingTabindex;

  segmentValue(type: SegmentType): number | null;
  segmentMin(type: SegmentType): number;
  segmentMax(type: SegmentType): number;
  segmentValueText(type: SegmentType): string | null;
  segmentDisplayText(type: SegmentType): string;
  isSegmentEmpty(type: SegmentType): boolean;
  isFirstSegmentType(type: SegmentType): boolean;

  registerSegment(handle: SegmentHandle): void;
  unregisterSegment(handle: SegmentHandle): void;

  focusSegment(type: SegmentType): void;
  typeDigit(type: SegmentType, digit: number): void;
  step(type: SegmentType, delta: number): void;
  goToBound(type: SegmentType, bound: 'min' | 'max'): void;
  setDayPeriod(period: 'am' | 'pm'): void;
  clear(type: SegmentType): void;
  focusSibling(type: SegmentType, step: -1 | 1): void;
}

/**
 * The shared spinbutton segment directive backing `[forDateFieldSegment]` and
 * `[forTimeFieldSegment]`. It owns `role="spinbutton"`, the `aria-value*`
 * reflection, the roving tabindex, the digit / arrow / Home-End / Backspace
 * keyboard map (RTL-mirrored ArrowLeft / ArrowRight), and the segment
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
    '[attr.aria-valuemin]': 'ctx.segmentMin(segment())',
    '[attr.aria-valuemax]': 'ctx.segmentMax(segment())',
    '[attr.aria-valuenow]': 'valueNow()',
    '[attr.aria-valuetext]': 'ctx.segmentValueText(segment())',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-placeholder]': 'ctx.isSegmentEmpty(segment()) ? "" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[attr.data-readonly]': 'ctx.readonly() ? "" : null',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
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

  protected readonly valueNow = computed(() => this.ctx.segmentValue(this.segment()));

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
    if (this.ctx.disabled()) {
      return -1;
    }
    if (this.ctx.roving.active() !== null) {
      return this.ctx.roving.tabindexFor(this.host.nativeElement);
    }
    return this.ctx.isFirstSegmentType(this.segment()) ? 0 : -1;
  });

  protected registerSegment(): void {
    const handle = { host: this.host.nativeElement, type: this.segment };
    registerHandle(
      handle,
      (h) => this.ctx.registerSegment(h),
      (h) => this.ctx.unregisterSegment(h),
      'afterNextRender',
    );
  }

  protected onFocus(): void {
    this.ctx.focusSegment(this.segment());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) {
      return;
    }
    const type = this.segment();
    const key = event.key;
    if (key.length === 1 && key >= '0' && key <= '9') {
      event.preventDefault();
      this.ctx.typeDigit(type, Number(key));
      return;
    }
    if (type === 'dayPeriod' && (key === 'a' || key === 'A' || key === 'p' || key === 'P')) {
      event.preventDefault();
      this.ctx.setDayPeriod(key === 'a' || key === 'A' ? 'am' : 'pm');
      return;
    }
    const rtl = this.ctx.dir() === 'rtl';
    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        this.ctx.step(type, 1);
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.ctx.step(type, -1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        this.ctx.focusSibling(type, rtl ? -1 : 1);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this.ctx.focusSibling(type, rtl ? 1 : -1);
        return;
      case 'Home':
        event.preventDefault();
        this.ctx.goToBound(type, 'min');
        return;
      case 'End':
        event.preventDefault();
        this.ctx.goToBound(type, 'max');
        return;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        this.ctx.clear(type);
        return;
      default:
        return;
    }
  }
}
