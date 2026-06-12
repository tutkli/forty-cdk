import { computed, Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import {
  injectOverlayShell,
  type OverlayShellConfig,
} from '../_internal/overlay-shell/overlay-shell';
import { injectComboboxContext } from './combobox-context';

/**
 * The floating surface, portaled to `document.body` and positioned by
 * `@floating-ui/dom` against the anchor (explicit `[forComboboxAnchor]` →
 * `[forComboboxTrigger]` → input).
 *
 * Two anatomies, picked by whether an inner `[forComboboxList]` is present:
 *
 * - **Editable (no list)** — content itself carries `role="listbox"`,
 *   `tabindex="-1"`, `aria-multiselectable`, `aria-setsize`, and the labelled
 *   role (`aria-label` / `aria-labelledby`). The input's `aria-controls` points
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
 * - **Editable anatomy** — focus stays in the input across the whole open
 *   lifecycle; the directive never moves DOM focus and exposes no focus hooks.
 *   Active-option highlighting is `aria-activedescendant`-driven.
 * - **Picker anatomy** — on open, focus moves into the input (the search field
 *   inside the panel); on close it returns to the trigger. Both moves are
 *   vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)` on `[forCombobox]`,
 *   and the return is gated by `[returnFocus]`. Escape stays owned by the input.
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
    '[attr.aria-setsize]': 'hasList() ? null : ariaSetSize()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
  },
})
export class ForComboboxContent {
  protected readonly ctx = injectComboboxContext('ForComboboxContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** When a `[forComboboxList]` is registered the listbox semantics live there, not here. */
  protected readonly hasList = this.ctx.hasList;

  /**
   * Reflects `aria-setsize` when the consumer wires up `[totalCount]` for
   * virtualization (editable anatomy only — the picker anatomy's list owns it).
   * Falls back to `null` (omitted) otherwise — leaving the default
   * option-count semantics screen readers already infer.
   */
  protected readonly ariaSetSize = computed<string | null>(() => {
    const total = this.ctx.totalCount();
    return total === undefined ? null : String(total);
  });

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
    const hasTrigger = ctx.trigger() !== null;

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
      },
      dismiss: {
        dismissible: ctx.dismissible,
        requestClose: (reason) => ctx.requestClose(reason),
        // Escape is handled by the input directive (focus stays in the
        // input, so Escape there shouldn't bubble through nested layers
        // before the input sees it). Omitted here intentionally.
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
              // Tab already advanced focus past the closing surface; re-focusing
              // the trigger would steal it back.
              skip: () => ctx.lastCloseReason() === 'tab',
            },
          }
        : {}),
    };

    injectOverlayShell(config);
  }
}
