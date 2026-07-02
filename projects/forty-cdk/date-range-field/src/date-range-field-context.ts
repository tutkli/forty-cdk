import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type FieldSegment,
  type SegmentEditorContext,
  type WritingDirection,
} from 'forty-cdk/core';

/** Which endpoint group of a range field a piece coordinates with. */
export type DateRangeFieldEndpoint = 'start' | 'end';

/**
 * A rendered segment descriptor exposed by an endpoint's `segments()` for the
 * consumer's `@for`. Covers both editable spinbutton segments and the
 * decorative literal separators between them.
 */
export type DateRangeFieldSegment = FieldSegment;

/**
 * Coordination surface `[forDateRangeField]` (the root) exposes to its two
 * endpoint groups (`[forDateRangeFieldStart]` / `[forDateRangeFieldEnd]`). The
 * root owns the start / end segment engines and the composed
 * `DateRange` value; each endpoint reads its rendered segments, its
 * accessible group label, and the {@link SegmentEditorContext} it provides to
 * its own segment / literal children.
 */
export interface ForDateRangeFieldContext {
  /** The field's effective disabled (own input OR a surrounding disabled `[forFieldset]`). */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction, reflected on each endpoint group. */
  readonly dir: Signal<WritingDirection>;
  /** The rendered segment list for `which` endpoint. */
  endpointSegments(which: DateRangeFieldEndpoint): Signal<readonly FieldSegment[]>;
  /** The segment-coordination surface `which` endpoint provides to its segments. */
  endpointContext(which: DateRangeFieldEndpoint): SegmentEditorContext;
  /** The accessible `aria-label` for `which` endpoint group. */
  endpointLabel(which: DateRangeFieldEndpoint): Signal<string | null>;
}

/**
 * Injection token for the {@link ForDateRangeFieldContext} provided by
 * `[forDateRangeField]`. Endpoint children inject it to coordinate with the
 * root.
 */
export const FOR_DATE_RANGE_FIELD_CONTEXT = new InjectionToken<ForDateRangeFieldContext>(
  'FOR_DATE_RANGE_FIELD_CONTEXT',
);

/**
 * Per-endpoint {@link SegmentEditorContext} token. Each endpoint group provides
 * it (routed to the matching start / end engine on the root); segment and
 * literal children inject it to read their ARIA / display bindings and forward
 * keyboard intents. Internal plumbing — not part of the consumer-facing API.
 */
export const FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT = new InjectionToken<SegmentEditorContext>(
  'FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT',
);

/**
 * Resolves the surrounding {@link ForDateRangeFieldContext}, throwing a
 * descriptive, primitive-prefixed error when used outside a `[forDateRangeField]`.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectDateRangeFieldContext(piece: string): ForDateRangeFieldContext {
  const ctx = inject(FOR_DATE_RANGE_FIELD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/date-range-field] ${piece} must be used inside a [forDateRangeField].`,
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
export function injectDateRangeFieldSegmentContext(piece: string): SegmentEditorContext {
  const ctx = inject(FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/date-range-field] ${piece} must be used inside a [forDateRangeFieldStart] or [forDateRangeFieldEnd].`,
    );
  }
  return ctx;
}
