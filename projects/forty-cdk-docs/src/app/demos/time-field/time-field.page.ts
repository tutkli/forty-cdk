import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TimeFieldBoundsExample } from './examples/bounds.example';
import { TimeFieldDefaultExample } from './examples/default.example';
import { TimeFieldFormFieldExample } from './examples/form-field.example';
import { TimeRangeFieldBoundsExample } from './examples/range-bounds.example';
import { TimeRangeFieldFormFieldExample } from './examples/range-form-field.example';
import { TimeRangeFieldDefaultExample } from './examples/range.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/time-field.generated';

@Component({
  selector: 'app-time-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TimeFieldDefaultExample,
    TimeFieldBoundsExample,
    TimeFieldFormFieldExample,
    TimeRangeFieldDefaultExample,
    TimeRangeFieldBoundsExample,
    TimeRangeFieldFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-field" [doc]="doc">
      <demo-layout hero sourcePath="time-field/examples/default.example.ts">
        <app-time-field-default-example />
      </demo-layout>

      <demo-layout heading="bounded-time" sourcePath="time-field/examples/bounds.example.ts">
        <app-time-field-bounds-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="time-field/examples/form-field.example.ts">
        <app-time-field-form-field-example />
      </demo-layout>

      <demo-layout heading="time-range" sourcePath="time-field/examples/range.example.ts">
        <app-time-range-field-default-example />
      </demo-layout>

      <demo-layout heading="bounded-range" sourcePath="time-field/examples/range-bounds.example.ts">
        <app-time-range-field-bounds-example />
      </demo-layout>

      <demo-layout
        heading="range-in-signal-forms"
        sourcePath="time-field/examples/range-form-field.example.ts"
      >
        <app-time-range-field-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TimeFieldPage {
  protected readonly doc = DOC;
}
