import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ComboboxAutocompleteExample } from './examples/autocomplete.example';
import { ComboboxDefaultExample } from './examples/default.example';
import { ComboboxMultiChipsExample } from './examples/multi-chips.example';
import { ComboboxObjectValuesExample } from './examples/object-values.example';
import { ComboboxPickerExample } from './examples/picker.example';
import { ComboboxVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/combobox/README.md';

@Component({
  selector: 'app-combobox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ComboboxDefaultExample,
    ComboboxMultiChipsExample,
    ComboboxAutocompleteExample,
    ComboboxPickerExample,
    ComboboxObjectValuesExample,
    ComboboxVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="combobox" [readme]="readme">
      <playground-demo
        title="Filter & select"
        subtitle="An editable input paired with a portaled listbox. Focus never leaves the input — arrow keys move aria-activedescendant, not DOM focus. Filtering is the consumer's job: the query signal drives a computed filter. A clear button shows while there's a value, and an empty-state row announces when nothing matches."
        sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/default.example.ts"
      >
        <app-combobox-default-example />
      </playground-demo>

      <playground-demo
        title="Multi-select with chips"
        subtitle="Pass multiple and render the committed values as chips inside [forComboboxChips]. Each chip has a remove button; Backspace from the empty input jumps to the last chip, and ArrowLeft / ArrowRight navigate between them."
        sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/multi-chips.example.ts"
      >
        <app-combobox-multi-chips-example />
      </playground-demo>

      <playground-demo
        title="Inline autocomplete"
        subtitle="autocompleteMode='both' mirrors aria-autocomplete: the listbox shows filtered options and the rest of the first match is completed inline into the input as selected text, so the next keystroke replaces it. Backspace deletes the selection without re-completing."
        sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/autocomplete.example.ts"
      >
        <app-combobox-autocomplete-example />
      </playground-demo>

      <playground-demo
        title="Picker (trigger + in-panel search)"
        subtitle="The other anatomy: a button shows the committed selection while the search input lives inside the panel. [forComboboxTrigger] opens the panel, becomes the positioning anchor and takes focus back on close; [forComboboxList] carries role=listbox so the input can sit beside it."
        sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/picker.example.ts"
      >
        <app-combobox-picker-example />
      </playground-demo>

      <playground-demo
        title="Object values"
        subtitle="forCombobox is generic over T: bind the whole object to [forComboboxOption][value] and configure three hooks — [isItemEqualToValue] to match by a stable key, [itemToStringLabel] for the visible label, and [itemToFormValue] to serialize what a native form submits. value() holds the full object."
        sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/object-values.example.ts"
      >
        <app-combobox-object-values-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (1,000 options)"
        subtitle="The primitive never owns the scroll container, so it virtualizes with any windowing strategy — here a dependency-free one. The consumer renders only the visible window and wires [totalCount], [visibleRange] and [forComboboxOption][posInSet]; (scrollToIndex) fires when navigation targets a row outside the window."
        sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/virtualized.example.ts"
      >
        <app-combobox-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ComboboxPage {
  protected readonly readme = readmeContent;
}
