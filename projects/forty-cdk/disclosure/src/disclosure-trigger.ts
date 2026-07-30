import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { injectDisclosureContext } from './disclosure-context';

/**
 * Trigger button for a `ForDisclosure`. Apply on a `<button>` so Enter/Space
 * toggling come from native button behavior. The directive host-binds
 * `type="button"` so a trigger inside a `<form>` never submits it on toggle.
 *
 * `aria-controls` is emitted only while open — mirroring the overlay triggers'
 * open-only gating — so the reference never dangles at an unmounted panel
 * under the recommended `@if (open())` mount pattern.
 *
 * Disabling: the trigger merges its own `disabled` input OR the root's
 * `disabled` into `effectiveDisabled`, which drives the native `disabled`
 * attribute, `data-disabled`, and the click guard. The native attribute is the
 * single reflection channel — no `aria-disabled` is emitted, because on a real
 * single-purpose `<button>` trigger the native attribute already conveys the
 * state to assistive technology (rule #561 D2).
 */
@Directive({
  selector: '[forDisclosureTrigger]',
  exportAs: 'forDisclosureTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForDisclosureTrigger {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectDisclosureContext('ForDisclosureTrigger');

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  constructor() {
    this.ctx.adoptTriggerId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
    reflectDisabled(this.effectiveDisabled);
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.ctx.toggle();
  }
}
