import { Directive, effect, ElementRef, inject, input } from '@angular/core';

import { type ForHoverCardContext, injectHoverCardTriggerContext } from './hover-card-context';

/**
 * Element that activates the hover-card on hover or focus. Apply on a link,
 * a button, or any focusable element that already conveys the underlying
 * action (the card adds preview, not meaning).
 *
 * Reflects `data-state` so consumers can style the trigger when its card is
 * open (e.g. an underline that turns solid).
 *
 * **Intentional ARIA exception.** The trigger exposes no `aria-controls`,
 * `aria-expanded`, or `aria-describedby`, and `[forHoverCardContent]` carries
 * no role. This is deliberate, mirroring Radix: the trigger must already be
 * self-meaningful (a link or button that conveys the underlying action on its
 * own — the card adds preview, not meaning), and the card is non-essential
 * supplementary content that is hover/focus-revealed and not part of the
 * accessibility relationship. Popover / Tooltip, whose content is meant to be
 * discovered via the trigger, do wire trigger ARIA — HoverCard intentionally
 * does not.
 *
 * Escape dismissal is owned by the content's document-level dismissable
 * layer (see `ForHoverCardContent`), so it works from the trigger and from
 * unrelated focus alike — the trigger carries no Escape listener of its own.
 *
 * The root is normally resolved via DI from the enclosing `[forHoverCard]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forHoverCardTrigger]="root"` with `#root="forHoverCard"`.
 */
@Directive({
  selector: '[forHoverCardTrigger]',
  exportAs: 'forHoverCardTrigger',
  host: {
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class ForHoverCardTrigger {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forHoverCard]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forHoverCardTrigger]="root"`, with `#root="forHoverCard"`) when the
   * trigger is declared in an `ng-template` stamped inside the root — DI
   * resolves at the template's declaration site, so the enclosing root is
   * invisible there. The empty string (what the valueless attribute yields)
   * is treated as unset.
   */
  readonly forHoverCardTrigger = input<ForHoverCardContext | ''>('');

  protected readonly ctx = injectHoverCardTriggerContext(this.forHoverCardTrigger);

  #hovered = false;
  #focused = false;

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
    this.#hovered = true;
    this.ctx().scheduleOpen('hover-trigger');
  }

  protected onPointerLeave(): void {
    this.#hovered = false;
    this.#scheduleCloseIfInactive('hover-trigger');
  }

  protected onFocus(): void {
    this.#focused = true;
    this.ctx().scheduleOpen('focus');
  }

  protected onBlur(): void {
    this.#focused = false;
    this.#scheduleCloseIfInactive('focus');
  }

  #scheduleCloseIfInactive(reason: 'hover-trigger' | 'focus'): void {
    if (this.#hovered || this.#focused) {
      return;
    }
    this.ctx().scheduleClose(reason);
  }
}
