import { inject, InjectionToken } from '@angular/core';

import { type FieldSegment, type SegmentHandle, type SegmentEditorContext } from 'forty-cdk/core';

/**
 * A rendered segment descriptor exposed by `ForDateField.segments()` for the
 * consumer's `@for`. Covers both editable spinbutton segments and the
 * decorative literal separators between them.
 */
export type DateFieldSegment = FieldSegment;

/** Handle a `[forDateFieldSegment]` registers with the root for focus moves. */
export type ForDateFieldSegmentHandle = SegmentHandle;

/**
 * The coordination surface `ForDateField` exposes to its segment / literal
 * children. Segments read the reactive per-part accessors for their ARIA and
 * display bindings, and call the behavior methods to type, step, clear, and
 * move focus — all canonical state lives on the root, never on the segment.
 *
 * It is the shared {@link SegmentEditorContext} backing both date and time
 * fields; `ForDateField` satisfies it by forwarding to its `SegmentEditor`.
 */
export type ForDateFieldContext = SegmentEditorContext;

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
