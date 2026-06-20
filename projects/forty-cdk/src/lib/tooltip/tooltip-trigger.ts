import { Directive, effect, ElementRef, inject, input } from '@angular/core';

import { type ForTooltipContext, injectTooltipTriggerContext } from './tooltip-context';

/**
 * Element that activates the tooltip on hover or focus. Apply on a focusable
 * element — preferably a `<button>` so keyboard users can reach it. Receives
 * `aria-describedby` only while the tooltip is open, per APG.
 *
 * The root is normally resolved via DI from the enclosing `[forTooltip]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forTooltipTrigger]="root"` with `#root="forTooltip"`.
 */
@Directive({
  selector: '[forTooltipTrigger]',
  exportAs: 'forTooltipTrigger',
  host: {
    '[id]': 'ctx().triggerId()',
    '[attr.aria-describedby]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class ForTooltipTrigger {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forTooltip]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forTooltipTrigger]="root"`, with `#root="forTooltip"`) when the trigger
   * is declared in an `ng-template` stamped inside the root — DI resolves at
   * the template's declaration site, so the enclosing root is invisible there.
   * The empty string (what the valueless attribute yields) is treated as unset.
   */
  readonly forTooltipTrigger = input<ForTooltipContext | ''>('');

  protected readonly ctx = injectTooltipTriggerContext(this.forTooltipTrigger);

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
  }

  protected onPointerEnter(): void {
    this.ctx().pointerEnterTrigger();
  }

  protected onPointerLeave(event: PointerEvent): void {
    this.ctx().pointerLeaveTrigger({ x: event.clientX, y: event.clientY });
  }

  protected onFocus(): void {
    this.ctx().focusTrigger();
  }

  protected onBlur(): void {
    this.ctx().blurTrigger();
  }

  protected onEscape(event: Event): void {
    if (this.ctx().open()) {
      event.preventDefault();
      event.stopPropagation();
      this.ctx().scheduleClose('escape');
    }
  }
}
