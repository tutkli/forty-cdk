import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ComboboxAutocompleteExample } from './examples/autocomplete.example';
import { ComboboxCreateActionExample } from './examples/create-action.example';
import { ComboboxDefaultExample } from './examples/default.example';
import { ComboboxMultiChipsExample } from './examples/multi-chips.example';
import { ComboboxObjectValuesExample } from './examples/object-values.example';
import { ComboboxPickerExample } from './examples/picker.example';
import { ComboboxVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/combobox.generated';

@Component({
  selector: 'app-combobox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ComboboxDefaultExample,
    ComboboxMultiChipsExample,
    ComboboxAutocompleteExample,
    ComboboxCreateActionExample,
    ComboboxPickerExample,
    ComboboxObjectValuesExample,
    ComboboxVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="combobox" [doc]="doc">
      <demo-layout hero sourcePath="combobox/examples/default.example.ts">
        <app-combobox-default-example />
      </demo-layout>

      <demo-layout
        heading="multi-select-with-chips"
        sourcePath="combobox/examples/multi-chips.example.ts"
      >
        <app-combobox-multi-chips-example />
      </demo-layout>

      <demo-layout
        heading="inline-autocomplete"
        sourcePath="combobox/examples/autocomplete.example.ts"
      >
        <app-combobox-autocomplete-example />
      </demo-layout>

      <demo-layout
        heading="action-item-create-on-the-fly"
        sourcePath="combobox/examples/create-action.example.ts"
      >
        <app-combobox-create-action-example />
      </demo-layout>

      <demo-layout
        heading="picker-trigger--in-panel-search"
        sourcePath="combobox/examples/picker.example.ts"
      >
        <app-combobox-picker-example />
      </demo-layout>

      <demo-layout heading="object-values" sourcePath="combobox/examples/object-values.example.ts">
        <app-combobox-object-values-example />
      </demo-layout>

      <demo-layout
        heading="virtualized-1000-options"
        sourcePath="combobox/examples/virtualized.example.ts"
      >
        <app-combobox-virtualized-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ComboboxPage {
  protected readonly doc = DOC;
}
