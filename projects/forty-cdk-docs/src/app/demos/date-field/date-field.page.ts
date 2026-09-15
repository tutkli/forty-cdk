import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DateFieldDateTimeExample } from './examples/date-time.example';
import { DateFieldDefaultExample } from './examples/default.example';
import { DateFieldFormFieldExample } from './examples/form-field.example';
import { DateFieldLocalizedExample } from './examples/localized.example';
import { DateRangeFieldDateTimeExample } from './examples/range-date-time.example';
import { DateRangeFieldFormFieldExample } from './examples/range-form-field.example';
import { DateRangeFieldDefaultExample } from './examples/range.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/date-field.generated';

@Component({
  selector: 'app-date-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DateFieldDefaultExample,
    DateFieldDateTimeExample,
    DateFieldLocalizedExample,
    DateFieldFormFieldExample,
    DateRangeFieldDefaultExample,
    DateRangeFieldDateTimeExample,
    DateRangeFieldFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-field" [doc]="doc">
      <demo-layout hero sourcePath="date-field/examples/default.example.ts">
        <app-date-field-default-example />
      </demo-layout>

      <demo-layout heading="date--time" sourcePath="date-field/examples/date-time.example.ts">
        <app-date-field-date-time-example />
      </demo-layout>

      <demo-layout
        heading="localized-segment-labels"
        sourcePath="date-field/examples/localized.example.ts"
      >
        <app-date-field-localized-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="date-field/examples/form-field.example.ts">
        <app-date-field-form-field-example />
      </demo-layout>

      <demo-layout heading="date-range" sourcePath="date-field/examples/range.example.ts">
        <app-date-range-field-default-example />
      </demo-layout>

      <demo-layout
        heading="date--time-range"
        sourcePath="date-field/examples/range-date-time.example.ts"
      >
        <app-date-range-field-date-time-example />
      </demo-layout>

      <demo-layout
        heading="range-in-signal-forms"
        sourcePath="date-field/examples/range-form-field.example.ts"
      >
        <app-date-range-field-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DateFieldPage {
  protected readonly doc = DOC;
}
