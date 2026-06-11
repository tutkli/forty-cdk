import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectMenuContext } from '../menu/menu-context';

/**
 * Button that toggles the dropdown menu when clicked, opens via ArrowDown
 * (focus first item) or ArrowUp (focus last item).
 *
 * Apply on a `<button>` so Space / Enter dispatch native click events
 * automatically — those open the menu via `(click)`. Wires `aria-haspopup`,
 * `aria-expanded`, and `aria-controls` per the menu-button pattern.
 *
 * Disabling: the trigger merges its own `disabled` input OR the root's
 * `disabled`. The native `disabled` attribute is reflected imperatively and
 * non-destructively — the directive only removes the attribute when it set it
 * itself, so a consumer-set `disabled` on the same button always survives an
 * enabled menu context.
 */
@Directive({
  selector: '[forDropdownMenuTrigger]',
  exportAs: 'forDropdownMenuTrigger',
  host: {
    type: 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForDropdownMenuTrigger {
  protected readonly ctx = injectMenuContext('ForDropdownMenuTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #setDisabledAttribute = false;

  /** Disables this trigger only, in addition to the root's `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether the trigger is disabled — its own `disabled` input OR the root's. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerTrigger(el),
      (el) => this.ctx.unregisterTrigger(el),
    );
    effect(() => {
      const el = this.#host.nativeElement;
      if (this.effectiveDisabled()) {
        if (!el.hasAttribute('disabled')) {
          el.setAttribute('disabled', '');
          this.#setDisabledAttribute = true;
        }
      } else if (this.#setDisabledAttribute) {
        el.removeAttribute('disabled');
        this.#setDisabledAttribute = false;
      }
    });
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.ctx.toggle('first');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx.openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx.openMenu('last');
    }
  }
}
