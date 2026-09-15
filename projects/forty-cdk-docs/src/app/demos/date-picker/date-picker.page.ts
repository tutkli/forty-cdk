import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DatePickerConstraintsExample } from './examples/constraints.example';
import { DatePickerDateTimeExample } from './examples/date-time.example';
import { DatePickerDefaultExample } from './examples/default.example';
import { DatePickerRangeFormExample } from './examples/range-form.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/date-picker.generated';

@Component({
  selector: 'app-date-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DatePickerDefaultExample,
    DatePickerDateTimeExample,
    DatePickerConstraintsExample,
    DatePickerRangeFormExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-picker" [doc]="doc">
      <demo-layout hero sourcePath="date-picker/examples/default.example.ts">
        <app-date-picker-default-example />
      </demo-layout>

      <demo-layout
        heading="date--time-picker"
        sourcePath="date-picker/examples/date-time.example.ts"
      >
        <app-date-picker-date-time-example />
      </demo-layout>

      <demo-layout heading="constraints" sourcePath="date-picker/examples/constraints.example.ts">
        <app-date-picker-constraints-example />
      </demo-layout>

      <demo-layout
        heading="range-selection"
        sourcePath="date-picker/examples/range-form.example.ts"
      >
        <app-date-picker-range-form-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DatePickerPage {
  protected readonly doc = DOC;
}
