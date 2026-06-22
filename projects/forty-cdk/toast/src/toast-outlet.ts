import { Directive, inject, Injector } from '@angular/core';

/**
 * @internal Exposes the element injector at a child of the row's `[forToast]`
 * element so a consumer-supplied toast `template` can be rendered with the
 * `[forToast]` injection context in scope.
 *
 * Angular's `ngTemplateOutlet` renders a template against its *declaration*
 * injector (the consumer's component, where `<ng-template>` was written), not
 * the insertion point — so `[forToastTitle]` / `[forToastDescription]` /
 * `[forToastAction]` / `[forToastClose]`, which `inject(FOR_TOAST_CONTEXT)`,
 * would fail to resolve the row's `ForToast`.
 *
 * This directive sits on the same `<ng-container>` as the `ngTemplateOutlet`,
 * inside the row's `[forToast]` element, so its own element injector already
 * resolves `FOR_TOAST_CONTEXT`. The viewport feeds that injector to
 * `[ngTemplateOutletInjector]`, making the rendered template inherit it and
 * restoring the automatic `aria-labelledby` / `aria-describedby` / close-reason
 * wiring for the helper directives inside the custom template — without adding
 * a wrapper element to the consumer's markup.
 */
@Directive({
  selector: '[forToastOutlet]',
  exportAs: 'forToastOutlet',
})
export class ForToastOutlet {
  /**
   * Element injector resolving `FOR_TOAST_CONTEXT` for the enclosing toast
   * row. Passed to `[ngTemplateOutletInjector]` so helper directives inside a
   * custom template wire a11y exactly as in the default shape.
   */
  readonly injector = inject(Injector);
}
