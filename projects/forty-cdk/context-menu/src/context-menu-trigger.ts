import {
  booleanAttribute,
  computed,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { type ForContextMenuContext, injectContextMenuContext } from './context-menu-context';

/**
 * Region that opens its parent `[forContextMenu]` on the `contextmenu` event
 * (right-click / long-press on touch) and on the keyboard equivalents
 * `Shift+F10` and the dedicated `ContextMenu` key. Pointer activations are
 * anchored at the cursor; keyboard activations are anchored at the bounding
 * rect of the focused element, so screen-reader / keyboard-only users get
 * the menu next to whatever they're working on. The native context menu is
 * suppressed via `event.preventDefault()`.
 *
 * Modality is detected by whether a `pointerdown` preceded the `contextmenu`
 * event: a genuine right-click / long-press always has one, while the
 * `contextmenu` some browsers synthesize for `Shift+F10` / the `ContextMenu`
 * key does not. A pointer activation anchors at the cursor and skips
 * `data-highlighted` on the initially focused item; a keyboard activation
 * anchors at the focused element's rect and highlights it. The synthesized
 * `contextmenu` that trails an already-handled keydown is swallowed so it
 * cannot demote the rect anchor to a 0x0 point at the keyboard coordinates.
 *
 * Apply on any element. A default `tabindex="-1"` is host-bound so the
 * trigger can receive programmatic focus and return-focus works out of the
 * box on close — no consumer setup required. The default is overridable:
 * set your own `tabindex` (e.g. `tabindex="0"` to put the trigger in the
 * Tab order) and it wins. The keyboard activators (`Shift+F10`, the
 * `ContextMenu` key) need the trigger — or something inside it — focusable,
 * which the default guarantees.
 *
 * The root is normally resolved via DI from the enclosing `[forContextMenu]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forContextMenuTrigger]="root"` with
 * `#root="forContextMenu"`.
 *
 * Disabling merges the trigger's own `disabled` input OR the root's
 * `disabled`. When disabled, only `data-disabled` is reflected as a styling /
 * state hook. The trigger is a generic region with no interactive ARIA role,
 * so it emits neither the native `disabled` attribute (which applies only to
 * form controls) nor `aria-disabled` (which is meaningful only on an
 * interactive role); the disabled behaviour is enforced by the in-handler
 * guards, which let the native browser menu show through instead.
 */
@Directive({
  selector: '[forContextMenuTrigger]',
  exportAs: 'forContextMenuTrigger',
  host: {
    tabindex: '-1',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(pointerdown)': 'onPointerDown()',
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForContextMenuTrigger {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  #pointerActivation = false;

  /**
   * Optional explicit reference to the `[forContextMenu]` root, named after
   * the selector `routerLink`-style. The bare valueless attribute keeps
   * resolving the enclosing root via DI; pass the root explicitly
   * (`[forContextMenuTrigger]="root"`, with `#root="forContextMenu"`) when
   * the trigger is declared in an `ng-template` stamped inside the root —
   * DI resolves at the template's declaration site, so the enclosing root
   * is invisible there. The empty string (what the valueless attribute
   * yields) is treated as unset.
   */
  readonly forContextMenuTrigger = input<ForContextMenuContext | ''>('');

  protected readonly ctx = injectContextMenuContext(this.forContextMenuTrigger);

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx().disabled());

  constructor() {
    const el = this.#host.nativeElement;
    // Registration is an imperative call into the resolved root's registry,
    // not state derivation — the effect only re-registers the element when
    // the resolved root changes (explicit reference swapped at runtime).
    effect((onCleanup) => {
      const ctx = this.ctx();
      ctx.registerTrigger(el);
      onCleanup(() => ctx.unregisterTrigger(el));
    });
  }

  protected onPointerDown(): void {
    this.#pointerActivation = true;
  }

  protected onContextMenu(event: MouseEvent): void {
    const pointerActivation = this.#pointerActivation;
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      // Let the native browser menu show.
      return;
    }
    event.preventDefault();
    if (pointerActivation) {
      this.ctx().setVirtualAnchor(event.clientX, event.clientY);
      this.ctx().openMenu('first', 'pointer');
      return;
    }
    if (this.ctx().open()) {
      return;
    }
    this.#openFromFocusedRect();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    const isShiftF10 = event.key === 'F10' && event.shiftKey;
    const isContextMenuKey = event.key === 'ContextMenu';
    if (!isShiftF10 && !isContextMenuKey) {
      return;
    }
    // Stop the browser from opening its own context menu on top of ours.
    event.preventDefault();
    this.#openFromFocusedRect();
  }

  #openFromFocusedRect(): void {
    const trigger = this.#host.nativeElement;
    const focused = this.#document.activeElement as HTMLElement | null;
    // Anchor at the focused element when it lives inside the trigger; fall
    // back to the trigger itself otherwise (e.g. focus is on the trigger).
    const anchorEl = focused && trigger.contains(focused) ? focused : trigger;
    this.ctx().setVirtualAnchorFromRect(anchorEl.getBoundingClientRect());
    this.ctx().openMenu('first');
  }
}
