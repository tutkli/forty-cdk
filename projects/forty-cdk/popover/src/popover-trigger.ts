import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { type ForPopoverContext, injectPopoverTriggerContext } from './popover-context';

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
 * state to assistive technology (rule #561 D2).
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
    '[id]': 'ctx().triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForPopoverTrigger {
  protected readonly buttonType = hostButtonType();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  protected readonly ctx = injectPopoverTriggerContext(this.forPopoverTrigger);

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx().disabled());

  constructor() {
    const el = this.#host.nativeElement;
    // Registration is an imperative call into the resolved root's registry,
    // not state derivation — the effect only re-registers the element when the
    // resolved root changes (explicit reference swapped at runtime).
    effect((onCleanup) => {
      const ctx = this.ctx();
      ctx.registerTrigger(el);
      onCleanup(() => ctx.unregisterTrigger(el));
    });
    reflectDisabled(this.effectiveDisabled);
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.ctx().toggle();
  }
}
