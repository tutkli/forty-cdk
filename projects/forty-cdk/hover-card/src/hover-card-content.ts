import { DestroyRef, Directive, DOCUMENT, ElementRef, inject } from '@angular/core';

import { composedContains, resolveActiveElement } from 'forty-cdk/core';
import {
  toFloatingPositioner,
  injectOverlayShell,
  warnIfMountedWhileClosed,
} from 'forty-cdk/core-overlay';
import { injectHoverCardContext } from './hover-card-context';

/**
 * The hover-card surface. Portaled to `document.body` and positioned by
 * floating-ui. Pointer-enter
 * on the content cancels the pending close, so the user can move the
 * cursor from the trigger into the card to interact with its content
 * (links, buttons, copy targets).
 *
 * Focus inside the content keeps the card open as hover does: a pointer
 * leaving the card, or a scroll, does not close it while one of its controls
 * holds focus, and focus leaving the content closes it once nothing else keeps
 * it alive.
 *
 * Mount / unmount via `@if (card.open())` on the consumer side so
 * `animate.enter` / `animate.leave` work natively.
 *
 * Escape is handled at the document level (outside dismissal stays
 * implicit, via pointer-leave timing), so it dismisses the card no matter
 * where focus lives when the
 * card was hover-opened. The surface never takes focus on open. When it
 * unmounts with focus inside it (Escape on a link in the card, a `[(open)]`
 * write), focus returns to the trigger, and that focus does not reopen the
 * card.
 *
 * **Intentional ARIA exception.** The content carries no role (only
 * `data-state` for styling) and the trigger exposes no ARIA linkage — the
 * card is non-essential supplementary content. See
 * `ForHoverCardTrigger` for the full rationale.
 */
@Directive({
  selector: '[forHoverCardContent]',
  exportAs: 'forHoverCardContent',
  host: {
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-reduced-motion]': 'ctx.reducedMotion() ? "" : null',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForHoverCardContent {
  protected readonly ctx = injectHoverCardContext('ForHoverCardContent');
  readonly #el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #doc = inject(DOCUMENT);

  #focusWithin = false;

  constructor() {
    const el = this.#el;
    this.ctx.registerContent(el);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.ctx.unregisterContent(el));
    destroyRef.onDestroy(() => {
      if (this.#focusWithin) {
        this.ctx.returnFocusToTrigger();
      }
    });

    warnIfMountedWhileClosed({
      primitive: 'hover-card',
      piece: '[forHoverCardContent]',
      condition: 'card.open()',
      open: this.ctx.open,
    });

    injectOverlayShell({
      positioner: toFloatingPositioner(this.ctx, this.ctx.trigger),
      dismiss: {
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
      },
    });
  }

  protected onPointerEnter(): void {
    this.ctx.pointerEnterContent();
  }

  protected onPointerLeave(): void {
    this.ctx.pointerLeaveContent();
  }

  protected onFocusIn(): void {
    this.#focusWithin = true;
    this.ctx.focusEnterContent();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node) {
      if (!composedContains(this.#el, next)) {
        this.#leave();
      }
      return;
    }
    queueMicrotask(() => {
      if (this.#el.isConnected && !composedContains(this.#el, resolveActiveElement(this.#doc))) {
        this.#leave();
      }
    });
  }

  #leave(): void {
    this.#focusWithin = false;
    this.ctx.focusLeaveContent();
  }
}
