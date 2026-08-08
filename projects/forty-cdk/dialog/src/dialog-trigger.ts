import {
  booleanAttribute,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
} from '@angular/core';

import { fortyWarn, hostButtonType, reflectDisabled } from 'forty-cdk/core';

/**
 * Button that toggles the dialog when clicked. Apply on a focusable element —
 * preferably a `<button>` — so keyboard users can reach it.
 *
 * Wires `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and
 * `data-state` on the host. Two-way bind `[(open)]` to the same signal that
 * gates the surrounding `@if` around `[forDialog]`. Focus return on close is
 * handled by `[forDialog]` automatically — its focus trap captures the
 * previously-focused element on mount and restores it on destroy, which is
 * the trigger when the user clicked it.
 *
 * ```html
 * <button forDialogTrigger [(open)]="dialogOpen" controls="my-dialog">Open</button>
 * @if (dialogOpen()) {
 *   <div forDialog id="my-dialog" (dismiss)="dialogOpen.set(false)">…</div>
 * }
 * ```
 */
@Directive({
  selector: '[forDialogTrigger]',
  exportAs: 'forDialogTrigger',
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
export class ForDialogTrigger {
  protected readonly buttonType = hostButtonType();

  /**
   * Two-way bindable. Bind to the same signal that gates the surrounding
   * `@if` around `[forDialog]`. The `model()` change emitter (`(openChange)`)
   * fires only on internal transitions (trigger click), never on consumer
   * writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Id of the controlled dialog box. Mirrored to `aria-controls` while the
   * dialog is open. The consumer is responsible for setting the same `id` on
   * `[forDialog]`. Has no effect on focus or behavior — purely the
   * accessibility relationship between trigger and box. Leaving it unset when
   * the dialog opens drops `aria-controls` silently; a dev-mode warning fires
   * so the missing linkage is visible during development.
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
    if (isDevMode()) {
      effect(() => {
        if (this.open() && this.controls() === null) {
          fortyWarn({
            code: 'FORCDK-DIALOG-002',
            message:
              '[forDialogTrigger] is open but has no [controls], so aria-controls is omitted.',
            cause:
              'The trigger and its dialog are separate elements, so only the consumer knows the id.',
            fix: 'Set [controls] to the id on [forDialog] so assistive tech links the two.',
          });
        }
      });
    }
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }
    // Force focus back onto the trigger before opening. WebKit/Safari does
    // not focus a `<button>` on `mousedown`, and an already-focused button
    // is blurred by the same `mousedown`, so by the time this click handler
    // runs the active element is `<body>`. The dialog's return-focus
    // contract is "restore to whatever held focus when I opened" — without
    // this, that target captures `body` on WebKit and return-focus is a
    // no-op (#136). Idempotent on Chromium / jsdom (already focused).
    this.#host.nativeElement.focus();
    this.open.update((v) => !v);
  }
}
