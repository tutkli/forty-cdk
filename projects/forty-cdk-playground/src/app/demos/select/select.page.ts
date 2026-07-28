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
import readmeContent from '../../../../../forty-cdk/select/README.md';

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
    <primitive-page slug="select" [readme]="readme">
      <playground-demo hero sourcePath="select/examples/default.example.ts">
        <app-select-default-example />
      </playground-demo>

      <playground-demo
        title="Multi select"
        subtitle="Set <code>multiple</code> and bind <code>[(value)]</code> to a <code>string[]</code>. Clicking an option toggles it in or out and the listbox stays open; <kbd>Tab</kbd>, <kbd>Esc</kbd> or an outside pointer close it."
        sourcePath="select/examples/multiple.example.ts"
      >
        <app-select-multiple-example />
      </playground-demo>

      <playground-demo
        title="macOS-style item alignment"
        subtitle='<code>position="item-aligned"</code> overlays the listbox so the selected option&apos;s vertical center lines up with the trigger, the way native macOS menus open. <code>[collisionPadding]</code> clamps it inside the viewport and exposes the available height as a CSS variable.'
        sourcePath="select/examples/item-aligned.example.ts"
      >
        <app-select-item-aligned-example />
      </playground-demo>

      <playground-demo
        title="Object values & typeahead"
        subtitle="<code>forSelect</code> is generic over <code>T</code>: bind whole objects to <code>[forSelectOption][value]</code>, match them by a stable key with <code>[compareWith]</code>, and serialize what a native form submits with <code>[itemToFormValue]</code>. Typeahead mirrors native <code>&lt;select&gt;</code> — with the listbox open, printable keys jump to the first match."
        sourcePath="select/examples/object-values.example.ts"
      >
        <app-select-object-values-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>forSelect</code> implements <code>FormValueControl&lt;readonly T[]&gt;</code> from <code>@angular/forms/signals</code>, so a single <code>[formField]</code> binding wires the value, validation status and touched flag both ways — no <code>ControlValueAccessor</code>. The field is required and reflects <code>data-invalid</code> / <code>data-touched</code> after a blur without a choice."
        sourcePath="select/examples/form-field.example.ts"
      >
        <app-select-form-field-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (5,000 options)"
        subtitle="Setting <code>[totalCount]</code> switches <code>ForSelect</code> to the virtualized activedescendant model: <code>[forSelectContent]</code> becomes the single <kbd>Tab</kbd> stop and the active option is tracked by <code>aria-activedescendant</code>, so rows recycle as the listbox scrolls. The window is rendered with the library's <code>injectVirtualizer</code> core."
        sourcePath="select/examples/virtualized.example.ts"
      >
        <app-select-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SelectPage {
  protected readonly readme = readmeContent;
}
