import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
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
 * attribute, `aria-disabled`, `data-disabled`, and the click guard.
 */
@Directive({
  selector: '[forDisclosureTrigger]',
  exportAs: 'forDisclosureTrigger',
  host: {
    type: 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForDisclosureTrigger {
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
