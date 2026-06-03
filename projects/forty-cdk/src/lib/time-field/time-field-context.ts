import { inject, InjectionToken, type Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import type { TimeSegmentType } from './build-time-segments';

/**
 * A rendered segment descriptor exposed by `ForTimeField.segments()` for the
 * consumer's `@for`. Covers both editable spinbutton segments (hour / minute /
 * second / dayPeriod) and the decorative literal separators between them.
 */
export interface TimeFieldSegment {
  /** Stable key for `@for` tracking. */
  readonly id: string;
  /** `true` for a separator (`:`, a space); `false` for an editable segment. */
  readonly isLiteral: boolean;
  /** The time part an editable segment edits; `null` for a literal. */
  readonly type: TimeSegmentType | null;
  /**
   * Text to render: the formatted value when the segment is filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly text: string;
}

/** Handle a `[forTimeFieldSegment]` registers with the root for focus moves. */
export interface ForTimeFieldSegmentHandle {
  /** The segment's host element. */
  readonly host: HTMLElement;
  /** The time part the segment edits. */
  readonly type: Signal<TimeSegmentType>;
}

/**
 * The coordination surface `ForTimeField` exposes to its segment / literal
 * children. Segments read the reactive per-part accessors for their ARIA and
 * display bindings, and call the behavior methods to type, step, clear, and
 * move focus — all canonical state lives on the root, never on the segment.
 */
export interface ForTimeFieldContext {
  /** Whether the field is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction (mirrors ArrowLeft / ArrowRight navigation). */
  readonly dir: Signal<WritingDirection>;
  /** Shared roving-tabindex tracker: one segment owns `tabindex=0` at a time. */
  readonly roving: RovingTabindex;

  /** Current numeric value for `aria-valuenow` (hour in cycle units, 0/1 for dayPeriod), or `null`. */
  segmentValue(type: TimeSegmentType): number | null;
  /** Lowest accepted value for `type` (hour: 0 or 1 by cycle; minute/second: 0; dayPeriod: 0). */
  segmentMin(type: TimeSegmentType): number;
  /** Highest accepted value for `type` (hour: 12 or 23 by cycle; minute/second: 59; dayPeriod: 1). */
  segmentMax(type: TimeSegmentType): number;
  /** Human-readable value for `aria-valuetext` (localized AM/PM for dayPeriod), or `null`. */
  segmentValueText(type: TimeSegmentType): string | null;
  /** Text shown in the segment: formatted value, or placeholder while empty. */
  segmentDisplayText(type: TimeSegmentType): string;
  /** `true` while `type` has no entered value. */
  isSegmentEmpty(type: TimeSegmentType): boolean;
  /** `true` when `type` is the first segment in the locale order (the tab entry). */
  isFirstSegmentType(type: TimeSegmentType): boolean;

  /** Register a segment so the root can move focus to it. */
  registerSegment(handle: ForTimeFieldSegmentHandle): void;
  /** Remove a previously registered segment. */
  unregisterSegment(handle: ForTimeFieldSegmentHandle): void;

  /** Marks `type` as the active typing target, resetting any stale digit buffer. */
  focusSegment(type: TimeSegmentType): void;
  /** Append a typed digit to a numeric `type`, auto-advancing when full (no-op for dayPeriod). */
  typeDigit(type: TimeSegmentType, digit: number): void;
  /** Step `type` by `delta` (`+1` / `-1`): hour / minute / second wrap; dayPeriod sets PM when positive. */
  step(type: TimeSegmentType, delta: number): void;
  /** Set `type` to its minimum (`Home`) or maximum (`End`); dayPeriod → AM / PM. */
  goToBound(type: TimeSegmentType, bound: 'min' | 'max'): void;
  /** Set the AM / PM period of the entered hour. */
  setDayPeriod(period: 'am' | 'pm'): void;
  /** Clear `type`'s entered value (no-op for the derived dayPeriod segment). */
  clear(type: TimeSegmentType): void;
  /** Move focus to the sibling segment `step` positions away (no wrap). */
  focusSibling(type: TimeSegmentType, step: -1 | 1): void;
}

/**
 * Injection token for the {@link ForTimeFieldContext} provided by
 * `[forTimeField]`. Segment and literal children inject it to coordinate with
 * the root.
 */
export const FOR_TIME_FIELD_CONTEXT = new InjectionToken<ForTimeFieldContext>(
  'FOR_TIME_FIELD_CONTEXT',
);

/**
 * Resolves the surrounding {@link ForTimeFieldContext}, throwing a descriptive,
 * primitive-prefixed error when used outside a `[forTimeField]`.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectTimeFieldContext(piece: string): ForTimeFieldContext {
  const ctx = inject(FOR_TIME_FIELD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/time-field] ${piece} must be used inside a [forTimeField].`);
  }
  return ctx;
}
