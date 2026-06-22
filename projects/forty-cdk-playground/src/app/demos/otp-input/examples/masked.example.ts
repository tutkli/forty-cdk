import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForOtpInput, ForOtpInputSlot, type OtpInputType } from 'forty-cdk/otp-input';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-otp-masked-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSelect, ControlSwitch, ForOtpInput, ForOtpInputSlot],
  template: `
    <playground-demo
      title="Masked PIN, character class & paste"
      subtitle="type restricts the allowed characters live — rejected keystrokes never enter the value and fire valueInvalid. mask obscures the slots while value() stays raw. A pasteTransformer strips spaces and dashes before filtering, so pasting “12 34 56” fills cleanly. Switch type to alphabetic, then try typing a digit."
      sourcePath="projects/forty-cdk-playground/src/app/demos/otp-input/examples/masked.example.ts"
    >
      <div demo>
        <div
          forOtpInput
          class="pg-otp"
          [(value)]="pin"
          [length]="6"
          [type]="type()"
          [mask]="mask()"
          [pasteTransformer]="stripSeparators"
          ariaLabel="One-time PIN"
          (valueInvalid)="onInvalid()"
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
        <app-control-select
          label="type"
          hint="The allowed character class. Anything outside it is rejected as you type."
          [options]="typeOptions"
          [(value)]="type"
        />
        <app-control-switch label="mask" [(checked)]="mask" />
        <p class="pg-state">
          value: <b>{{ pin() || '∅' }}</b
          ><br />
          rejected keystrokes: <b>{{ rejected() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class OtpMaskedExample {
  protected readonly pin = signal('');
  protected readonly type = signal<OtpInputType>('numeric');
  protected readonly mask = signal(true);
  protected readonly rejected = signal(0);

  protected readonly typeOptions: readonly ControlOption<OtpInputType>[] = [
    { value: 'numeric', label: 'Numeric' },
    { value: 'alphanumeric', label: 'Alphanumeric' },
    { value: 'alphabetic', label: 'Alphabetic' },
  ];

  protected readonly stripSeparators = (pasted: string): string => pasted.replace(/[\s-]/g, '');

  protected onInvalid(): void {
    this.rejected.update((n) => n + 1);
  }
}
