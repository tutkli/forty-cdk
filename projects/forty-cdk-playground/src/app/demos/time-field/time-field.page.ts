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
import readmeContent from '../../../../../forty-cdk/time-field/README.md';

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
    <primitive-page slug="time-field" [readme]="readme">
      <playground-demo hero sourcePath="time-field/examples/default.example.ts">
        <app-time-field-default-example />
      </playground-demo>

      <playground-demo
        title="Bounded time"
        subtitle="<code>minTime</code> and <code>maxTime</code> fence the time-of-day to office hours. Only the time component is compared, so stepping the hour past <code>17:00</code> or before <code>09:00</code> with <kbd>↑</kbd> / <kbd>↓</kbd> clamps back into the 09:00 – 17:00 window."
        sourcePath="time-field/examples/bounds.example.ts"
      >
        <app-time-field-bounds-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>ForTimeField</code> implements <code>FormValueControl&lt;CalendarDateTime | null&gt;</code>, so a single <code>[formField]</code> binding wires the committed value into the form and pulls validity and touched back out — no <code>ControlValueAccessor</code>."
        sourcePath="time-field/examples/form-field.example.ts"
      >
        <app-time-field-form-field-example />
      </playground-demo>

      <playground-demo
        title="Time range"
        subtitle="<code>ForTimeRangeField</code> is the range variant, shipped from this same entry point. Two labelled endpoint groups share the hour cycle and bounds; each is its own tab stop, so <kbd>Tab</kbd> steps start → end while the arrows move between segments inside one endpoint."
        sourcePath="time-field/examples/range.example.ts"
      >
        <app-time-range-field-default-example />
      </playground-demo>

      <playground-demo
        title="Bounded range"
        subtitle="<code>minTime</code> and <code>maxTime</code> fence both endpoints to a window. Only the time component is compared, so stepping a segment past 18:00 or before 08:00 clamps back in — a booking slot inside business hours, with the <code>start &lt;= end</code> invariant still enforced on top."
        sourcePath="time-field/examples/range-bounds.example.ts"
      >
        <app-time-range-field-bounds-example />
      </playground-demo>

      <playground-demo
        title="Range in Signal Forms"
        subtitle="<code>ForTimeRangeField</code> implements <code>FormValueControl&lt;DateRange | null&gt;</code>, so <code>[formField]</code> binds the committed range into the form and pulls validation back out. A half-entered or out-of-order range keeps <code>value()</code> null, so a <code>required</code> field stays invalid until both endpoints are filled and ordered."
        sourcePath="time-field/examples/range-form-field.example.ts"
      >
        <app-time-range-field-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TimeFieldPage {
  protected readonly readme = readmeContent;
}
