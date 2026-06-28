import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DateFieldDateTimeExample } from './examples/date-time.example';
import { DateFieldDateExample } from './examples/date.example';
import { DateFieldLocalizedExample } from './examples/localized.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/date-field/README.md';

@Component({
  selector: 'app-date-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DateFieldDateExample,
    DateFieldDateTimeExample,
    DateFieldLocalizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="date-field" [readme]="readme">
      <app-date-field-date-example />
      <app-date-field-date-time-example />
      <app-date-field-localized-example />
    </primitive-page>
  `,
})
export class DateFieldPage {
  protected readonly readme = readmeContent;
}
