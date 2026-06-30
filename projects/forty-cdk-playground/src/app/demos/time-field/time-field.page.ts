import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TimeFieldBoundsExample } from './examples/bounds.example';
import { TimeFieldDefaultExample } from './examples/default.example';
import { TimeFieldFormFieldExample } from './examples/form-field.example';
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
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="time-field" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/default.example.ts"
      >
        <app-time-field-default-example />
      </playground-demo>

      <playground-demo
        title="Bounded time"
        subtitle="<code>minTime</code> and <code>maxTime</code> fence the time-of-day to office hours. Only the time component is compared, so stepping the hour past <code>17:00</code> or before <code>09:00</code> with <kbd>↑</kbd> / <kbd>↓</kbd> clamps back into the 09:00 – 17:00 window."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/bounds.example.ts"
      >
        <app-time-field-bounds-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>ForTimeField</code> implements <code>FormValueControl&lt;CalendarDateTime | null&gt;</code>, so a single <code>[formField]</code> binding wires the committed value into the form and pulls validity and touched back out — no <code>ControlValueAccessor</code>."
        sourcePath="projects/forty-cdk-playground/src/app/demos/time-field/examples/form-field.example.ts"
      >
        <app-time-field-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TimeFieldPage {
  protected readonly readme = readmeContent;
}
