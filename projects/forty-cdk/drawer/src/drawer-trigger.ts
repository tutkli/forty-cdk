import { booleanAttribute, Directive, ElementRef, inject, input, model } from '@angular/core';

import { focusAfterPress, fortyWarn, hostButtonType, reflectDisabled } from 'forty-cdk/core';
import { warnIfOpenWithoutControls } from 'forty-cdk/core-overlay';

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
    '[attr.type]': 'buttonType()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open() ? "true" : "false"',
    '[attr.aria-controls]': 'open() ? controls() : null',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForDrawerTrigger {
  protected readonly buttonType = hostButtonType();

  /**
   * Two-way bindable. Bind to the same signal that gates the surrounding
   * `@if` around `[forDrawer]`. The `model()` change emitter
   * (`(openChange)`) fires only on internal transitions (trigger click).
   */
  readonly open = model<boolean>(false);

  /**
   * Id of the controlled drawer surface. Mirrored to `aria-controls` while
   * the drawer is open. The consumer is responsible for setting the same
   * `id` on `[forDrawer]`. Leaving it unset when the drawer opens drops
   * `aria-controls`, and a dev-mode warning fires on the first open while it
   * stays unset.
   */
  readonly controls = input<string | null>(null);

  /**
   * When true, click is ignored and the host reflects `data-disabled=""` plus
   * the native `disabled` attribute so the trigger is announced as disabled by
   * assistive tech and dropped from the tab order. The native attribute is the
   * single reflection channel — no `aria-disabled` is emitted, because on a
   * real single-purpose `<button>` trigger it already conveys the state.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    reflectDisabled(this.disabled);
    warnIfOpenWithoutControls({
      open: this.open,
      controls: this.controls,
      warn: () =>
        fortyWarn({
          code: 'FORCDK-DRAWER-013',
          message: '[forDrawerTrigger] is open but has no [controls], so aria-controls is omitted.',
          cause:
            'The trigger and its drawer are separate elements, so only the consumer knows the id.',
          fix: 'Set [controls] to the id on [forDrawer] so assistive tech links the two.',
        }),
    });
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }
    focusAfterPress(this.#host.nativeElement);
    this.open.update((v) => !v);
  }
}
