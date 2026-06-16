import { Directive } from '@angular/core';

import { injectStepperContext } from './stepper-context';

/**
 * Terminal "all steps complete" panel. Shown (active) only while the stepper is in
 * the completed state (`selectedIndex` has reached `count`); gated the same way as
 * `[forStepperContent]` — `aria-hidden` / `inert` / `data-state` flip with
 * `isCompleted()`. The natural place for a wizard's final success panel.
 *
 * DOM presence is the consumer's responsibility — wrap with `@if` driven by the same
 * completed condition, or leave it mounted and toggle visibility with CSS via
 * `[data-state="active"]`.
 */
@Directive({
  selector: '[forStepperCompletedContent]',
  exportAs: 'forStepperCompletedContent',
  host: {
    role: 'group',
    '[attr.aria-hidden]': 'ctx.isCompleted() ? null : "true"',
    '[attr.inert]': 'ctx.isCompleted() ? null : ""',
    '[attr.data-state]': 'ctx.isCompleted() ? "active" : "inactive"',
  },
})
export class ForStepperCompletedContent {
  protected readonly ctx = injectStepperContext('ForStepperCompletedContent');
}
