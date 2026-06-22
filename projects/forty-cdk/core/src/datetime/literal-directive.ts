import { Directive } from '@angular/core';

/**
 * Shared base for the decorative separator directives `[forDateFieldLiteral]`
 * and `[forTimeFieldLiteral]`. It marks the host `aria-hidden` and keeps it out
 * of the tab order, so assistive tech reads only the spinbutton segments. The
 * separator characters come from the root's locale-ordered `segments()` list.
 *
 * `@Directive` without a `selector` so the public subclasses declare the
 * concrete `[forXxxFieldLiteral]` selector and `exportAs`; the `aria-hidden`
 * host binding is inherited.
 */
@Directive({
  host: {
    'aria-hidden': 'true',
  },
})
export abstract class ForDateTimeLiteralBase {}
