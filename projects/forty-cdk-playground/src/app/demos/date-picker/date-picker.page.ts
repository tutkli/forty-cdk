import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DatePickerConstraintsExample } from './examples/constraints.example';
import { DatePickerDateTimeExample } from './examples/date-time.example';
import { DatePickerBasicExample } from './examples/picker.example';
import { DatePickerRangeExample } from './examples/range.example';
import { DatePickerRangeFormExample } from './examples/range-form.example';

@Component({
  selector: 'app-date-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DatePickerBasicExample,
    DatePickerDateTimeExample,
    DatePickerConstraintsExample,
    DatePickerRangeExample,
    DatePickerRangeFormExample,
  ],
  template: `
    <primitive-page slug="date-picker">
      <app-date-picker-basic-example />
      <app-date-picker-date-time-example />
      <app-date-picker-constraints-example />
      <app-date-picker-range-example />
      <app-date-picker-range-form-example />
    </primitive-page>
  `,
})
export class DatePickerPage {}
