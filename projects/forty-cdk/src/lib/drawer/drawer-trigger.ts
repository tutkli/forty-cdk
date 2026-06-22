import { booleanAttribute, Directive, ElementRef, inject, input, model } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';

/**
 * Button that toggles the drawer when clicked. Apply on a focusable element —
 * preferably a `<button>` — so keyboard users can reach it.
 *
 * Wires `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and
 * `data-state` on the host. Two-way bind `[(open)]` to the same signal that
 * gates the surrounding `@if` around `[forDrawer]`. Focus return is owned
 * by `[forDrawer]` (modal mode captures the previously-focused element on
 * mount and restores it on destroy).
 *
 * ```html
 * <button forDrawerTrigger [(open)]="drawerOpen" controls="my-drawer">Open</button>
 * @if (drawerOpen()) {
 *   <div forDrawer id="my-drawer" (dismiss)="drawerOpen.set(false)">…</div>
 * }
 * ```
 */
@Directive({
  selector: '[forDrawerTrigger]',
  exportAs: 'forDrawerTrigger',
  host: {
    type: 'button',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open() ? "true" : "false"',
    '[attr.aria-controls]': 'open() ? controls() : null',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ForDrawerTrigger {
  /**
   * Two-way bindable. Bind to the same signal that gates the surrounding
   * `@if` around `[forDrawer]`. The `model()` change emitter
   * (`(openChange)`) fires only on internal transitions (trigger click).
   */
  readonly open = model<boolean>(false);

  /**
   * Id of the controlled drawer surface. Mirrored to `aria-controls` while
   * the drawer is open. The consumer is responsible for setting the same
   * `id` on `[forDrawer]`.
   */
  readonly controls = input<string | null>(null);

  /**
   * When true, click is ignored and the host reflects `data-disabled=""`,
   * `aria-disabled="true"`, and the native `disabled` attribute so the
   * trigger is announced as disabled by assistive tech and dropped from
   * the tab order.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    reflectDisabled(this.disabled);
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }
    // Same WebKit return-focus quirk as ForDialogTrigger (#136): force focus
    // back onto the trigger before opening so the drawer captures it as the
    // return target.
    this.#host.nativeElement.focus();
    this.open.update((v) => !v);
  }
}
