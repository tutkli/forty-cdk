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

      <demo-layout
        title="States"
        subtitle="One class and one directive, three states. <code>disabled</code> removes the trigger from the tab order; <code>readonly</code> keeps it focusable and announced. Both refuse to open the listbox, and both reflect a styling hook of their own — <code>data-disabled</code> and <code>data-readonly</code>."
        sourcePath="time-picker/examples/states.example.ts"
      >
        <app-time-picker-states-example />
      </demo-layout>

      <demo-layout
        title="Bounded slots"
        subtitle="<code>minTime</code> and <code>maxTime</code> fence the selectable time-of-day. Slots outside the window are not removed — they stay in the listbox as disabled options (<code>data-disabled</code>), skipped by keyboard navigation, so the full timeline stays visible. Open the listbox and scroll past <code>17:00</code> to see the late slots dimmed out."
        sourcePath="time-picker/examples/bounds.example.ts"
      >
        <app-time-picker-bounds-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TimePickerPage {
  protected readonly doc = DOC;
}
