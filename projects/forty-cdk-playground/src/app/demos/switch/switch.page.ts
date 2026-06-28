import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchFormFieldExample } from './examples/form-field.example';
import { SwitchExample } from './examples/switch.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/switch/README.md';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SwitchExample, SwitchFormFieldExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="switch" [readme]="readme">
      <app-switch-example />
      <app-switch-form-field-example />
    </primitive-page>
  `,
})
export class SwitchPage {
  protected readonly readme = readmeContent;
}
