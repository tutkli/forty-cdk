import { inject, InjectionToken } from '@angular/core';

import {
  type FieldSegment,
  orphanContextError,
  type SegmentEditorContext,
  type SegmentHandle,
  type TimeSegmentType,
} from 'forty-cdk/core';

/**
 * A rendered segment descriptor exposed by `ForTimeField.segments()` for the
 * consumer's `@for`. Covers both editable spinbutton segments (hour / minute /
 * second / dayPeriod) and the decorative literal separators between them.
 */
export type TimeFieldSegment = FieldSegment<TimeSegmentType>;

/** Handle a `[forTimeFieldSegment]` registers with the root for focus moves. */
export type ForTimeFieldSegmentHandle = SegmentHandle<TimeSegmentType>;

/**
 * The coordination surface `ForTimeField` exposes to its segment / literal
 * children. Segments read the reactive per-part accessors for their ARIA and
 * display bindings, and call the behavior methods to type, step, clear, and
 * move focus — all canonical state lives on the root, never on the segment.
 *
 * It is the shared {@link SegmentEditorContext} backing both date and time
 * fields; `ForTimeField` satisfies it by forwarding to its `SegmentEditor`.
 */
export type ForTimeFieldContext = SegmentEditorContext;

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
    throw orphanContextError({
      code: 'FORCDK-TIME-FIELD-001',
      piece,
      root: '[forTimeField]',
      token: 'FOR_TIME_FIELD_CONTEXT',
    });
  }
  return ctx;
}
