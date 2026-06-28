import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { RadioGroupFormFieldExample } from './examples/form-field.example';
import { RadioGroupExample } from './examples/radio-group.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/radio-group/README.md';

@Component({
  selector: 'app-radio-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, RadioGroupExample, RadioGroupFormFieldExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="radio-group" [readme]="readme">
      <app-radio-group-example />
      <app-radio-group-form-field-example />
    </primitive-page>
  `,
})
export class RadioGroupPage {
  protected readonly readme = readmeContent;
}
