import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchExample } from './examples/switch.example';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SwitchExample],
  template: `
    <primitive-page slug="switch">
      <app-switch-example />
    </primitive-page>
  `,
})
export class SwitchPage {}
