import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { OtpDefaultExample } from './examples/default.example';
import { OtpMaskedExample } from './examples/masked.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/otp-input/README.md';

@Component({
  selector: 'app-otp-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, OtpDefaultExample, OtpMaskedExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="otp-input" [readme]="readme">
      <playground-demo hero sourcePath="otp-input/examples/default.example.ts">
        <app-otp-default-example />
      </playground-demo>

      <playground-demo
        title="Masked PIN with paste transform"
        subtitle="<code>mask</code> obscures the slots while <code>value()</code> stays raw, and a <code>pasteTransformer</code> strips spaces and dashes before filtering — so pasting “12 34 56” fills cleanly. <code>type</code> still rejects anything outside the numeric character class as you type."
        sourcePath="otp-input/examples/masked.example.ts"
      >
        <app-otp-masked-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class OtpInputPage {
  protected readonly readme = readmeContent;
}
