import { Directive } from '@angular/core';

import { ForDateTimeLiteralBase } from 'forty-cdk/core';

/**
 * A decorative separator (`/`, `.`, `-`, `:`) between the editable segments of a
 * `[forDateRangeFieldStart]` / `[forDateRangeFieldEnd]` endpoint. Apply on the
 * element rendering the literal text; it is marked `aria-hidden` and stays out
 * of the tab order, so assistive tech reads only the spinbutton segments. The
 * separator characters come from the endpoint's locale-ordered `segments()` list
 * (`{{ seg.text }}`).
 */
@Directive({
  selector: '[forDateRangeFieldLiteral]',
  exportAs: 'forDateRangeFieldLiteral',
})
export class ForDateRangeFieldLiteral extends ForDateTimeLiteralBase {}
