import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TimeRangeFieldBoundsExample } from './examples/bounds.example';
import { TimeRangeFieldTimeExample } from './examples/time.example';

@Component({
  selector: 'app-time-range-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TimeRangeFieldTimeExample, TimeRangeFieldBoundsExample],
  template: `
    <primitive-page slug="time-range-field">
      <app-time-range-field-time-example />
      <app-time-range-field-bounds-example />
    </primitive-page>
  `,
})
export class TimeRangeFieldPage {}
