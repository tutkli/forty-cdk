import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { RadioGroupExample } from './examples/radio-group.example';

@Component({
  selector: 'app-radio-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, RadioGroupExample],
  template: `
    <primitive-page slug="radio-group">
      <app-radio-group-example />
    </primitive-page>
  `,
})
export class RadioGroupPage {}
