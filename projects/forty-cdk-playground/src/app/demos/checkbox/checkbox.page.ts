import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { CheckboxExample } from './examples/checkbox.example';

@Component({
  selector: 'app-checkbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, CheckboxExample],
  template: `
    <primitive-page slug="checkbox">
      <app-checkbox-example />
    </primitive-page>
  `,
})
export class CheckboxPage {}
