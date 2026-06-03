import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TimeFieldBoundsExample } from './examples/bounds.example';
import { TimeFieldTimeExample } from './examples/time.example';

@Component({
  selector: 'app-time-field-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TimeFieldTimeExample, TimeFieldBoundsExample],
  template: `
    <primitive-page slug="time-field">
      <app-time-field-time-example />
      <app-time-field-bounds-example />
    </primitive-page>
  `,
})
export class TimeFieldPage {}
