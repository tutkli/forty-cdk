import { computed, Directive, input } from '@angular/core';

import { injectOtpInputContext } from './otp-input-context';

/**
 * One slot of a `[forOtpInput]` — a pure **styling surface** painted over the
 * single real input. Apply one per index
 * inside the `[forOtpInput]` wrapper, passing the 0-based `index`. It renders
 * nothing structural: it exposes the slot's character and active state, and
 * reflects boolean `data-active` / `data-empty` for CSS.
 *
 * The slot has no click handler by design — the real input overlays the slots
 * (the consumer styles it to fill the group), so pointer events land on the
 * input and native caret positioning drives which slot is active.
 *
 * @example
 * ```html
 * <div forOtpInputSlot [index]="i" #s="forOtpInputSlot">
 *   {{ s.char() }}
 *   @if (s.hasFakeCaret()) { <span class="caret"></span> }
 * </div>
 * ```
 */
@Directive({
  selector: '[forOtpInputSlot]',
  exportAs: 'forOtpInputSlot',
  host: {
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-empty]': 'char() === null ? "" : null',
  },
})
export class ForOtpInputSlot {
  protected readonly ctx = injectOtpInputContext('ForOtpInputSlot');

  /** This slot's position (0-based). */
  readonly index = input.required<number>();

  /** The character in this slot, or `null` when empty (masked when `mask` is on). */
  readonly char = computed<string | null>(() => this.ctx.charAt(this.index()));

  /** Whether this slot is the active caret position. */
  readonly active = computed<boolean>(() => this.ctx.isActive(this.index()));

  /** Whether to render a fake caret in this slot. */
  readonly hasFakeCaret = computed<boolean>(() => this.ctx.hasFakeCaret(this.index()));
}
