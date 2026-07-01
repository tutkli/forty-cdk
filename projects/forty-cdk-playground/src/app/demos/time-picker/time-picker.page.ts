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
      <playground-demo hero sourcePath="time-picker/examples/time.example.ts">
        <app-time-picker-time-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> removes the trigger from the tab order and reflects <code>data-disabled</code>. The listbox can no longer be opened."
        sourcePath="time-picker/examples/disabled.example.ts"
      >
        <app-time-picker-disabled-example />
      </playground-demo>

      <playground-demo
        title="Bounded slots"
        subtitle="<code>minTime</code> and <code>maxTime</code> fence the selectable time-of-day. Slots outside the window are not removed — they stay in the listbox as disabled options (<code>data-disabled</code>), skipped by keyboard navigation, so the full timeline stays visible. Open the listbox and scroll past <code>17:00</code> to see the late slots dimmed out."
        sourcePath="time-picker/examples/bounds.example.ts"
      >
        <app-time-picker-bounds-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TimePickerPage {
  protected readonly readme = readmeContent;
}
