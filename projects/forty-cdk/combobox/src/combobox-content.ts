import { computed, Directive, ElementRef, inject } from '@angular/core';

import {
  registerHandle,
  hostAriaLabel,
  hostLabelledBy,
  injectOverlayShell,
  type OverlayShellConfig,
  warnIfMountedWhileClosed,
} from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * The floating surface, portaled to `document.body` and positioned by
 * `@floating-ui/dom` against the anchor (explicit `[forComboboxAnchor]` →
 * `[forComboboxTrigger]` → input).
 *
 * Two anatomies. The **role split** is picked by whether an inner
 * `[forComboboxList]` is present:
 *
 * - **Editable (no list)** — content itself carries `role="listbox"`,
 *   `tabindex="-1"`, `aria-multiselectable`, and the labelled role
 *   (`aria-label` / `aria-labelledby`). The input's `aria-controls` points
 *   here. This is the original combobox; nothing about it changes.
 * - **Picker (list present)** — content drops the listbox semantics and becomes
 *   a neutral popup surface; `[forComboboxList]` takes over the listbox role and
 *   owns the options, the input lives inside the panel, and the input's
 *   `aria-controls` points to the list. Keeps `data-state` and the positioner +
 *   dismissible layer unchanged.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, a `DismissibleLayer` activates for
 * pointer-down outside / focus outside; the input and (picker anatomy) the
 * trigger are exempt from outside checks.
 *
 * Focus:
 * - **Editable anatomy (no trigger)** — focus normally stays in the input
 *   across the whole open lifecycle and active-option highlighting is
 *   `aria-activedescendant`-driven, so the directive exposes no focus hooks. The
 *   surface itself is focusable (`tabindex="-1"`), so a click on non-option
 *   padding can move focus onto it; the input's inline Escape handler then never
 *   sees the key, so the shell wires a fallback Escape channel that closes the
 *   popup and returns focus to the input.
 * - **Picker anatomy (trigger present)** — on open, focus moves into the input
 *   (the search field inside the panel); on close it returns to the trigger.
 *   Both moves are vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)` on
 *   `[forCombobox]`, and the return is gated by `[returnFocus]`. Escape from the
 *   input is owned by the input directive; the shell's fallback channel covers
 *   presses that land on the surface or list instead.
 *
 * So the two splits are keyed independently — roles off `hasList`, focus off
 * the trigger — and the trigger check is a `computed`, consulted at each
 * decision point rather than snapshotted at construction
 * ([#1581](https://github.com/tutkli/forty-cdk/issues/1581)) — so a trigger
 * declared after this content, projected through `<ng-content>`, or gated by a
 * `@defer` / data-driven `@if` upgrades the surface instead of leaving it with
 * no focus management at all. Initial focus stays a mount-time event (the shell
 * decides it in `afterNextRender`, by which point a trigger constructed in the
 * same pass has registered), so a trigger arriving in a later pass while the
 * surface is already open does not retroactively pull focus out of wherever the
 * user left it — it takes over the return focus, `(autoFocusOnClose)` and the
 * Escape fallback from there on.
 *
 * The lifecycle (positioner + dismissible layer, plus the picker anatomy's
 * focus bundles) is owned by the shared `injectOverlayShell` helper.
 */
@Directive({
  selector: '[forComboboxContent]',
  exportAs: 'forComboboxContent',
  host: {
    '[attr.role]': 'hasList() ? null : "listbox"',
    '[attr.tabindex]': 'hasList() ? null : "-1"',
    '[id]': 'ctx.contentId()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-multiselectable]': 'hasList() ? null : (ctx.multiple() ? "true" : null)',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
  },
})
export class ForComboboxContent {
  protected readonly ctx = injectComboboxContext('ForComboboxContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** When a `[forComboboxList]` is registered the listbox semantics live there, not here. */
  protected readonly hasList = this.ctx.hasList;

  protected readonly resolvedAriaLabel = hostAriaLabel(() =>
    this.hasList() ? null : this.ctx.ariaLabel(),
  );

  protected readonly labelledBy = hostLabelledBy(() =>
    this.hasList() || this.resolvedAriaLabel() ? null : this.ctx.inputId(),
  );

  constructor() {
    const ctx = this.ctx;
    registerHandle(
      this.#host.nativeElement,
      (el) => ctx.registerContent(el),
      (el) => ctx.unregisterContent(el),
    );

    warnIfMountedWhileClosed({
      primitive: 'combobox',
      piece: '[forComboboxContent]',
      condition: 'combobox.open()',
      open: ctx.open,
    });

    // Both focus bundles are always handed to the shell; the anatomy gates them
    // from inside their own callbacks, which the shell runs after construction
    // (`initialFocus` in `afterNextRender`, `returnFocus` on destroy). So the
    // gate reads a fresh `trigger()` at each decision point instead of a
    // construction-time snapshot, and the editable anatomy still performs no
    // imperative move and fires neither hook.
    const hasTrigger = computed(() => ctx.trigger() !== null);

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
          if (!hasTrigger() && !ctx.open()) {
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
      // trigger on close. The editable anatomy keeps focus in the input
      // throughout, so its gate vetoes / skips before either hook is emitted.
      initialFocus: {
        move: () => {
          const input = ctx.input();
          if (input) {
            input.focus();
            return true;
          }
          return false;
        },
        veto: () => !hasTrigger() || ctx.emitAutoFocusOnOpen(),
      },
      returnFocus: {
        enabled: ctx.returnFocus,
        target: () => ctx.trigger(),
        veto: () => ctx.emitAutoFocusOnClose(),
        // The anatomy gate comes first: the editable anatomy never reaches
        // `veto`, so it never emits. Then, on Tab and on outside dismissal
        // (pointer-down-outside / focus-outside) focus already landed where the
        // user tabbed or clicked; re-focusing the trigger would steal it back
        // (native <select> parity, mirroring popover #1310).
        skip: () => {
          if (!hasTrigger()) {
            return true;
          }
          const reason = ctx.lastCloseReason();
          return reason === 'tab' || reason === 'pointerDownOutside' || reason === 'focusOutside';
        },
      },
    };

    injectOverlayShell(config);
  }
}
