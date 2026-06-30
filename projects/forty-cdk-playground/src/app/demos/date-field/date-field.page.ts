import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DateFieldDateTimeExample } from './examples/date-time.example';
import { DateFieldDefaultExample } from './examples/default.example';
import { DateFieldFormFieldExample } from './examples/form-field.example';
import { DateFieldLocalizedExample } from './examples/localized.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/date-field/README.md';

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
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-field" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/default.example.ts"
      >
        <app-date-field-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time"
        subtitle="With a time-capable adapter, a <code>granularity</code> coarser than <code>'day'</code> appends hour / minute segments and the value becomes a <code>CalendarDateTime</code>. A 12-hour cycle adds an AM/PM segment you toggle with <kbd>↑</kbd> / <kbd>↓</kbd> or by typing <kbd>a</kbd> / <kbd>p</kbd>."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/date-time.example.ts"
      >
        <app-date-field-date-time-example />
      </playground-demo>

      <playground-demo
        title="Localized segment labels"
        subtitle="<code>provideForDateFieldDefaults({ segmentLabels })</code> overrides the accessible name each segment announces, scoped to this injector. A screen reader reads the focused segment as 'día' / 'mes' / 'año' instead of the English default."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/localized.example.ts"
      >
        <app-date-field-localized-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>ForDateField</code> implements <code>FormValueControl&lt;CalendarDate | null&gt;</code>, so a single <code>[formField]</code> binding wires the committed value into the form and pulls validity and touched back out — no <code>ControlValueAccessor</code>."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/form-field.example.ts"
      >
        <app-date-field-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DateFieldPage {
  protected readonly readme = readmeContent;
}
