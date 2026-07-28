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
    ComboboxCreateActionExample,
    ComboboxPickerExample,
    ComboboxObjectValuesExample,
    ComboboxVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="combobox" [readme]="readme">
      <playground-demo hero sourcePath="combobox/examples/default.example.ts">
        <app-combobox-default-example />
      </playground-demo>

      <playground-demo
        title="Multi-select with chips"
        subtitle="Pass <code>multiple</code> and render the committed values as chips inside <code>[forComboboxChips]</code>. Each chip has a remove button; <kbd>Backspace</kbd> from the empty input jumps to the last chip, and <kbd>←</kbd> / <kbd>→</kbd> navigate between them."
        sourcePath="combobox/examples/multi-chips.example.ts"
      >
        <app-combobox-multi-chips-example />
      </playground-demo>

      <playground-demo
        title="Inline autocomplete"
        subtitle="<code>autocompleteMode='both'</code> mirrors <code>aria-autocomplete</code>: the listbox shows filtered options and the rest of the first match is completed inline into the input as selected text, so the next keystroke replaces it. <kbd>Backspace</kbd> deletes the selection without re-completing."
        sourcePath="combobox/examples/autocomplete.example.ts"
      >
        <app-combobox-autocomplete-example />
      </playground-demo>

      <playground-demo
        title="Action item (create on the fly)"
        subtitle="A pinned <code>[forComboboxAction]</code> is a <code>role=button</code> affordance — not an option — so it never lands in <code>value()</code>, <code>aria-setsize</code> or <code>aria-posinset</code>. It emits <code>(activate)</code> on click / <kbd>Enter</kbd> / <kbd>Space</kbd>, and <kbd>Tab</kbd> reaches it in one keypress regardless of list length; <kbd>Escape</kbd> or an outside click still dismiss."
        sourcePath="combobox/examples/create-action.example.ts"
      >
        <app-combobox-create-action-example />
      </playground-demo>

      <playground-demo
        title="Picker (trigger + in-panel search)"
        subtitle="The other anatomy: a button shows the committed selection while the search input lives inside the panel. <code>[forComboboxTrigger]</code> opens the panel, becomes the positioning anchor and takes focus back on close; <code>[forComboboxList]</code> carries <code>role=listbox</code> so the input can sit beside it."
        sourcePath="combobox/examples/picker.example.ts"
      >
        <app-combobox-picker-example />
      </playground-demo>

      <playground-demo
        title="Object values"
        subtitle="<code>forCombobox</code> is generic over <code>T</code>: bind the whole object to <code>[forComboboxOption][value]</code> and configure three hooks — <code>[compareWith]</code> to match by a stable key, <code>[itemToStringLabel]</code> for the visible label, and <code>[itemToFormValue]</code> to serialize what a native form submits. <code>value()</code> holds the full object."
        sourcePath="combobox/examples/object-values.example.ts"
      >
        <app-combobox-object-values-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (1,000 options)"
        subtitle="The primitive never owns the scroll container, so it virtualizes with any windowing strategy — here a dependency-free one. The consumer renders only the visible window and wires <code>[totalCount]</code>, <code>[visibleRange]</code> and <code>[forComboboxOption][posInSet]</code>; <code>(scrollToIndex)</code> fires when navigation targets a row outside the window."
        sourcePath="combobox/examples/virtualized.example.ts"
      >
        <app-combobox-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ComboboxPage {
  protected readonly readme = readmeContent;
}
