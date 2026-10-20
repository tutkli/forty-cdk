import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { hostButtonType, reflectDisabled, registerHandle, staticHostId } from 'forty-cdk/core';
import {
  type ForPopoverContext,
  injectPopoverTriggerContext,
  POPOVER_TRIGGERS,
} from './popover-context';

/**
 * Button that toggles the popover when clicked. Apply on a focusable
 * element — preferably a `<button>` — so keyboard users can reach it.
 *
 * Wires `aria-expanded`, `aria-controls`, and `aria-haspopup="dialog"`,
 * registers the host as the floating-ui anchor, and toggles the open
 * state on click. The trigger is exempt from the dismissible layer's
 * outside-pointer / outside-focus checks so its own click never
 * spuriously closes the popover.
 *
 * Disabling: the trigger merges its own `disabled` input OR the root's
 * `disabled` into `effectiveDisabled`, which drives the native `disabled`
 * attribute, `data-disabled`, and the click guard. The native attribute is the
 * single reflection channel — no `aria-disabled` is emitted, because on a real
 * single-purpose `<button>` trigger the native attribute already conveys the
 * state to assistive technology.
 *
 * The root is normally resolved via DI from the enclosing `[forPopover]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forPopoverTrigger]="root"` with `#root="forPopover"`.
 */
@Directive({
  selector: '[forPopoverTrigger]',
  exportAs: 'forPopoverTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    '[id]': 'id()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForPopoverTrigger {
  private readonly buttonType = hostButtonType();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #staticId = staticHostId(this.#host.nativeElement);

  /**
   * Optional explicit reference to the `[forPopover]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forPopoverTrigger]="root"`, with `#root="forPopover"`) when the trigger
   * is declared in an `ng-template` stamped inside the root — DI resolves at
   * the template's declaration site, so the enclosing root is invisible there.
   * The empty string (what the valueless attribute yields) is treated as unset.
   */
  readonly forPopoverTrigger = input<ForPopoverContext | ''>('');

  readonly #resolved = injectPopoverTriggerContext(this.forPopoverTrigger);
  private readonly ctx = this.#resolved.ctx;

  private readonly id = computed(() => this.ctx().resolveTriggerId(this.#staticId));

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx().disabled());

  constructor() {
    const host = this.#host.nativeElement;
    const triggers = inject(POPOVER_TRIGGERS);
    registerHandle(
      { host, staticId: this.#staticId, root: this.#resolved.root },
      (handle) => triggers.add(handle),
      (handle) => triggers.remove(handle),
    );
    reflectDisabled(this.effectiveDisabled);
  }

  private onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.ctx().toggle();
  }
}
