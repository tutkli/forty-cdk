import { inject, InjectionToken, type Signal } from '@angular/core';

import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { DateSegmentType } from './build-segments';

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
  readonly type: DateSegmentType | null;
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
  readonly type: Signal<DateSegmentType>;
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
  segmentValue(type: DateSegmentType): number | null;
  /** Lowest accepted value for any segment (always `1`). */
  segmentMin(): number;
  /** Highest accepted value for `type` (day clamps to the current month length). */
  segmentMax(type: DateSegmentType): number;
  /** Human-readable value for `aria-valuetext` (month name), or `null`. */
  segmentValueText(type: DateSegmentType): string | null;
  /** Text shown in the segment: formatted value, or placeholder while empty. */
  segmentDisplayText(type: DateSegmentType): string;
  /** `true` while `type` has no entered value. */
  isSegmentEmpty(type: DateSegmentType): boolean;
  /** `true` when `type` is the first segment in the locale order (the tab entry). */
  isFirstSegmentType(type: DateSegmentType): boolean;

  /** Register a segment so the root can move focus to it. */
  registerSegment(handle: ForDateFieldSegmentHandle): void;
  /** Remove a previously registered segment. */
  unregisterSegment(handle: ForDateFieldSegmentHandle): void;

  /** Marks `type` as the active typing target, resetting any stale digit buffer. */
  focusSegment(type: DateSegmentType): void;
  /** Append a typed digit to `type`, auto-advancing to the next segment when full. */
  typeDigit(type: DateSegmentType, digit: number): void;
  /** Step `type` by `delta` (`+1` / `-1`), wrapping day / month, clamping year. */
  step(type: DateSegmentType, delta: number): void;
  /** Set `type` to its minimum (`Home`) or maximum (`End`). */
  goToBound(type: DateSegmentType, bound: 'min' | 'max'): void;
  /** Clear `type`'s entered value. */
  clear(type: DateSegmentType): void;
  /** Move focus to the sibling segment `step` positions away (no wrap). */
  focusSibling(type: DateSegmentType, step: -1 | 1): void;
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
