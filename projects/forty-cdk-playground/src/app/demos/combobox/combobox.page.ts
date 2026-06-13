import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ComboboxExample } from './examples/combobox.example';
import { ComboboxObjectValuesExample } from './examples/object-values.example';
import { ComboboxPickerExample } from './examples/picker.example';
import { ComboboxVirtualizedExample } from './examples/virtualized.example';

@Component({
  selector: 'app-combobox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    ComboboxExample,
    ComboboxPickerExample,
    ComboboxObjectValuesExample,
    ComboboxVirtualizedExample,
  ],
  template: `
    <primitive-page slug="combobox">
      <app-combobox-example />
      <app-combobox-picker-example />
      <app-combobox-object-values-example />
      <app-combobox-virtualized-example />
    </primitive-page>
  `,
})
export class ComboboxPage {}
