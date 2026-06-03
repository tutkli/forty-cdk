import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DatePickerConstraintsExample } from './examples/constraints.example';
import { DatePickerBasicExample } from './examples/picker.example';

@Component({
  selector: 'app-date-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DatePickerBasicExample, DatePickerConstraintsExample],
  template: `
    <primitive-page slug="date-picker">
      <app-date-picker-basic-example />
      <app-date-picker-constraints-example />
    </primitive-page>
  `,
})
export class DatePickerPage {}
