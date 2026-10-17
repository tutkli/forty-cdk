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
  findRelocatedTabStop,
  registerHandle,
  hostId,
  isHoverCapablePointer,
  isImeComposing,
  resolveActiveElement,
  type Unset,
  isUnset,
} from 'forty-cdk/core';
import { warnIfMountedWhileClosed } from 'forty-cdk/core-overlay';
import {
  injectNavigationMenuContext,
  injectNavigationMenuItemContext,
} from './navigation-menu-context';

/**
 * The disclosure panel for a navigation-menu item. Mounted via `@if`
 * (consumer drives it from `forNavigationMenu.value()` or
 * `forNavigationMenuItem`'s state) so animations work natively.
 *
 * Reflects `data-state` for CSS hooks and emits no role and no accessible name:
 * as in the APG disclosure navigation pattern, the panel is the region a
 * trigger's `aria-expanded` / `aria-controls` discloses, not a landmark. A
 * consumer who wants a named region uses an element that carries one (a
 * `<section>` with its own `aria-labelledby`, for instance), and the directive
 * leaves those attributes alone. No focus is moved on open or close; Tab moves
 * from the trigger through the links inside, then out to the next focusable
 * element after the trigger.
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
 * A panel the viewport hosts keeps its trigger's place in the Tab order and in the
 * accessibility tree while it is open: Tab and Shift+Tab move as if the panel sat
 * right after its trigger, and the owning `[forNavigationMenuItem]` reflects
 * `aria-owns` pointing at it.
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
    '[attr.data-state]': 'menu.isOpen(value()) ? "open" : "closed"',
    '[attr.data-motion]': 'motion()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focusout)': 'menu.handleSurfaceFocusOut($event)',
    '(keydown.escape)': 'onEscape($any($event))',
  },
})
export class ForNavigationMenuContent {
  private readonly menu = injectNavigationMenuContext('ForNavigationMenuContent');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly id = hostId('for-navigation-menu-content');
  private readonly value: Signal<string | Unset> = this.#item.value;
  private readonly motion = computed(() => this.menu.motionFor(this.value()));

  readonly #mounted = signal(false);
  readonly #hosted = computed(() => this.#mounted() && this.menu.viewport() !== null);

  constructor() {
    const handle = {
      host: this.#host,
      value: this.value,
      id: this.id,
      hosted: this.#hosted,
    };
    // Registered synchronously so the trigger's `contentIdFor` lookup resolves
    // during the same pass that renders it, including a server render, where `afterNextRender` never fires and a
    // deferred registration left the pre-hydration DOM unpaired
    // ([#1409](https://github.com/tutkli/forty-cdk/issues/1409) is the same
    // failure class in Tabs). The parent's lookups can read `handle.value()`
    // safely because the owning `[forNavigationMenuItem]`'s `value` is seeded
    // with the `unsetInput` sentinel instead of being declared `input.required`,
    // so a lookup running before that binding is written skips the handle rather
    // than throwing.
    registerHandle(
      handle,
      (h) => this.menu.registerContent(h),
      (h) => this.menu.unregisterContent(h),
    );

    warnIfMountedWhileClosed({
      primitive: 'navigation-menu',
      piece: '[forNavigationMenuContent]',
      // A thunk, so the quoted fix carries this panel's own value rather than a
      // placeholder — `value` is the owning item's binding, which the consumer
      // has written by the time the helper's render hook runs (before that it
      // reads the `unsetInput` sentinel).
      condition: () => {
        const value = this.value();
        return isUnset(value) ? 'open() === <item value>' : `open() === '${value}'`;
      },
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
    // race where the trigger is not yet resolvable when the content mounts
    // (its item's `value` binding may still be unwritten, so the lookup skips
    // it). Until the trigger is known the panel sorts last; once it resolves
    // the viewport re-orders it into trigger document order. The re-parent is a
    // DOM side effect on the imperative viewport handle (no signal writes), and
    // it waits for `#mounted` so it never runs before `afterNextRender` has
    // attached the panel under the viewport.
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

    effect((onCleanup) => {
      if (!this.#hosted() || !this.menu.isOpen(this.value())) return;
      const doc = this.#host.ownerDocument;
      const onKeyDown = (event: KeyboardEvent): void => this.#followTriggerOnTab(event);
      doc.addEventListener('keydown', onKeyDown);
      onCleanup(() => doc.removeEventListener('keydown', onKeyDown));
    });
  }

  #followTriggerOnTab(event: KeyboardEvent): void {
    if (
      event.key !== 'Tab' ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    const trigger = this.menu.triggerHostFor(this.value());
    const active = resolveActiveElement(this.#host.ownerDocument);
    if (trigger === null || active === null) return;
    const target = findRelocatedTabStop(active, trigger, this.#host, event.shiftKey);
    if (target === null) return;
    event.preventDefault();
    target.focus();
  }

  #reparent(): void {
    const viewport = this.menu.viewport();
    if (!viewport) return;
    viewport.insertPanel(this.#host, this.menu.triggerHostFor(this.value()));
  }

  private onPointerEnter(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) return;
    this.menu.cancelPending();
  }

  private onPointerLeave(event: PointerEvent): void {
    if (!isHoverCapablePointer(event)) return;
    this.menu.scheduleClose('hover');
  }

  private onEscape(event: KeyboardEvent): void {
    if (event.defaultPrevented || isImeComposing(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const v = this.value();
    this.menu.close();
    this.menu.focusTrigger(v);
  }
}
