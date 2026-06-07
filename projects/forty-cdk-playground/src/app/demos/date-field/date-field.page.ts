import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DateFieldDateTimeExample } from './examples/date-time.example';
import { DateFieldDateExample } from './examples/date.example';
import { DateFieldLocalizedExample } from './examples/localized.example';

@Component({
  selector: 'app-date-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DateFieldDateExample,
    DateFieldDateTimeExample,
    DateFieldLocalizedExample,
  ],
  template: `
    <primitive-page slug="date-field">
      <app-date-field-date-example />
      <app-date-field-date-time-example />
      <app-date-field-localized-example />
    </primitive-page>
  `,
})
export class DateFieldPage {}
