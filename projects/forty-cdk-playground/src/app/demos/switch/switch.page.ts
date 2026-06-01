import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchFormFieldExample } from './examples/form-field.example';
import { SwitchExample } from './examples/switch.example';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SwitchExample, SwitchFormFieldExample],
  template: `
    <primitive-page slug="switch">
      <app-switch-example />
      <app-switch-form-field-example />
    </primitive-page>
  `,
})
export class SwitchPage {}
