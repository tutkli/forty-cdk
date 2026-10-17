import { computed, Directive, ElementRef, inject, type Signal } from '@angular/core';

import {
  hostButtonType,
  registerHandle,
  hostId,
  isHoverCapablePointer,
  isImeComposing,
  navigateFromRovingItem,
  type Unset,
} from 'forty-cdk/core';
import {
  injectNavigationMenuContext,
  injectNavigationMenuItemContext,
} from './navigation-menu-context';

/**
 * Disclosure trigger. Apply on `<button>`. Mouse hover / click open the paired
 * `[forNavigationMenuContent]`; arrow keys move focus across siblings;
 * ArrowDown (horizontal) / the inline-end arrow (vertical: ArrowRight, or
 * ArrowLeft under `dir="rtl"`) open; Escape closes; Enter / Space toggle.
 *
 * Per the APG disclosure-navigation pattern this does NOT open on plain
 * focus: Tabbing across the trigger row must not auto-expand panels, and a
 * programmatic return-focus (e.g. after Escape) must not synchronously
 * re-open the panel that just closed.
 *
 * Hover is a mouse affordance: the `pointerenter` / `pointerleave` path is
 * gated to hover-capable pointers, so a touch or pen tap drives the panel
 * through the native `click` instead of opening it mid-press.
 *
 * `aria-controls` is emitted only while the item is open, and only once the
 * paired `[forNavigationMenuContent]` has registered — an id that cannot be
 * resolved emits no attribute rather than an empty one, so the reference never
 * dangles (mirroring `[forAccordionTrigger]` and the carousel arrows).
 *
 * Disabling: {@link effectiveDisabled} merges the owning
 * `[forNavigationMenuItem]`'s `[disabled]` with the root
 * `[forNavigationMenu]`'s. It is reflected through a single channel,
 * `aria-disabled="true"` + `data-disabled`, and enforced by the click / hover /
 * activation-key guards; arrow navigation skips the trigger, and the arrow,
 * Home and End keys still move focus off it while it is focused. The native `disabled`
 * attribute is NOT emitted: every trigger is its
 * own tab stop in this pattern, so a disabled trigger stays focusable and
 * announceable instead of vanishing from the trigger row — which a menu-level
 * `disabled` would otherwise do to the entire nav.
 */
@Directive({
  selector: '[forNavigationMenuTrigger]',
  exportAs: 'forNavigationMenuTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    '[id]': 'id()',
    '[attr.aria-expanded]': 'isOpen() ? "true" : "false"',
    '[attr.aria-controls]': 'isOpen() ? contentId() : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForNavigationMenuTrigger {
  private readonly buttonType = hostButtonType();

  private readonly menu = injectNavigationMenuContext('ForNavigationMenuTrigger');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly id = hostId('for-navigation-menu-trigger');
  private readonly value: Signal<string | Unset> = this.#item.value;

  /**
   * Effective disabled state: the owning `[forNavigationMenuItem]`'s
   * `[disabled]` OR the root `[forNavigationMenu]`'s `disabled`. Everything
   * that gates on the trigger's disabled state reads this — the
   * `aria-disabled` / `data-disabled` reflection, the click / hover / keyboard
   * guards, and the arrow-navigation skip.
   */
  readonly effectiveDisabled: Signal<boolean> = computed(
    () => this.#item.disabled() || this.menu.disabled(),
  );

  private readonly isOpen = computed(() => this.menu.isOpen(this.value()));
  private readonly contentId = computed(() => this.menu.contentIdFor(this.value()));

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
      id: this.id,
    };
    // Registered synchronously so the parent's `triggerIdFor` / `contentIdFor` /
    // `triggerHostFor` lookups resolve during the same pass that renders the
    // pairing. A deferred registration is invisible to a server render, where
    // `afterNextRender` never fires — which is what shipped `aria-controls=""`
    // on the trigger and no `aria-labelledby` on the panel
    // ([#1409](https://github.com/tutkli/forty-cdk/issues/1409) is the same
    // failure class in Tabs). The lookups can read `handle.value()` safely
    // because the owning `[forNavigationMenuItem]`'s `value` is seeded with the
    // `unsetInput` sentinel instead of being declared `input.required`, so a
    // lookup running before that binding is written skips the handle rather
    // than throwing.
    registerHandle(
      handle,
      (h) => this.menu.registerTrigger(h),
      (h) => this.menu.unregisterTrigger(h),
    );
  }

  private onClick(): void {
    if (this.effectiveDisabled()) return;
    this.menu.toggle(this.value());
  }

  private onPointerEnter(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) return;
    if (this.effectiveDisabled()) return;
    this.menu.scheduleOpen(this.value(), 'hover');
  }

  private onPointerLeave(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) return;
    if (this.effectiveDisabled()) return;
    this.menu.scheduleClose('hover', this.value());
  }

  private onKeyDown(event: KeyboardEvent): void {
    const orientation = this.menu.orientation();
    const dir = this.menu.dir();
    if (
      navigateFromRovingItem(event, {
        orientation,
        dir,
        groupDisabled: this.menu.disabled(),
        navigate: (action) => this.menu.navigate(this.#host.nativeElement, action),
      })
    ) {
      return;
    }
    if (this.effectiveDisabled()) return;
    // Activation: Enter / Space toggle the disclosure.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.menu.toggle(this.value());
      return;
    }
    if (event.key === 'Escape' && !isImeComposing(event) && this.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.menu.close();
      this.#host.nativeElement.focus();
      return;
    }
    // ArrowDown (horizontal) / the inline-end arrow (vertical) opens the disclosure.
    const openKey =
      orientation === 'horizontal' ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    if (event.key === openKey) {
      event.preventDefault();
      this.menu.scheduleOpen(this.value(), 'keyboard');
    }
  }
}
