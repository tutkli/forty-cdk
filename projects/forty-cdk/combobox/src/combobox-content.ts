import { computed, Directive, ElementRef, inject } from '@angular/core';

import {
  composedContains,
  registerHandle,
  hostAriaLabel,
  hostLabelledBy,
  injectFieldLabelExemption,
  pressFocusesDescendant,
  preventPointerFocus,
  resolveActiveElement,
  FOR_FIELD_ANCHOR_CONTEXT,
  FOR_FIELD_CONTEXT,
} from 'forty-cdk/core';
import { warnIfMountedWhileClosed } from 'forty-cdk/core-overlay';
import { injectOverlayShell, type OverlayShellConfig } from 'forty-cdk/core-anchored';
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
 *   (`aria-label` / `aria-labelledby`). The input's `aria-controls` points here.
 * - **Picker (list present)** — content drops the listbox semantics;
 *   `[forComboboxList]` takes over the listbox role and owns the options, the
 *   input lives inside the panel, and the input's `aria-controls` points to the
 *   list. With a `[forComboboxTrigger]` registered the content is the
 *   `role="dialog"` the trigger's `aria-haspopup="dialog"` announces, named by
 *   the trigger through `aria-labelledby` (a static `aria-label` or
 *   `aria-labelledby` on the host wins); without one it is a neutral surface.
 *   `data-state`, positioning and dismissal behave identically in both.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap with `@if (open())` so `animate.enter` / `animate.leave` fire on the
 * natural mount cycle. While mounted, the surface dismisses on pointer-down
 * outside / focus outside; the input, any `[forComboboxToggle]` or
 * `[forComboboxClear]` and (picker anatomy) the trigger are exempt from outside
 * checks.
 *
 * Focus:
 * - **Editable anatomy (no trigger)** — focus stays in the input across the
 *   whole open lifecycle and active-option highlighting is
 *   `aria-activedescendant`-driven, so the directive exposes no focus hooks. A
 *   mouse press anywhere on the surface that lands on no focusable element of its
 *   own (padding, a group label, an empty or status row) is cancelled, so it
 *   neither focuses the surface nor blurs the input; text in the popup cannot be
 *   selected with the mouse as a result. A press on an action still focuses it,
 *   and a press on a consumer control takes focus wherever the browser puts it.
 *   If focus reaches the surface programmatically, a fallback Escape channel
 *   still closes the popup and returns focus to the input. A close that
 *   unmounts the surface while focus is inside it (an `(activate)` handler that
 *   closes the popup, a pick made while an action holds focus) also returns
 *   focus to the input, gated by `[returnFocus]`; a close after focus already
 *   left the surface moves nothing.
 * - **Picker anatomy (trigger present)** — on open, focus moves into the input
 *   (the search field inside the panel); on close it returns to the trigger.
 *   Both moves are vetoable via `(autoFocusOnOpen)` / `(autoFocusOnClose)` on
 *   `[forCombobox]`, and the return is gated by `[returnFocus]`. The same press
 *   rule applies to the surface and to `[forComboboxList]`, so focus stays on
 *   the search input. Escape from the input is owned by the input directive; the
 *   shell's fallback channel covers focus that reaches the surface or list
 *   programmatically.
 *
 * The two splits are keyed independently — roles off the presence of a list,
 * focus off the presence of a trigger — and the trigger is re-checked at each
 * decision point, so one declared after this content, projected through
 * `<ng-content>`, or gated by a `@defer` still upgrades the surface. Initial
 * focus stays a mount-time decision: a trigger that arrives while the surface is
 * already open does not pull focus out of wherever the user left it, but it does
 * take over the return focus, `(autoFocusOnClose)` and the Escape fallback from
 * there on.
 *
 * A field boundary: a control inside it never registers with an ancestor
 * `[forField]`, and a `[forField]` inside it still wires its own control.
 */
@Directive({
  selector: '[forComboboxContent]',
  exportAs: 'forComboboxContent',
  host: {
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'hasList() ? null : "-1"',
    '[id]': 'ctx.contentId()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-multiselectable]': 'hasList() ? null : (ctx.multiple() ? "true" : null)',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [
    { provide: FOR_FIELD_CONTEXT, useValue: null },
    { provide: FOR_FIELD_ANCHOR_CONTEXT, useValue: null },
  ],
})
export class ForComboboxContent {
  private readonly ctx = injectComboboxContext('ForComboboxContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  #focusWithin = false;

  /** When a `[forComboboxList]` is registered the listbox semantics live there, not here. */
  private readonly hasList = this.ctx.hasList;

  readonly #isDialog = computed(() => this.hasList() && this.ctx.triggerId() !== null);

  private readonly role = computed(() =>
    this.#isDialog() ? 'dialog' : this.hasList() ? null : 'listbox',
  );

  private readonly resolvedAriaLabel = hostAriaLabel(() =>
    this.hasList() ? null : this.ctx.ariaLabel(),
  );

  private readonly labelledBy = hostLabelledBy(() => {
    if (this.resolvedAriaLabel()) {
      return null;
    }
    if (this.#isDialog()) {
      return this.ctx.triggerId();
    }
    return this.hasList() ? null : this.ctx.inputId();
  });

  constructor() {
    const ctx = this.ctx;
    const host = this.#host.nativeElement;
    registerHandle(
      host,
      (el) => ctx.registerContent(el),
      (el) => ctx.unregisterContent(el),
    );
    preventPointerFocus((event) => !pressFocusesDescendant(event, host));

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
    // construction-time snapshot, and the editable anatomy still fires neither
    // hook.
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
        // click handler, and a toggle or clear button acts on its own press.
        // Without exemption a pointer-down on any of them would race the
        // dismissal layer.
        exemptElements: injectFieldLabelExemption(() => {
          const els: Element[] = [];
          const input = ctx.input();
          if (input) els.push(input);
          const trigger = ctx.trigger();
          if (trigger) els.push(trigger);
          for (const chip of ctx.chips()) els.push(chip.host);
          els.push(...ctx.fieldButtons());
          return els;
        }),
      },
      // Picker anatomy: move focus into the input on open, return it to the
      // trigger on close. The editable anatomy moves focus only back to the
      // input, when a close unmounts the surface while it holds focus, and emits
      // neither hook.
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
        target: () => ctx.trigger() ?? ctx.input(),
        veto: () => hasTrigger() && ctx.emitAutoFocusOnClose(),
        // On Tab focus already landed where the user tabbed; re-focusing the
        // trigger would steal it back.
        skip: () => {
          if (!hasTrigger()) {
            return !this.#focusLeftWithSurface();
          }
          return ctx.lastCloseReason() === 'tab';
        },
      },
    };

    injectOverlayShell(config);
  }

  private onFocusIn(): void {
    this.#focusWithin = true;
  }

  private onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && !composedContains(this.#host.nativeElement, next)) {
      this.#focusWithin = false;
    }
  }

  #focusLeftWithSurface(): boolean {
    if (!this.#focusWithin) {
      return false;
    }
    const host = this.#host.nativeElement;
    const doc = host.ownerDocument;
    const active = resolveActiveElement(doc);
    return active === null || active === doc.body || composedContains(host, active);
  }
}
