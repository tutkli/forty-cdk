import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MeterExample } from './examples/meter.example';

@Component({
  selector: 'app-meter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MeterExample],
  template: `
    <primitive-page slug="meter">
      <app-meter-example />
    </primitive-page>
  `,
})
export class MeterPage {}
