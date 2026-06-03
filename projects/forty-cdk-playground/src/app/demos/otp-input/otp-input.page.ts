import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { OtpCodeExample } from './examples/code.example';
import { OtpMaskedExample } from './examples/masked.example';

@Component({
  selector: 'app-otp-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, OtpCodeExample, OtpMaskedExample],
  template: `
    <primitive-page slug="otp-input">
      <app-otp-code-example />
      <app-otp-masked-example />
    </primitive-page>
  `,
})
export class OtpInputPage {}
