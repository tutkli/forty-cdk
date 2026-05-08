import { booleanAttribute, Directive, ElementRef, inject, input, model } from '@angular/core';

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
 *   <div forDialog id="my-dialog" (close)="dialogOpen.set(false)">…</div>
 * }
 * ```
 */
@Directive({
  selector: '[forDialogTrigger]',
  exportAs: 'forDialogTrigger',
  host: {
    type: 'button',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'open() ? "true" : "false"',
    '[attr.aria-controls]': 'open() ? controls() : null',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForDialogTrigger {
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
   * accessibility relationship between trigger and box.
   */
  readonly controls = input<string | null>(null);

  /** When true, click is ignored and `data-disabled=""` is reflected. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

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
