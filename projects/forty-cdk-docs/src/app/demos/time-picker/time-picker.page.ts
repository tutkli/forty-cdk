import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TimePickerBoundsExample } from './examples/bounds.example';
import { TimePickerStatesExample } from './examples/states.example';
import { TimePickerTimeExample } from './examples/time.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/time-picker.generated';

@Component({
  selector: 'app-time-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TimePickerTimeExample,
    TimePickerStatesExample,
    TimePickerBoundsExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-picker" [doc]="doc">
      <demo-layout hero sourcePath="time-picker/examples/time.example.ts">
        <app-time-picker-time-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="time-picker/examples/states.example.ts">
        <app-time-picker-states-example />
      </demo-layout>

      <demo-layout heading="bounded-slots" sourcePath="time-picker/examples/bounds.example.ts">
        <app-time-picker-bounds-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TimePickerPage {
  protected readonly doc = DOC;
}
