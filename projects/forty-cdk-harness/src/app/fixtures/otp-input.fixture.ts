import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForOtpInput, ForOtpInputSlot, type OtpInputType } from 'forty-cdk/otp-input';

/**
 * Fixture for `[forOtpInput]`. The real, interactive `<input>` is injected by
 * the directive after render and overlaid (transparent) on the styling slots,
 * so specs target it via `[data-testid="otp"] input` rather than a static id.
 *
 * Exists for the IME-composition E2E coverage (#437): jsdom emits no real
 * composition events, so the `compositionstart → insertCompositionText →
 * compositionend` guard — a composed character is not dropped and the caret is
 * not corrupted across the cycle — can only be exercised against a real
 * browser. `value` and the `valueComplete` count are surfaced as `<output>`s
 * so a spec can read the committed code (and that it commits exactly once)
 * without reaching into directive internals.
 *
 * Query params:
 *  - `?type=numeric|alphanumeric|alphabetic` — allowed-character class
 *    (default `numeric`, so non-digit composed characters are dropped on
 *    `compositionend`).
 */
@Component({
  selector: 'app-otp-input-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForOtpInput, ForOtpInputSlot],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      [forOtpInput] {
        position: relative;
        display: inline-flex;
        gap: 8px;
      }
      [forOtpInputSlot] {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 44px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font: 18px / 1 monospace;
      }
      [forOtpInputSlot][data-active] {
        border-color: #4f46e5;
      }
      /* The injected real input overlays the slots; the consumer makes it
         transparent so the slots show through. Events still land on it. */
      [forOtpInput] input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border: 0;
        background: transparent;
        color: transparent;
        caret-color: transparent;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-otp" />
    <div
      data-testid="otp"
      forOtpInput
      [(value)]="value"
      [length]="6"
      [type]="type"
      ariaLabel="Verification code"
      (valueComplete)="completeCount.set(completeCount() + 1)"
      #otp="forOtpInput"
    >
      @for (i of otp.slots(); track i) {
        <div forOtpInputSlot [index]="i" [attr.data-testid]="'slot-' + i">{{ otp.charAt(i) }}</div>
      }
    </div>
    <input data-testid="after" placeholder="after-otp" />

    <output data-testid="value">{{ value() }}</output>
    <output data-testid="complete-count">{{ completeCount() }}</output>
  `,
})
export class OtpInputFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly value = signal('');
  protected readonly completeCount = signal(0);
  protected readonly type = this.#typeParam();

  #typeParam(): OtpInputType {
    const raw = this.#route.snapshot.queryParamMap.get('type');
    return raw === 'alphanumeric' || raw === 'alphabetic' ? raw : 'numeric';
  }
}
