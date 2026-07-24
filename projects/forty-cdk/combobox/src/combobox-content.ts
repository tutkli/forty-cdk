import { Directive, effect, ElementRef, inject, isDevMode } from '@angular/core';

import { registerHandle, injectOverlayShell, type OverlayShellConfig } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * The floating surface, portaled to `document.body` and positioned by
 * `@floating-ui/dom` against the anchor (explicit `[forComboboxAnchor]` →
 * `[forComboboxTrigger]` → input).
 *
 * Two anatomies, picked by whether an inner `[forComboboxList]` is present:
 *
 * - **Editable (no list)** — content itself carries `role="listbox"`,
 *   `tabindex="-1"`, `aria-multiselectable`, and the labelled role
 *   (`aria-label` / `aria-labelledby`). The input's `aria-controls` points
 *   here. This is the original combobox; nothing about it changes.
 * - **Picker (list present)** — content drops the listbox semantics and becomes
 *   a neutral popup surface; `[forComboboxList]` takes over the listbox role and
 *   owns the options, the input lives inside the panel, and the input's
 *   `aria-controls` points to the list. Keeps `data-state` and the positioner +
 *   dismissable layer unchanged.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, a `DismissableLayer` activates for
 * pointer-down outside / focus outside; the input and (picker anatomy) the
 * trigger are exempt from outside checks.
 *
 * Focus:
 * - **Editable anatomy** — focus normally stays in the input across the whole
 *   open lifecycle and active-option highlighting is `aria-activedescendant`-
 *   driven, so the directive exposes no focus hooks. The surface itself is
 *   focusable (`tabindex="-1"`), so a click on non-option padding can move focus
 *   onto it; the input's inline Escape handler then never sees the key, so the
 *   shell wires a fallback Escape channel that closes the popup and returns focus
 *   to the input.
 * - **Picker anatomy** — on open, focus moves into the input (the search field
 *   inside the panel); on close it returns to the trigger. Both moves are
 *   vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)` on `[forCombobox]`,
 *   and the return is gated by `[returnFocus]`. Escape from the input is owned by
 *   the input directive; the shell's fallback channel covers presses that land on
 *   the surface or list instead.
 *
 * The lifecycle (positioner + dismissable layer, plus the picker anatomy's
 * focus bundles) is owned by the shared `injectOverlayShell` helper.
 */
@Directive({
  selector: '[forComboboxContent]',
  exportAs: 'forComboboxContent',
  host: {
    '[attr.role]': 'hasList() ? null : "listbox"',
    '[attr.tabindex]': 'hasList() ? null : "-1"',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'hasList() ? null : (ctx.ariaLabel() ? null : ctx.inputId())',
    '[attr.aria-label]': 'hasList() ? null : ctx.ariaLabel()',
    '[attr.aria-multiselectable]': 'hasList() ? null : (ctx.multiple() ? "true" : null)',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
  },
})
export class ForComboboxContent {
  protected readonly ctx = injectComboboxContext('ForComboboxContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** When a `[forComboboxList]` is registered the listbox semantics live there, not here. */
  protected readonly hasList = this.ctx.hasList;

  constructor() {
    const ctx = this.ctx;
    registerHandle(
      this.#host.nativeElement,
      (el) => ctx.registerContent(el),
      (el) => ctx.unregisterContent(el),
    );

    // The picker anatomy opts back into the shell's focus bundles. `trigger()`
    // is read once on construction: the trigger renders outside the `@if (open())`
    // that gates this content, so it has already registered by the time the
    // surface mounts. Without a trigger (editable anatomy) the bundles are
    // omitted entirely and focus stays in the input — byte-for-byte unchanged.
    // That assumption is dev-verified: a trigger that registers late (after this
    // content was constructed) trips a dev-mode `console.warn`.
    const hasTrigger = ctx.trigger() !== null;

    if (isDevMode() && !hasTrigger) {
      let warned = false;
      effect(() => {
        if (!warned && ctx.trigger() !== null) {
          warned = true;
          console.warn(
            '[forty-cdk/combobox] [forComboboxTrigger] registered after [forComboboxContent] was constructed, ' +
              'so the picker focus behavior was not wired for this content: focus will not move into ' +
              '[forComboboxInput] on open, will not return to the trigger on close, and (autoFocusOnOpen) / ' +
              '(autoFocusOnClose) will not fire. Declare [forComboboxTrigger] before (and outside) the ' +
              '@if (open()) block that gates [forComboboxContent] so it registers first.',
          );
        }
      });
    }

    const config: OverlayShellConfig = {
      positioner: {
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
        onFirstPosition: () => ctx.scrollActiveOptionIntoView(),
      },
      dismiss: {
        dismissible: ctx.dismissible,
        requestClose: (reason) => ctx.requestClose(reason),
        emitEscapeKeyDown: (event) => {
          ctx.emitEscapeKeyDown(event);
          if (!hasTrigger && !ctx.open()) {
            ctx.input()?.focus();
          }
        },
        emitPointerDownOutside: (veto) => ctx.emitPointerDownOutside(veto),
        emitFocusOutside: (veto) => ctx.emitFocusOutside(veto),
        emitInteractOutside: (veto) => ctx.emitInteractOutside(veto),
        // The input owns the visible focus and toggles via its own click /
        // focus handlers; the trigger (picker anatomy) toggles via its own
        // click handler. Without exemption a pointer-down on either would race
        // the dismissal layer.
        exemptElements: () => {
          const els: Element[] = [];
          const input = ctx.input();
          if (input) els.push(input);
          const trigger = ctx.trigger();
          if (trigger) els.push(trigger);
          for (const chip of ctx.chips()) els.push(chip.host);
          return els;
        },
      },
      // Picker anatomy only: move focus into the input on open, return it to the
      // trigger on close. Editable anatomy keeps focus in the input throughout,
      // so both bundles stay absent (no imperative move, no hooks).
      ...(hasTrigger
        ? {
            initialFocus: {
              move: () => {
                const input = ctx.input();
                if (input) {
                  input.focus();
                  return true;
                }
                return false;
              },
              veto: () => ctx.emitAutoFocusOnOpen(),
            },
            returnFocus: {
              enabled: ctx.returnFocus,
              target: () => ctx.trigger(),
              veto: () => ctx.emitAutoFocusOnClose(),
              // On Tab and on outside dismissal (pointer-down-outside /
              // focus-outside) focus already landed where the user tabbed or
              // clicked; re-focusing the trigger would steal it back (native
              // <select> parity, mirroring popover #1310).
              skip: () => {
                const reason = ctx.lastCloseReason();
                return (
                  reason === 'tab' || reason === 'pointerDownOutside' || reason === 'focusOutside'
                );
              },
            },
          }
        : {}),
    };

    injectOverlayShell(config);
  }
}
