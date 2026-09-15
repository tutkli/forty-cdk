import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SelectDefaultExample } from './examples/default.example';
import { SelectFormFieldExample } from './examples/form-field.example';
import { SelectItemAlignedExample } from './examples/item-aligned.example';
import { SelectMultipleExample } from './examples/multiple.example';
import { SelectObjectValuesExample } from './examples/object-values.example';
import { SelectVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/select.generated';

@Component({
  selector: 'app-select-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    SelectDefaultExample,
    SelectMultipleExample,
    SelectItemAlignedExample,
    SelectObjectValuesExample,
    SelectFormFieldExample,
    SelectVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="select" [doc]="doc">
      <demo-layout hero sourcePath="select/examples/default.example.ts">
        <app-select-default-example />
      </demo-layout>

      <demo-layout heading="multi-select" sourcePath="select/examples/multiple.example.ts">
        <app-select-multiple-example />
      </demo-layout>

      <demo-layout
        heading="macos-style-item-alignment"
        sourcePath="select/examples/item-aligned.example.ts"
      >
        <app-select-item-aligned-example />
      </demo-layout>

      <demo-layout
        heading="object-values--typeahead"
        sourcePath="select/examples/object-values.example.ts"
      >
        <app-select-object-values-example />
      </demo-layout>

      <demo-layout heading="signal-forms" sourcePath="select/examples/form-field.example.ts">
        <app-select-form-field-example />
      </demo-layout>

      <demo-layout
        heading="virtualized-5000-options"
        sourcePath="select/examples/virtualized.example.ts"
      >
        <app-select-virtualized-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class SelectPage {
  protected readonly doc = DOC;
}
