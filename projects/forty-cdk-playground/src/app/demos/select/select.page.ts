import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SelectExample } from './examples/select.example';
import { SelectFormFieldExample } from './examples/form-field.example';
import { SelectTypeaheadExample } from './examples/typeahead.example';
import { SelectVirtualizedExample } from './examples/virtualized.example';
import readmeContent from '../../../../../forty-cdk/select/README.md';

@Component({
  selector: 'app-select-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    SelectExample,
    SelectTypeaheadExample,
    SelectFormFieldExample,
    SelectVirtualizedExample,
  ],
  template: `
    <primitive-page slug="select" [readme]="readme">
      <app-select-example />
      <app-select-typeahead-example />
      <app-select-form-field-example />
      <app-select-virtualized-example />
    </primitive-page>
  `,
})
export class SelectPage {
  protected readonly readme = readmeContent;
}
