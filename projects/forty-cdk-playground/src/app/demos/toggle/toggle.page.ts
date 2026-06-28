import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ToggleFormFieldExample } from './examples/form-field.example';
import { ToggleExample } from './examples/toggle.example';
import readmeContent from '../../../../../forty-cdk/toggle/README.md';

@Component({
  selector: 'app-toggle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ToggleExample, ToggleFormFieldExample],
  template: `
    <primitive-page slug="toggle" [readme]="readme">
      <app-toggle-example />
      <app-toggle-form-field-example />
    </primitive-page>
  `,
})
export class TogglePage {
  protected readonly readme = readmeContent;
}
