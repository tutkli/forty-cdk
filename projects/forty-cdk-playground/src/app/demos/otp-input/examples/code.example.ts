import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForOtpInput, ForOtpInputSlot } from 'forty-cdk/otp-input';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-otp-code-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSwitch, ForOtpInput, ForOtpInputSlot],
  template: `
    <playground-demo
      title="Verification code"
      subtitle="One real input carries the whole code; the slots are a styling surface that read their character from the group via context. The active slot paints a fake caret, the group reflects data-complete when full, and valueComplete fires on the last keystroke or a paste. Try typing, pasting a 6-digit code, and using ← / → / Backspace."
      sourcePath="projects/forty-cdk-playground/src/app/demos/otp-input/examples/code.example.ts"
    >
      <div demo>
        <div
          forOtpInput
          class="pg-otp"
          [(value)]="code"
          [length]="6"
          type="numeric"
          ariaLabel="Verification code"
          [disabled]="disabled()"
          (valueComplete)="onComplete($event)"
          #otp="forOtpInput"
        >
          @for (i of otp.slots(); track i) {
            <div forOtpInputSlot [index]="i" #s="forOtpInputSlot" class="pg-otp-slot">
              {{ s.char() }}
              @if (s.hasFakeCaret()) {
                <span class="pg-otp-caret"></span>
              }
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="code.set('')">Clear</button>
          <button type="button" class="pg-btn" (click)="code.set('123456')">Fill</button>
        </div>
        <p class="pg-state">
          value: <b>{{ code() || '∅' }}</b
          ><br />
          complete: <b>{{ otp.complete() }}</b
          ><br />
          last completed: <b>{{ completed() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class OtpCodeExample {
  protected readonly code = signal('');
  protected readonly disabled = signal(false);
  protected readonly completed = signal('');

  protected onComplete(value: string): void {
    this.completed.set(value);
  }
}
