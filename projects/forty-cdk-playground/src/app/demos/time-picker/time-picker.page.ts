import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TimePickerBoundsExample } from './examples/bounds.example';
import { TimePickerDisabledExample } from './examples/disabled.example';
import { TimePickerTimeExample } from './examples/time.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/time-picker/README.md';

@Component({
  selector: 'app-time-picker-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TimePickerTimeExample,
    TimePickerDisabledExample,
    TimePickerBoundsExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-picker" [readme]="readme">
      <playground-demo
        title="Pick a time"
        subtitle="A combobox trigger opens a portaled listbox of generated time slots, built on the APG Listbox pattern. step sets the interval in minutes and hourCycle picks the clock; Enter / Space pick the focused slot, arrows roam, Home / End jump to the ends. The surface portals to <body>, so its styles are colocated here via ViewEncapsulation.None."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-picker/examples/time.example.ts"
      >
        <app-time-picker-time-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="disabled removes the trigger from the tab order and reflects data-disabled. The listbox can no longer be opened."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-picker/examples/disabled.example.ts"
      >
        <app-time-picker-disabled-example />
      </playground-demo>

      <playground-demo
        title="Bounded slots"
        subtitle="minTime and maxTime fence the selectable time-of-day. Slots outside the window are not removed — they stay in the listbox as disabled options (data-disabled), skipped by keyboard navigation, so the full timeline stays visible. Open the listbox and scroll past 17:00 to see the late slots dimmed out."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-picker/examples/bounds.example.ts"
      >
        <app-time-picker-bounds-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TimePickerPage {
  protected readonly readme = readmeContent;
}
