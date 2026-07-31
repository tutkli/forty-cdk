import { Directive, ElementRef, inject } from '@angular/core';

import {
  registerHandle,
  hostAriaLabel,
  hostLabelledBy,
  injectOverlayShell,
  injectMenuContext,
  isHoverCapablePointer,
  menuLayerNesting,
} from 'forty-cdk/core';

/**
 * The menu surface. Carries `role="menu"`, is portaled to `document.body`,
 * and is positioned by `@floating-ui/dom` against the registered anchor —
 * the trigger button for `[forDropdownMenu]`, or a virtual pointer element
 * for `[forContextMenu]`.
 *
 * The directive does not manage DOM presence — wrap with
 * `@if (open())` so `animate.enter` / `animate.leave` fire on the natural
 * mount cycle. While mounted, a `DismissibleLayer` activates (Escape,
 * pointer-down outside, focus outside) and initial focus is sent to the
 * first or last menu item per the trigger's hint.
 *
 * The trigger element is exempt from the layer's outside-pointer checks,
 * so clicking the trigger again routes through its own toggle handler
 * without spuriously closing.
 *
 * The lifecycle (positioner + dismissible layer + initial focus + return
 * focus) is owned by the shared `injectOverlayShell` helper.
 *
 * Accessible name: a consumer-set **static** `aria-labelledby` on the surface
 * always wins and is preserved. Otherwise an explicit `ariaLabel` on the root
 * is reflected as `aria-label`, and with neither the surface falls back to
 * `aria-labelledby="<triggerId>"` — but only when the trigger that opened it is
 * a labelling control (`[forDropdownMenu]`, `[forMenubar]`, `[forMenuSub]`).
 * `[forContextMenu]` opts out of that fallback (its trigger is the whole
 * right-click region), so name a context menu with `[ariaLabel]`. `[forMenu]`
 * answers per **active opener**, so a shared menu names itself after the button
 * that opened it and emits nothing when a right-click region did.
 *
 * Both `id` and `aria-labelledby` are emitted truthy-only: a surface the
 * context has not associated with a trigger yet — only reachable under
 * `[forMenubar]`, where one surface may be mounted unconditionally while no
 * menu is open — carries neither attribute rather than an invalid `id=""` and
 * an `aria-labelledby` pointing at nothing.
 *
 * Navigation is vertical-only (Up / Down between items, per the APG Menu
 * pattern), so the surface reflects `aria-orientation="vertical"` explicitly.
 * Horizontal menus are out of scope; a horizontal *bar* of menus is modelled
 * by `[forMenubar]` instead.
 */
@Directive({
  // The same directive serves submenu content too — the behavior is identical
  // (the injected ctx is the [forMenuSub] in that case). The extra selector is
  // an alias for template readability.
  selector: '[forMenuContent], [forMenuSubContent]',
  exportAs: 'forMenuContent',
  host: {
    role: 'menu',
    '[attr.id]': 'ctx.contentId() || null',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-orientation]': '"vertical"',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    tabindex: '-1',
    '(pointerleave)': 'onPointerLeave($event)',
  },
})
export class ForMenuContent {
  protected readonly ctx = injectMenuContext('ForMenuContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ctx.ariaLabel() || null);

  protected readonly labelledBy = hostLabelledBy(() => {
    if (this.resolvedAriaLabel() || this.ctx.triggerLabelsMenu?.() === false) {
      return null;
    }
    return this.ctx.triggerId() || null;
  });

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerContent(el),
      (el) => this.ctx.unregisterContent(el),
    );

    injectOverlayShell({
      positioner: {
        kind: 'floating',
        reference: this.ctx.anchor,
        open: this.ctx.open,
        side: this.ctx.side,
        align: this.ctx.align,
        sideOffset: this.ctx.sideOffset,
        alignOffset: this.ctx.alignOffset,
        avoidCollisions: this.ctx.avoidCollisions,
        fallbackAxisSideDirection: this.ctx.fallbackAxisSideDirection,
        collisionPadding: this.ctx.collisionPadding,
        arrowPadding: this.ctx.arrowPadding,
        sticky: this.ctx.sticky,
        hideWhenDetached: this.ctx.hideWhenDetached,
        clipUntilPositioned: this.ctx.clipUntilPositioned,
      },
      dismiss: {
        dismissible: this.ctx.dismissible,
        requestClose: (reason) => this.ctx.requestClose(reason),
        emitEscapeKeyDown: (event) => this.ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => this.ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => this.ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => this.ctx.emitInteractOutside(veto),
        // DropdownMenu's trigger is exempt (its own click handler toggles —
        // without exemption pointer-down-outside would race and double-close).
        // ContextMenu exempts nothing so left-clicks on the region close the
        // menu like any other outside click.
        exemptElements: () => this.ctx.dismissibleExemptions(),
        nesting: menuLayerNesting(this.ctx),
      },
      // Primitive-owned move: focusInitialEnabledItem resolves the ctx's
      // `initialFocus` target and returns `true` on success. The shell falls
      // back to focusing the host element on miss, as the hand-rolled code did.
      initialFocus: {
        move: () => this.ctx.focusInitialEnabledItem(this.ctx.initialFocus()),
        veto: () => this.ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: this.ctx.returnFocus,
        target: () => this.ctx.trigger(),
        // `(autoFocusOnClose)` lets the consumer veto the return-focus.
        veto: () => this.ctx.emitAutoFocusOnClose(),
        // Skip when the close itself already moved focus away on purpose:
        // `'tab'` let the browser advance to the next element, and an outside
        // pointer-down / focus moved focus onto whatever the user just clicked
        // or focused. Re-focusing the trigger in any of these cases would rip
        // focus back from where it belongs.
        skip: () => {
          const reason = this.ctx.lastCloseReason();
          return reason === 'tab' || reason === 'pointerDownOutside' || reason === 'focusOutside';
        },
      },
    });
  }

  /**
   * Hover-follows-pointer: the pointer left the menu surface, so drop the
   * highlight from whichever item the pointer was over. Focus is left where it
   * is (anchored on the item for keyboard navigation); only `data-highlighted`
   * clears. Gated to mouse — touch / pen never hover.
   */
  protected onPointerLeave(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) {
      return;
    }
    this.ctx.clearItemHighlights();
  }
}
