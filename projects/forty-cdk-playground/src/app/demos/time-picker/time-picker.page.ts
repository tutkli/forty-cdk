import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TimePickerBoundsExample } from './examples/bounds.example';
import { TimePickerTimeExample } from './examples/time.example';

@Component({
  selector: 'app-time-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TimePickerTimeExample, TimePickerBoundsExample],
  template: `
    <primitive-page slug="time-picker">
      <app-time-picker-time-example />
      <app-time-picker-bounds-example />
    </primitive-page>
  `,
})
export class TimePickerPage {}
