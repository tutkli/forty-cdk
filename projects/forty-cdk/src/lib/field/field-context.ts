import { inject } from '@angular/core';

import { FOR_FIELD_CONTEXT, type ForFieldContext } from '../_internal/field/field-wiring';

export {
  FOR_FIELD_CONTEXT,
  injectFieldWiring,
  type ForFieldContext,
  type FieldControlHandle,
} from '../_internal/field/field-wiring';

/**
 * Resolves the surrounding `ForField` context, throwing if the consumer
 * placed the piece outside a `[forField]` element.
 */
export function injectFieldContext(piece: string): ForFieldContext {
  const ctx = inject(FOR_FIELD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/field] ${piece} must be used inside a [forField] element.`);
  }
  return ctx;
}
