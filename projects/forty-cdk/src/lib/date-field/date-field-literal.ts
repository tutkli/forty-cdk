import { Directive } from '@angular/core';

/**
 * A decorative separator (`/`, `.`, `-`) between the editable segments of a
 * `[forDateField]`. Apply on the element rendering the literal text; it is
 * marked `aria-hidden` and stays out of the tab order, so assistive tech reads
 * only the spinbutton segments. The separator characters come from the root's
 * locale-ordered `segments()` list (`{{ seg.text }}`).
 */
@Directive({
  selector: '[forDateFieldLiteral]',
  exportAs: 'forDateFieldLiteral',
  host: {
    'aria-hidden': 'true',
  },
})
export class ForDateFieldLiteral {}
