import { computed, signal, type Signal } from '@angular/core';

import type { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { from12, to12 } from './hour-cycle';
import type { TimeSegmentType } from './segment-types';

/** Which calendar part an editable date segment edits. */
export type DateSegmentType = 'day' | 'month' | 'year';

/**
 * Every editable part a date(-time) or time field can render — the date parts
 * plus the time parts (`hour` / `minute` / `second` / the AM·PM `dayPeriod`).
 */
export type SegmentType = DateSegmentType | TimeSegmentType;

/** Spec for a single editable spinbutton segment. */
export interface EditableSpec {
  readonly kind: 'editable';
  /** The date or time part this segment edits. */
  readonly type: SegmentType;
  /** Maximum number of digits the segment accepts before it is full (`0` for the AM/PM toggle). */
  readonly digits: number;
}

/** Spec for a non-editable separator rendered between segments. */
export interface LiteralSpec {
  readonly kind: 'literal';
  /** The separator characters (`/`, `.`, `-`, `:`, a space, …) for the runtime locale. */
  readonly literal: string;
}

/** A single entry in the locale-ordered segment list. */
export type FieldSpec = EditableSpec | LiteralSpec;

/** Per-part entered state: the entered value for each editable segment, hour as 0-23. */
export type SegmentParts = Partial<Record<SegmentType, number | null>>;

/**
 * A rendered segment descriptor for the consumer's `@for`. Covers both editable
 * spinbutton segments and the decorative literal separators between them.
 *
 * @typeParam T The segment-type union the owning field renders (the date field
 *   carries the full {@link SegmentType}; the time field narrows to its
 *   `TimeSegmentType`).
 */
export interface FieldSegment<T extends SegmentType = SegmentType> {
  /** Stable key for `@for` tracking. */
  readonly id: string;
  /** `true` for a separator; `false` for an editable segment. */
  readonly isLiteral: boolean;
  /** The part an editable segment edits; `null` for a literal. */
  readonly type: T | null;
  /**
   * Text to render: the formatted value when the segment is filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly text: string;
}

/** Handle a segment directive registers with the editor for focus moves. */
export interface SegmentHandle<T extends SegmentType = SegmentType> {
  /** The segment's host element. */
  readonly host: HTMLElement;
  /** The part the segment edits. */
  readonly type: Signal<T>;
}

/**
 * The field-specific surface a date / time root supplies to its
 * {@link SegmentEditor}. The editor owns the spin-button state machine (typing
 * buffer, step / clear / Home-End, digit auto-advance, RTL focus moves, the
 * segment registry); the host supplies only what differs between a date field
 * and a time field: the reactive specs / cycle / locale data, the per-segment
 * bounds, the empty-segment seed, the placeholder, the extra `aria-valuetext`,
 * and how a committed parts record is composed into the value.
 *
 * @typeParam P The host's parts shape (a subtype of {@link SegmentParts}).
 */
export interface SegmentEditorHost<P extends SegmentParts> {
  /** Whether the field is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Shared roving-tabindex tracker: one segment owns `tabindex=0` at a time. */
  readonly roving: RovingTabindex;
  /** Resolved hour cycle (`12` shows AM/PM, `24` does not). */
  readonly cycle: Signal<12 | 24>;
  /** The ordered, locale-derived spec list (editable + literals). */
  readonly specs: Signal<readonly FieldSpec[]>;
  /** The editable parts in their locale order — the navigation / auto-advance order. */
  readonly editableOrder: Signal<readonly SegmentType[]>;
  /** Localized AM / PM strings for the `dayPeriod` segment. */
  readonly periodNames: Signal<{ am: string; pm: string }>;

  /** Current entered parts. */
  parts(): P;
  /** Lowest accepted display value for `type`. */
  segmentMin(type: SegmentType): number;
  /** Highest accepted display value for `type`. */
  segmentMax(type: SegmentType): number;
  /** Base value for stepping an empty `type` on first step. */
  seed(type: SegmentType): number;
  /** Placeholder shown while `type` is empty. */
  placeholderFor(type: SegmentType): string;
  /**
   * Field-specific `aria-valuetext` for a filled `type` (e.g. the month name),
   * or `null` to fall back to the default numeric reading.
   */
  valueText(type: SegmentType): string | null;
  /**
   * Composes the next parts into the field value and writes it.
   *
   * `transient` is `true` for a mid-typing digit whose segment buffer has not
   * yet settled (a non-final keystroke). A transient commit must compose the
   * value **without** clamping it to the field bounds, so an intermediate
   * out-of-range composition (e.g. a partially typed year) never snaps the
   * value and rehydrates — and corrupts — the other already-typed segments. A
   * settled commit (`false`: a completed digit / auto-advance, a step, a
   * Home/End jump, a day-period toggle, or a clear) clamps to the bounds.
   */
  commit(next: P, transient: boolean): void;
}

/**
 * The shared spin-button editor backing `ForDateField` and `ForTimeField`.
 *
 * It owns everything that was duplicated ~95% between the two roots: the
 * ephemeral digit-typing buffer, `typeDigit` (digit fill + auto-advance), `step`
 * (with the 12/24-hour-aware hour stepping), `goToBound`, `setDayPeriod`,
 * `clear`, the RTL-mirrored `focusSibling` / `focusSegment`, the
 * `registerSegment` / `unregisterSegment` `Map`, and the reactive per-part
 * accessors (`segmentValue` / `segmentDisplayText` / `segmentValueText` /
 * `isSegmentEmpty` / `isFirstSegmentType`) plus the rendered `segments` list.
 *
 * Constructed directly (`new SegmentEditor(host)`); it holds no injection
 * context. The host (a date or time root) supplies the field-specific bits
 * through {@link SegmentEditorHost}.
 *
 * @typeParam P The host's parts shape.
 * @typeParam T The segment-type union the owning field renders.
 */
export class SegmentEditor<P extends SegmentParts, T extends SegmentType = SegmentType> {
  readonly #host: SegmentEditorHost<P>;
  readonly #segments = new Map<SegmentType, SegmentHandle>();

  /** Ephemeral type-to-fill buffer for the segment currently being typed into. */
  readonly #typing = signal<{ type: SegmentType; buffer: string } | null>(null);

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment<T>[]>;

  constructor(host: SegmentEditorHost<P>) {
    this.#host = host;
    this.segments = computed<readonly FieldSegment<T>[]>(() => {
      let literalIndex = 0;
      return this.#host.specs().map((spec): FieldSegment<T> => {
        if (spec.kind === 'literal') {
          return {
            id: `literal-${literalIndex++}`,
            isLiteral: true,
            type: null,
            text: spec.literal,
          };
        }
        return {
          id: spec.type,
          isLiteral: false,
          type: spec.type as T,
          text: this.segmentDisplayText(spec.type),
        };
      });
    });
  }

  segmentValue(type: SegmentType): number | null {
    const parts = this.#host.parts();
    if (type === 'dayPeriod') {
      const hour = parts.hour;
      return hour == null ? null : hour >= 12 ? 1 : 0;
    }
    if (type === 'hour') {
      const hour = parts.hour;
      if (hour == null) {
        return null;
      }
      return this.#host.cycle() === 12 ? to12(hour).h12 : hour;
    }
    return parts[type] ?? null;
  }

  segmentValueText(type: SegmentType): string | null {
    if (type === 'dayPeriod') {
      const hour = this.#host.parts().hour;
      if (hour == null) {
        return null;
      }
      const names = this.#host.periodNames();
      return hour >= 12 ? names.pm : names.am;
    }
    return this.#host.valueText(type);
  }

  segmentDisplayText(type: SegmentType): string {
    const typing = this.#typing();
    if (typing && typing.type === type) {
      return typing.buffer;
    }
    if (type === 'dayPeriod') {
      const hour = this.#host.parts().hour;
      if (hour == null) {
        return this.#host.placeholderFor(type);
      }
      const names = this.#host.periodNames();
      return hour >= 12 ? names.pm : names.am;
    }
    const value = this.segmentValue(type);
    if (value === null) {
      return this.#host.placeholderFor(type);
    }
    return String(value).padStart(type === 'year' ? 4 : 2, '0');
  }

  isSegmentEmpty(type: SegmentType): boolean {
    if (type === 'dayPeriod') {
      return this.#host.parts().hour == null;
    }
    return this.#host.parts()[type] == null;
  }

  isFirstSegmentType(type: SegmentType): boolean {
    return this.#host.editableOrder()[0] === type;
  }

  registerSegment(handle: SegmentHandle): void {
    this.#segments.set(handle.type(), handle);
  }

  unregisterSegment(handle: SegmentHandle): void {
    if (this.#segments.get(handle.type()) === handle) {
      this.#segments.delete(handle.type());
    }
  }

  focusSegment(type: SegmentType): void {
    const handle = this.#segments.get(type);
    if (handle) {
      this.#host.roving.setActive(handle.host);
    }
    this.#typing.set(null);
  }

  typeDigit(type: SegmentType, digit: number): void {
    if (this.#host.disabled() || this.#host.readonly() || type === 'dayPeriod') {
      return;
    }
    const spec = this.#editableSpec(type);
    const min = this.#host.segmentMin(type);
    const max = this.#host.segmentMax(type);
    const previous = this.#typing();
    let buffer = (previous?.type === type ? previous.buffer : '') + String(digit);
    if (Number(buffer) > max || buffer.length > spec.digits) {
      buffer = String(digit);
    }
    const num = Number(buffer);
    const valid = num >= min && num <= max;
    const full = valid && (buffer.length >= spec.digits || num * 10 > max);
    this.#typing.set({ type, buffer });
    this.#host.commit(this.#withPart(type, valid ? this.#toInternal(type, num) : null), !full);
    if (full) {
      this.#typing.set(null);
      this.focusSibling(type, 1);
    }
  }

  step(type: SegmentType, delta: number): void {
    if (this.#host.disabled() || this.#host.readonly()) {
      return;
    }
    this.#typing.set(null);
    if (type === 'dayPeriod') {
      this.setDayPeriod(delta > 0 ? 'pm' : 'am');
      return;
    }
    const parts = this.#host.parts();
    const current = parts[type];
    if (current == null) {
      this.#host.commit(this.#withPart(type, this.#host.seed(type)), false);
      return;
    }
    let next: number;
    if (type === 'hour') {
      next = this.#stepHour(current, delta);
    } else if (type === 'minute' || type === 'second') {
      next = (((current + delta) % 60) + 60) % 60;
    } else if (type === 'year') {
      next = Math.min(
        this.#host.segmentMax(type),
        Math.max(this.#host.segmentMin(type), current + delta),
      );
    } else {
      const min = this.#host.segmentMin(type);
      const range = this.#host.segmentMax(type) - min + 1;
      next = min + ((((current - min + delta) % range) + range) % range);
    }
    this.#host.commit(this.#withPart(type, next), false);
  }

  goToBound(type: SegmentType, bound: 'min' | 'max'): void {
    if (this.#host.disabled() || this.#host.readonly()) {
      return;
    }
    this.#typing.set(null);
    if (type === 'dayPeriod') {
      this.setDayPeriod(bound === 'min' ? 'am' : 'pm');
      return;
    }
    const display = bound === 'min' ? this.#host.segmentMin(type) : this.#host.segmentMax(type);
    this.#host.commit(this.#withPart(type, this.#toInternal(type, display)), false);
  }

  setDayPeriod(period: 'am' | 'pm'): void {
    if (this.#host.disabled() || this.#host.readonly()) {
      return;
    }
    this.#typing.set(null);
    const hour = this.#host.parts().hour ?? null;
    const pm = period === 'pm';
    const next = hour === null ? (pm ? 12 : 0) : pm ? (hour % 12) + 12 : hour % 12;
    this.#host.commit(this.#withPart('hour', next), false);
  }

  clear(type: SegmentType): void {
    if (this.#host.disabled() || this.#host.readonly() || type === 'dayPeriod') {
      return;
    }
    this.#typing.set(null);
    this.#host.commit(this.#withPart(type, null), false);
  }

  focusSibling(type: SegmentType, step: -1 | 1): void {
    const order = this.#host.editableOrder();
    const targetType = order[order.indexOf(type) + step];
    if (targetType === undefined) {
      return;
    }
    const handle = this.#segments.get(targetType);
    if (!handle) {
      return;
    }
    this.#host.roving.setActive(handle.host);
    handle.host.focus();
  }

  /** Converts a displayed segment value to its internal representation (hour: 12h→24h). */
  #toInternal(type: SegmentType, display: number): number {
    if (type !== 'hour' || this.#host.cycle() === 24) {
      return display;
    }
    const hour = this.#host.parts().hour ?? null;
    const pm = hour !== null && hour >= 12;
    return from12(display, pm);
  }

  #stepHour(current: number, delta: number): number {
    if (this.#host.cycle() === 24) {
      return (((current + delta) % 24) + 24) % 24;
    }
    const { h12, pm } = to12(current);
    const nextH12 = ((((h12 - 1 + delta) % 12) + 12) % 12) + 1;
    return from12(nextH12, pm);
  }

  #editableSpec(type: SegmentType): EditableSpec {
    return this.#host
      .specs()
      .find((spec): spec is EditableSpec => spec.kind === 'editable' && spec.type === type)!;
  }

  /**
   * Returns the current parts with `type` set to `value`. `type` is always a key
   * the host's parts record carries, so the computed-key spread is a genuine `P`
   * at runtime; the assertion narrows the object-literal index type back to `P`.
   */
  #withPart(type: SegmentType, value: number | null): P {
    return { ...this.#host.parts(), [type]: value } as P;
  }
}
