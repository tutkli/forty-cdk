import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TimePickerBoundsExample } from './examples/bounds.example';
import { TimePickerTimeExample } from './examples/time.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/time-picker/README.md';

@Component({
  selector: 'app-time-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TimePickerTimeExample, TimePickerBoundsExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-picker" [readme]="readme">
      <app-time-picker-time-example />
      <app-time-picker-bounds-example />
    </primitive-page>
  `,
})
export class TimePickerPage {
  protected readonly readme = readmeContent;
}
