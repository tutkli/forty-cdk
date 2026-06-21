import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ButtonBasicExample } from './examples/basic.example';
import { ButtonDisabledExample } from './examples/disabled.example';

@Component({
  selector: 'app-button-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ButtonBasicExample, ButtonDisabledExample],
  template: `
    <primitive-page slug="button">
      <app-button-basic-example />
      <app-button-disabled-example />
    </primitive-page>
  `,
})
export class ButtonPage {}
