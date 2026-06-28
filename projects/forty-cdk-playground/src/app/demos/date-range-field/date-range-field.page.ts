import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DateRangeFieldDateTimeExample } from './examples/date-time.example';
import { DateRangeFieldFormFieldExample } from './examples/form-field.example';
import { DateRangeFieldRangeExample } from './examples/range.example';
import readmeContent from '../../../../../forty-cdk/date-range-field/README.md';

@Component({
  selector: 'app-date-range-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DateRangeFieldRangeExample,
    DateRangeFieldDateTimeExample,
    DateRangeFieldFormFieldExample,
  ],
  template: `
    <primitive-page slug="date-range-field" [readme]="readme">
      <app-date-range-field-range-example />
      <app-date-range-field-date-time-example />
      <app-date-range-field-form-field-example />
    </primitive-page>
  `,
})
export class DateRangeFieldPage {
  protected readonly readme = readmeContent;
}
