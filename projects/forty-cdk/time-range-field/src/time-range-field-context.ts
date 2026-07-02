import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type FieldSegment,
  type SegmentEditorContext,
  type TimeSegmentType,
  type WritingDirection,
} from 'forty-cdk/core';

/** Which endpoint group of a time range field a piece coordinates with. */
export type TimeRangeFieldEndpoint = 'start' | 'end';

/**
 * A rendered segment descriptor exposed by an endpoint's `segments()` for the
 * consumer's `@for`. Covers both editable spinbutton segments (hour / minute /
 * second / dayPeriod) and the decorative literal separators between them.
 */
export type TimeRangeFieldSegment = FieldSegment<TimeSegmentType>;

/**
 * Coordination surface `[forTimeRangeField]` (the root) exposes to its two
 * endpoint groups (`[forTimeRangeFieldStart]` / `[forTimeRangeFieldEnd]`). The
 * root owns the start / end time engines and the composed `DateRange`
 * value; each endpoint reads its rendered segments, its accessible group label,
 * and the {@link SegmentEditorContext} it provides to its own segment / literal
 * children.
 */
export interface ForTimeRangeFieldContext {
  /** The field's effective disabled (own input OR a surrounding disabled `[forFieldset]`). */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction, reflected on each endpoint group. */
  readonly dir: Signal<WritingDirection>;
  /** The rendered segment list for `which` endpoint. */
  endpointSegments(which: TimeRangeFieldEndpoint): Signal<readonly FieldSegment<TimeSegmentType>[]>;
  /** The segment-coordination surface `which` endpoint provides to its segments. */
  endpointContext(which: TimeRangeFieldEndpoint): SegmentEditorContext;
  /** The accessible `aria-label` for `which` endpoint group. */
  endpointLabel(which: TimeRangeFieldEndpoint): Signal<string | null>;
}

/**
 * Injection token for the {@link ForTimeRangeFieldContext} provided by
 * `[forTimeRangeField]`. Endpoint children inject it to coordinate with the
 * root.
 */
export const FOR_TIME_RANGE_FIELD_CONTEXT = new InjectionToken<ForTimeRangeFieldContext>(
  'FOR_TIME_RANGE_FIELD_CONTEXT',
);

/**
 * Per-endpoint {@link SegmentEditorContext} token. Each endpoint group provides
 * it (routed to the matching start / end engine on the root); segment and
 * literal children inject it to read their ARIA / display bindings and forward
 * keyboard intents. Internal plumbing — not part of the consumer-facing API.
 */
export const FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT = new InjectionToken<SegmentEditorContext>(
  'FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT',
);

/**
 * Resolves the surrounding {@link ForTimeRangeFieldContext}, throwing a
 * descriptive, primitive-prefixed error when used outside a `[forTimeRangeField]`.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectTimeRangeFieldContext(piece: string): ForTimeRangeFieldContext {
  const ctx = inject(FOR_TIME_RANGE_FIELD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/time-range-field] ${piece} must be used inside a [forTimeRangeField].`,
    );
  }
  return ctx;
}

/**
 * Resolves the surrounding endpoint's {@link SegmentEditorContext}, throwing a
 * descriptive, primitive-prefixed error when used outside an endpoint group.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectTimeRangeFieldSegmentContext(piece: string): SegmentEditorContext {
  const ctx = inject(FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/time-range-field] ${piece} must be used inside a [forTimeRangeFieldStart] or [forTimeRangeFieldEnd].`,
    );
  }
  return ctx;
}
