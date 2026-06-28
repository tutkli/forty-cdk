import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MeterExample } from './examples/meter.example';
import { MeterValueLabelExample } from './examples/value-label.example';
import readmeContent from '../../../../../forty-cdk/meter/README.md';

@Component({
  selector: 'app-meter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MeterExample, MeterValueLabelExample],
  template: `
    <primitive-page slug="meter" [readme]="readme">
      <app-meter-example />
      <app-meter-value-label-example />
    </primitive-page>
  `,
})
export class MeterPage {
  protected readonly readme = readmeContent;
}
