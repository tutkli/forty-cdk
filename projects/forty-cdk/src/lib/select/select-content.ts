import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectModalShell } from '../_internal/modal-shell/modal-shell';
import { injectOverlayShell } from '../_internal/overlay-shell/overlay-shell';
import type { OverlayShellPositionerConfig } from '../_internal/overlay-shell/overlay-shell';
import { injectSelectContext } from './select-context';

/**
 * The listbox surface. Carries `role="listbox"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` against the
 * trigger.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, a `DismissableLayer` activates
 * (Escape, pointer-down outside, focus outside); the trigger element is
 * exempt from outside-pointer checks so trigger clicks toggle without
 * dismissal racing.
 *
 * Initial focus is sent to the selected option (`'selected'`), the first
 * enabled option (`'first'`), or the last enabled option (`'last'`)
 * according to the trigger's hint. On destroy, focus returns to the
 * trigger when `returnFocus` is true.
 *
 * The lifecycle is owned by one of the two shared shells, picked once on
 * construction from `[forSelect].modal`:
 *
 * - **non-modal (default)** — `injectOverlayShell` anchors the listbox to the
 *   trigger and branches on `[forSelect].position`:
 *   - `'popper'` (default) — standard `injectFloating` path with full
 *     Radix-style anchored placement (`side`, `align`, `sideOffset`,
 *     `alignOffset`, `flip`, `shift`, `arrow`, `hideWhenDetached`).
 *   - `'item-aligned'` — `injectItemAlignedPositioner` overlays the listbox so
 *     the selected option's center aligns with the trigger's center. The
 *     anchored-placement inputs are documented as no-ops in this mode.
 * - **modal** — `injectModalShell` traps focus, inerts the background, and
 *   locks body scroll (a centered surface the consumer positions with CSS, not
 *   trigger-anchored). The batteries-included touch presentation. Same Escape /
 *   outside-pointer dismiss, `dismissible` / `returnFocus` / `ariaLabel`, and
 *   `autoFocusOnOpen` / `autoFocusOnClose` veto hooks; every anchored-
 *   positioning input is a no-op. `aria-modal="true"` is reflected as a hint —
 *   the real modality comes from the `inert` siblings the shell applies (the
 *   surface keeps `role="listbox"`, for which several screen readers ignore
 *   `aria-modal`).
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle.
 */
@Directive({
  selector: '[forSelectContent]',
  exportAs: 'forSelectContent',
  host: {
    role: 'listbox',
    tabindex: '-1',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'ctx.ariaLabel() ? null : ctx.triggerId()',
    '[attr.aria-label]': 'ctx.ariaLabel()',
    '[attr.aria-modal]': 'ctx.modal() ? "true" : null',
    '[attr.aria-multiselectable]': 'ctx.multiple() ? "true" : null',
    '[attr.aria-orientation]': 'ctx.orientation()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForSelectContent {
  protected readonly ctx = injectSelectContext('ForSelectContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const ctx = this.ctx;
    registerHandle(
      this.#host.nativeElement,
      (el) => ctx.registerContent(el),
      (el) => ctx.unregisterContent(el),
    );

    // Primitive-owned initial-focus algorithm shared by both shells.
    // `'selected'` falls back to the first enabled option when nothing is
    // selected; returns `false` so the shell focuses the container on a miss.
    const focusInitial = (): boolean => {
      const target = ctx.initialFocus();
      if (target === 'selected') {
        return ctx.focusSelectedOption() || ctx.focusFirstEnabledOption();
      }
      if (target === 'last') {
        return ctx.focusLastEnabledOption();
      }
      return ctx.focusFirstEnabledOption();
    };

    // Static branch — `modal` (and `position`) is read once on construction.
    // Switching modes at runtime would require re-creating the directive
    // (mount / unmount cycle), which is the expected pattern for primitives
    // whose surface is structurally different. The surface mounts lazily via
    // `@if (open())`, well after `modal` settles.
    if (ctx.modal()) {
      injectModalShell({
        modal: ctx.modal,
        returnFocus: ctx.returnFocus,
        // The trap owns Tab; the shell runs `focusInitial()` (selected →
        // first → last) instead of its own first-focusable move.
        initialFocus: {
          move: focusInitial,
          veto: () => ctx.emitAutoFocusOnOpen(),
        },
        autoFocusOnClose: () => (event) => {
          if (ctx.emitAutoFocusOnClose()) {
            event.preventDefault();
          }
        },
        dismiss: {
          dismissible: ctx.dismissible,
          // The shell builds the veto and calls this when not vetoed; mirror
          // the anchored path's touched-on-dismiss behaviour.
          requestClose: (reason) => {
            ctx.markTouched();
            ctx.closeMenu(reason);
          },
          emitEscapeKeyDown: (veto) => ctx.forwardEscapeKeyDown(veto),
          emitPointerDownOutside: (veto) => ctx.emitPointerDownOutside(veto),
          emitFocusOutside: (veto) => ctx.emitFocusOutside(veto),
          emitInteractOutside: (veto) => ctx.emitInteractOutside(veto),
        },
      });
      return;
    }

    const positioner: OverlayShellPositionerConfig =
      ctx.position() === 'item-aligned'
        ? {
            kind: 'item-aligned',
            reference: ctx.anchor,
            open: ctx.open,
            selectedOption: ctx.selectedOptionEl,
            collisionPadding: ctx.collisionPadding,
          }
        : {
            kind: 'floating',
            reference: ctx.anchor,
            open: ctx.open,
            side: ctx.side,
            align: ctx.align,
            sideOffset: ctx.sideOffset,
            alignOffset: ctx.alignOffset,
            avoidCollisions: ctx.avoidCollisions,
            collisionPadding: ctx.collisionPadding,
            arrowPadding: ctx.arrowPadding,
            sticky: ctx.sticky,
            hideWhenDetached: ctx.hideWhenDetached,
            clipUntilPositioned: ctx.clipUntilPositioned,
          };

    injectOverlayShell({
      positioner,
      dismiss: {
        dismissible: ctx.dismissible,
        // Mirror the modal path's touched-on-dismiss behaviour.
        requestClose: (reason) => {
          ctx.markTouched();
          ctx.closeMenu(reason);
        },
        emitEscapeKeyDown: (event) => ctx.emitEscapeKeyDown(event),
        emitPointerDownOutside: (veto) => ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => ctx.emitInteractOutside(veto),
        // Trigger button is exempt — its own click handler toggles open/close;
        // without exemption pointer-down-outside would race and double-close.
        exemptElements: () => {
          const t = ctx.trigger();
          return t ? [t] : [];
        },
      },
      initialFocus: {
        move: focusInitial,
        veto: () => ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: ctx.returnFocus,
        target: () => ctx.trigger(),
        // `(autoFocusOnClose)` lets the consumer veto the return-focus.
        veto: () => ctx.emitAutoFocusOnClose(),
        // Skip on `'tab'` closes — Tab already moved focus to the trigger
        // and let the browser advance from there; re-focusing would steal
        // it back.
        skip: () => ctx.lastCloseReason() === 'tab',
      },
    });
  }
}
