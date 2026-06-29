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
        title="Stand-alone"
        subtitle="Each part is a role=spinbutton: type to fill it and auto-advance, ↑ / ↓ step the focused segment, ← / → move between them, Backspace clears. The locale drives segment order, separators and month names. value() stays null until every segment is filled."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/default.example.ts"
      >
        <app-date-field-default-example />
      </playground-demo>

      <playground-demo
        title="Date & time"
        subtitle="With a time-capable adapter, a granularity coarser than 'day' appends hour / minute segments and the value becomes a CalendarDateTime. A 12-hour cycle adds an AM/PM segment you toggle with ↑ / ↓ or by typing a / p."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/date-time.example.ts"
      >
        <app-date-field-date-time-example />
      </playground-demo>

      <playground-demo
        title="Localized segment labels"
        subtitle="provideForDateFieldDefaults({ segmentLabels }) overrides the accessible name each segment announces, scoped to this injector. A screen reader reads the focused segment as 'día' / 'mes' / 'año' instead of the English default."
        sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/localized.example.ts"
      >
        <app-date-field-localized-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="ForDateField implements FormValueControl<CalendarDate | null>, so a single [formField] binding wires the committed value into the form and pulls validity and touched back out — no ControlValueAccessor."
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
