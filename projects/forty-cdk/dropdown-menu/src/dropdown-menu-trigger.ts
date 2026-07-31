import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  type Signal,
} from '@angular/core';

import {
  asMenuOpenerRegistration,
  hostButtonType,
  hostId,
  reflectDisabled,
  type MenuActivationModality,
  type MenuOpenerPositioning,
  FOR_MENU_CONTEXT,
  type ForMenuContext,
} from 'forty-cdk/core';

/**
 * Resolves the trigger's menu root: the explicit reference when the
 * `[forDropdownMenuTrigger]` input carries one, the injected `FOR_MENU_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 */
function injectDropdownMenuTriggerContext(
  explicitRoot: Signal<ForMenuContext | ''>,
): Signal<ForMenuContext> {
  const injected = inject(FOR_MENU_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected;
    }
    throw new Error(
      '[forty-cdk/dropdown-menu] ForDropdownMenuTrigger could not resolve its [forDropdownMenu] root: ' +
        'no FOR_MENU_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forDropdownMenuTrigger]="root" with #root="forDropdownMenu".',
    );
  });
}

/**
 * Button that toggles the dropdown menu when clicked, opens via Enter / Space
 * / ArrowDown (focus first item) or ArrowUp (focus last item).
 *
 * Apply on a `<button>`. Wires `aria-haspopup`, `aria-expanded`, and
 * `aria-controls` per the menu-button pattern.
 *
 * The open keys are handled on `keydown` and `preventDefault()`-ed, so Enter /
 * Space never reach the button's native click: per the APG menu-button pattern
 * they only ever *open* (the pointer click keeps its toggle semantics). When the
 * menu is already open they move focus to the requested first / last enabled
 * item instead of being dead keys — for instance after an
 * `(autoFocusOnOpen)`-vetoed open left focus on the trigger.
 *
 * The trigger distinguishes pointer from keyboard activation (a `pointerdown`
 * preceding the click marks it pointer-driven): both move focus to the first
 * item, but only a keyboard open highlights it — a mouse-opened menu carries
 * no `data-highlighted` until keyboard navigation.
 *
 * Disabling: the trigger merges its own `disabled` input OR the root's
 * `disabled`. The native `disabled` attribute is the single reflection channel
 * — no `aria-disabled` is emitted, because on a real single-purpose `<button>`
 * trigger the native attribute already conveys the state to assistive
 * technology (rule #561 D2). It is reflected imperatively and
 * non-destructively — the directive only removes the attribute when it set it
 * itself, so a consumer-set `disabled` on the same button always survives an
 * enabled menu context. `data-disabled=""` stays as the styling hook.
 *
 * The root is normally resolved via DI from the enclosing `[forDropdownMenu]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forDropdownMenuTrigger]="root"` with
 * `#root="forDropdownMenu"`.
 */
@Directive({
  selector: '[forDropdownMenuTrigger]',
  exportAs: 'forDropdownMenuTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    '[id]': 'id()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(pointerdown)': 'onPointerDown()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForDropdownMenuTrigger {
  protected readonly buttonType = hostButtonType();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #pointerActivation = false;

  /**
   * The trigger's own aria-wiring id, adopting a consumer-set static `id`. It is
   * per-opener rather than per-root so a menu shared by several openers
   * (`[forMenu]`) never emits the same `id` twice; the surface names itself after
   * whichever opener is active. A button is a discrete labelling control, so the
   * trigger registers as one and an unnamed surface it opened falls back to
   * `aria-labelledby` pointing here.
   */
  readonly id = hostId('for-dropdown-menu-trigger');

  /**
   * Optional explicit reference to the `[forDropdownMenu]` root, named after
   * the selector `routerLink`-style. The bare valueless attribute keeps
   * resolving the enclosing root via DI; pass the root explicitly
   * (`[forDropdownMenuTrigger]="root"`, with `#root="forDropdownMenu"`) when
   * the trigger is declared in an `ng-template` stamped inside the root — DI
   * resolves at the template's declaration site, so the enclosing root is
   * invisible there. The empty string (what the valueless attribute yields)
   * is treated as unset.
   */
  readonly forDropdownMenuTrigger = input<ForMenuContext | ''>('');

  protected readonly ctx = injectDropdownMenuTriggerContext(this.forDropdownMenuTrigger);

  readonly #openerRegistration = computed(() => asMenuOpenerRegistration(this.ctx()));

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Placement override for the opens this trigger drives, falling back to the
   * root's inputs for every key it leaves out. Only the four placement values
   * are overridable (`side`, `align`, `sideOffset`, `alignOffset`); the rest of
   * the positioning surface is collision policy the root owns.
   *
   * It exists for a menu shared by heterogeneous openers, where one root cannot
   * pick offsets that suit them all — a button opener wants a few pixels of
   * clearance, a pointer-anchored `[forContextMenuTrigger]` region wants to sit
   * flush at the cursor:
   *
   * ```html
   * <button [forDropdownMenuTrigger]="row" [menuPositioning]="{ sideOffset: 4 }">⋮</button>
   * ```
   *
   * It resolves identically under a `[forDropdownMenu]` root, where it is
   * simply a per-trigger spelling of the root's own inputs. A root with no
   * opener registry (`[forMenubar]`'s multiplexed context, which multiplexes
   * positioning off its own triggers) ignores it.
   */
  readonly menuPositioning = input<MenuOpenerPositioning | null>(null);

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx().disabled());

  constructor() {
    const el = this.#host.nativeElement;
    // Registration is an imperative call into the resolved root's registry,
    // not state derivation — the effect only re-registers the element when the
    // resolved root changes (explicit reference swapped at runtime).
    effect((onCleanup) => {
      const ctx = this.ctx();
      const openers = this.#openerRegistration();
      if (openers === null) {
        ctx.registerTrigger(el);
        onCleanup(() => ctx.unregisterTrigger(el));
        return;
      }
      openers.registerOpener(el, {
        id: this.id,
        dismissibleExempt: true,
        labelsMenu: true,
        positioning: this.menuPositioning,
      });
      onCleanup(() => openers.unregisterOpener(el));
    });
    reflectDisabled(this.effectiveDisabled);
  }

  protected onPointerDown(): void {
    this.#pointerActivation = true;
  }

  protected onClick(): void {
    const modality: MenuActivationModality = this.#pointerActivation ? 'pointer' : 'keyboard';
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    this.#activate();
    this.ctx().toggle('first', modality);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.#activate();
      this.ctx().openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.#activate();
      this.ctx().openMenu('last');
    }
  }

  #activate(): void {
    this.#openerRegistration()?.activateOpener(this.#host.nativeElement);
  }
}
