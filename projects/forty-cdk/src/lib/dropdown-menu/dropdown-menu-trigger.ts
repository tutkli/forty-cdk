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

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import type { MenuActivationModality } from '../_internal/menu-overlay/menu-overlay';
import { FOR_MENU_CONTEXT, type ForMenuContext } from '../_internal/menu-overlay/menu-context';

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
 * Button that toggles the dropdown menu when clicked, opens via ArrowDown
 * (focus first item) or ArrowUp (focus last item).
 *
 * Apply on a `<button>` so Space / Enter dispatch native click events
 * automatically — those open the menu via `(click)`. Wires `aria-haspopup`,
 * `aria-expanded`, and `aria-controls` per the menu-button pattern.
 *
 * The trigger distinguishes pointer from keyboard activation (a `pointerdown`
 * preceding the click marks it pointer-driven): both move focus to the first
 * item, but only a keyboard open highlights it — a mouse-opened menu carries
 * no `data-highlighted` until keyboard navigation.
 *
 * Disabling: the trigger merges its own `disabled` input OR the root's
 * `disabled`. The native `disabled` attribute is reflected imperatively and
 * non-destructively — the directive only removes the attribute when it set it
 * itself, so a consumer-set `disabled` on the same button always survives an
 * enabled menu context.
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
    type: 'button',
    '[id]': 'ctx().triggerId()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '(pointerdown)': 'onPointerDown()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForDropdownMenuTrigger {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #pointerActivation = false;

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

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx().disabled());

  constructor() {
    const el = this.#host.nativeElement;
    // Registration is an imperative call into the resolved root's registry,
    // not state derivation — the effect only re-registers the element when the
    // resolved root changes (explicit reference swapped at runtime).
    effect((onCleanup) => {
      const ctx = this.ctx();
      ctx.registerTrigger(el);
      onCleanup(() => ctx.unregisterTrigger(el));
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
    this.ctx().toggle('first', modality);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.#pointerActivation = false;
    if (this.effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx().openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx().openMenu('last');
    }
  }
}
