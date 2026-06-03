import { inject, InjectionToken, type Signal } from '@angular/core';

import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { DateTimeSegmentType } from './build-segments';

/**
 * A rendered segment descriptor exposed by `ForDateField.segments()` for the
 * consumer's `@for`. Covers both editable spinbutton segments and the
 * decorative literal separators between them.
 */
export interface DateFieldSegment {
  /** Stable key for `@for` tracking. */
  readonly id: string;
  /** `true` for a separator (`/`, `.`, `-`); `false` for an editable segment. */
  readonly isLiteral: boolean;
  /** The calendar part an editable segment edits; `null` for a literal. */
  readonly type: DateTimeSegmentType | null;
  /**
   * Text to render: the formatted value when the segment is filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly text: string;
}

/** Handle a `[forDateFieldSegment]` registers with the root for focus moves. */
export interface ForDateFieldSegmentHandle {
  /** The segment's host element. */
  readonly host: HTMLElement;
  /** The calendar part the segment edits. */
  readonly type: Signal<DateTimeSegmentType>;
}

/**
 * The coordination surface `ForDateField` exposes to its segment / literal
 * children. Segments read the reactive per-part accessors for their ARIA and
 * display bindings, and call the behavior methods to type, step, clear, and
 * move focus — all canonical state lives on the root, never on the segment.
 *
 * @typeParam D The adapter's immutable date type.
 */
export interface ForDateFieldContext {
  /** Whether the field is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction (mirrors ArrowLeft / ArrowRight navigation). */
  readonly dir: Signal<WritingDirection>;
  /** Shared roving-tabindex tracker: one segment owns `tabindex=0` at a time. */
  readonly roving: RovingTabindex;

  /** Current numeric value of `type`, or `null` while empty. */
  segmentValue(type: DateTimeSegmentType): number | null;
  /** Lowest accepted value for `type` (date parts `1`; hour `0`/`1` by cycle; minute/second/dayPeriod `0`). */
  segmentMin(type: DateTimeSegmentType): number;
  /** Highest accepted value for `type` (day clamps to the current month length). */
  segmentMax(type: DateTimeSegmentType): number;
  /** Human-readable value for `aria-valuetext` (month name), or `null`. */
  segmentValueText(type: DateTimeSegmentType): string | null;
  /** Text shown in the segment: formatted value, or placeholder while empty. */
  segmentDisplayText(type: DateTimeSegmentType): string;
  /** `true` while `type` has no entered value. */
  isSegmentEmpty(type: DateTimeSegmentType): boolean;
  /** `true` when `type` is the first segment in the locale order (the tab entry). */
  isFirstSegmentType(type: DateTimeSegmentType): boolean;

  /** Register a segment so the root can move focus to it. */
  registerSegment(handle: ForDateFieldSegmentHandle): void;
  /** Remove a previously registered segment. */
  unregisterSegment(handle: ForDateFieldSegmentHandle): void;

  /** Marks `type` as the active typing target, resetting any stale digit buffer. */
  focusSegment(type: DateTimeSegmentType): void;
  /** Append a typed digit to `type`, auto-advancing to the next segment when full. */
  typeDigit(type: DateTimeSegmentType, digit: number): void;
  /** Step `type` by `delta` (`+1` / `-1`), wrapping day / month, clamping year. */
  step(type: DateTimeSegmentType, delta: number): void;
  /** Set `type` to its minimum (`Home`) or maximum (`End`); dayPeriod → AM / PM. */
  goToBound(type: DateTimeSegmentType, bound: 'min' | 'max'): void;
  /** Set the AM / PM period of the entered hour (date-time fields only). */
  setDayPeriod(period: 'am' | 'pm'): void;
  /** Clear `type`'s entered value (no-op for the derived dayPeriod segment). */
  clear(type: DateTimeSegmentType): void;
  /** Move focus to the sibling segment `step` positions away (no wrap). */
  focusSibling(type: DateTimeSegmentType, step: -1 | 1): void;
}

/**
 * Injection token for the {@link ForDateFieldContext} provided by
 * `[forDateField]`. Segment and literal children inject it to coordinate with
 * the root.
 */
export const FOR_DATE_FIELD_CONTEXT = new InjectionToken<ForDateFieldContext>(
  'FOR_DATE_FIELD_CONTEXT',
);

/**
 * Resolves the surrounding {@link ForDateFieldContext}, throwing a descriptive,
 * primitive-prefixed error when used outside a `[forDateField]`.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectDateFieldContext(piece: string): ForDateFieldContext {
  const ctx = inject(FOR_DATE_FIELD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/date-field] ${piece} must be used inside a [forDateField].`);
  }
  return ctx;
}
