import {
  afterNextRender,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  type Signal,
  signal,
} from '@angular/core';

import {
  registerHandle,
  hostId,
  hostLabelledBy,
  isHoverCapablePointer,
  warnIfMountedWhileClosed,
} from 'forty-cdk/core';
import {
  injectNavigationMenuContext,
  injectNavigationMenuItemContext,
} from './navigation-menu-context';

/**
 * The disclosure panel for a navigation-menu item. Mounted via `@if`
 * (consumer drives it from `forNavigationMenu.value()` or
 * `forNavigationMenuItem`'s state) so animations work natively.
 *
 * Carries `aria-labelledby` pointing at the trigger and reflects
 * `data-state` for CSS hooks. A consumer-set **static** `aria-labelledby` on
 * the panel wins over that fallback and is preserved. No focus management is
 * imposed — content
 * is a regular landmark; Tab moves through links inside, then out to the
 * next focusable element after the wrapper.
 *
 * When a `[forNavigationMenuViewport]` is present in the menu, the host
 * element re-parents itself into the viewport on mount so all active
 * panels share a single animated surface (mega-menu pattern). The viewport
 * owns the ordering: each panel is inserted in its trigger's document
 * order, never simply appended in mount order. So during an overlapping
 * A→B transition — where the leaving A is still mounted (its
 * `animate.leave` keeps it around) while B enters — the viewport's child
 * order is deterministic and always matches trigger order: the panel whose
 * trigger comes first in the DOM is the first child, irrespective of which
 * panel mounted last. Cross-fade / slide carousels can therefore author
 * their stacking against trigger order (pair it with `data-motion`). The
 * directive does not undo the re-parent on destroy: the consumer's `@if`
 * is destroying the element anyway, and Angular's renderer removes nodes
 * by their actual current parent.
 *
 * `data-motion` is reflected (`from-start | from-end | to-start | to-end`)
 * for CSS keyframes that slide the entering and leaving panels together
 * during a transition.
 *
 * The host's `focusout` is delegated to the root, which acts on it only for a
 * leave that reports no destination (`relatedTarget === null`); every other
 * leave belongs to the dismissible layer's `'focus'` channel. This host is the
 * panel itself, so such a leave fired inside it always reaches the root — which
 * is what makes the rule independent of where a `[forNavigationMenuViewport]`
 * re-parented the panel: an externally-hosted panel's `focusout` never bubbles
 * to the `<nav>`.
 */
@Directive({
  selector: '[forNavigationMenuContent]',
  exportAs: 'forNavigationMenuContent',
  host: {
    '[id]': 'id()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.data-state]': 'menu.isOpen(value()) ? "open" : "closed"',
    '[attr.data-motion]': 'motion()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focusout)': 'menu.handleSurfaceFocusOut($event)',
    '(keydown.escape)': 'onEscape($any($event))',
  },
})
export class ForNavigationMenuContent {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuContent');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly id = hostId('for-navigation-menu-content');
  protected readonly value: Signal<string> = this.#item.value;
  protected readonly labelledBy = hostLabelledBy(() => this.menu.triggerIdFor(this.value()));
  protected readonly motion = computed(() => this.menu.motionFor(this.value()));

  readonly #mounted = signal(false);

  constructor() {
    const handle = {
      host: this.#host,
      value: this.value,
      id: this.id,
    };
    // Defer registration so the parent's lookups can read `handle.value()`
    // without hitting the not-yet-bound `input.required` throw on the owning
    // `[forNavigationMenuItem]`. `unregisterContent` is reference-based, so
    // destroy-before-register is a safe no-op.
    registerHandle(
      handle,
      (h) => this.menu.registerContent(h),
      (h) => this.menu.unregisterContent(h),
      'afterNextRender',
    );

    warnIfMountedWhileClosed({
      primitive: 'navigation-menu',
      piece: '[forNavigationMenuContent]',
      condition: "open() === '<value>'",
      open: () => this.menu.isOpen(this.value()),
    });

    // Defer the re-parent until after the embedded view is attached to its
    // template anchor — Angular inserts root nodes AFTER directive
    // constructors run, so an `appendChild` here would be undone. Running
    // it in `afterNextRender` happens before browser paint, so the move is
    // not visible. The viewport owns ordering: it inserts this panel in its
    // trigger's document order, so an overlapping A→B transition keeps a
    // deterministic child order regardless of which panel mounted last.
    afterNextRender(() => {
      this.#reparent();
      this.#mounted.set(true);
    });

    // Re-parent (and re-order) the panel reactively once mounted.
    // `triggerHostFor` reads the menu's trigger collection, so this re-runs
    // whenever this panel's trigger registers or unregisters — closing the
    // race where the trigger registers AFTER the content (both defer to
    // `afterNextRender`). Until the trigger is known the panel sorts last;
    // once it registers the viewport re-orders it into trigger document
    // order. The re-parent is a DOM side effect on the imperative viewport
    // handle (no signal writes), and it waits for `#mounted` so it never runs
    // before `afterNextRender` has attached the panel under the viewport.
    //
    // Note: the trigger collection is backed by a `MutationObserver`, and this
    // very `appendChild` re-parent mutates the observed subtree, so the
    // collection can re-notify and re-run this effect a second time. That extra
    // pass is EXPECTED and harmless — `insertPanel` / `#reorder` are idempotent
    // (a node already in its target slot is left untouched), so the re-run is a
    // no-op. Do not "fix" the idempotency away to suppress it: the convergence
    // it guarantees is what makes the registration race self-heal.
    effect(() => {
      if (!this.#mounted()) return;
      this.#reparent();
    });
  }

  #reparent(): void {
    const viewport = this.menu.viewport();
    if (!viewport) return;
    viewport.insertPanel(this.#host, this.menu.triggerHostFor(this.value()));
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) return;
    this.menu.cancelPending();
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) return;
    this.menu.scheduleClose('hover');
  }

  protected onEscape(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const v = this.value();
    this.menu.close();
    this.menu.focusTrigger(v);
  }
}
