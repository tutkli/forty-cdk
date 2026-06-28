import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MeterExample } from './examples/meter.example';
import { MeterValueLabelExample } from './examples/value-label.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/meter/README.md';

@Component({
  selector: 'app-meter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MeterExample, MeterValueLabelExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
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
