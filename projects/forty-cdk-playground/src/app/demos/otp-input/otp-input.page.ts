import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { OtpCodeExample } from './examples/code.example';
import { OtpMaskedExample } from './examples/masked.example';
import readmeContent from '../../../../../forty-cdk/otp-input/README.md';

@Component({
  selector: 'app-otp-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, OtpCodeExample, OtpMaskedExample],
  template: `
    <primitive-page slug="otp-input" [readme]="readme">
      <app-otp-code-example />
      <app-otp-masked-example />
    </primitive-page>
  `,
})
export class OtpInputPage {
  protected readonly readme = readmeContent;
}
