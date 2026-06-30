import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk/otp-input';

@Component({
  selector: 'app-otp-masked-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForOtpInput, ForOtpInputSlot],
  template: `
    <div
      forOtpInput
      class="masked-otp"
      [(value)]="pin"
      [length]="6"
      type="numeric"
      mask
      [pasteTransformer]="stripSeparators"
      ariaLabel="One-time PIN"
      #otp="forOtpInput"
    >
      @for (i of otp.slots(); track i) {
        <div forOtpInputSlot [index]="i" #s="forOtpInputSlot" class="masked-otp-slot">
          {{ s.char() }}
          @if (s.hasFakeCaret()) {
            <span class="masked-otp-caret"></span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    app-otp-masked-example {
      display: contents;
    }

    .masked-otp {
      position: relative;
      display: inline-flex;
      gap: 0.5rem;
    }

    .masked-otp > input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: transparent;
      caret-color: transparent;
      outline: none;
      cursor: text;
      opacity: 0;
    }

    .masked-otp-slot {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 3.25rem;
      font-size: 1.3rem;
      font-variant-numeric: tabular-nums;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-text);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .masked-otp-slot[data-active] {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .masked-otp[data-complete] .masked-otp-slot {
      border-color: var(--pg-primary);
    }

    .masked-otp-caret {
      width: 2px;
      height: 1.5rem;
      background: var(--pg-primary);
      border-radius: 1px;
      animation: masked-otp-caret 1s steps(2, jump-none) infinite;
    }

    @keyframes masked-otp-caret {
      50% {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .masked-otp-slot {
        transition: none;
      }

      .masked-otp-caret {
        animation: none;
      }
    }
  `,
})
export class OtpMaskedExample {
  protected readonly pin = signal('');

  protected readonly stripSeparators = (pasted: string): string => pasted.replace(/[\s-]/g, '');
}
