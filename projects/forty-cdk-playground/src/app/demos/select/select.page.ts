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
      <playground-demo
        title="Single select with groups"
        subtitle="A button trigger that opens a portaled listbox (role combobox + listbox + option), built on the select-only combobox APG pattern. Options are grouped with a separator, and the checkmark indicator mirrors each option's data-state. The surface portals to <body>, so its styles are colocated here via ViewEncapsulation.None."
        sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/default.example.ts"
      >
        <app-select-default-example />
      </playground-demo>

      <playground-demo
        title="Multi select"
        subtitle="Set multiple and bind [(value)] to a string[]. Clicking an option toggles it in or out and the listbox stays open; Tab, Escape or an outside pointer close it."
        sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/multiple.example.ts"
      >
        <app-select-multiple-example />
      </playground-demo>

      <playground-demo
        title="macOS-style item alignment"
        subtitle="position='item-aligned' overlays the listbox so the selected option's vertical center lines up with the trigger, the way native macOS menus open. collisionPadding clamps it inside the viewport and exposes the available height as a CSS variable."
        sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/item-aligned.example.ts"
      >
        <app-select-item-aligned-example />
      </playground-demo>

      <playground-demo
        title="Object values & typeahead"
        subtitle="forSelect is generic over T: bind whole objects to [forSelectOption][value], match them by a stable key with [isItemEqualToValue], and serialize what a native form submits with [itemToFormValue]. Typeahead mirrors native <select> — with the listbox open, printable keys jump to the first match."
        sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/object-values.example.ts"
      >
        <app-select-object-values-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="forSelect implements FormValueControl<readonly T[]> from @angular/forms/signals, so a single [formField] binding wires the value, validation status and touched flag both ways — no ControlValueAccessor. The field is required and reflects data-invalid / data-touched after a blur without a choice."
        sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/form-field.example.ts"
      >
        <app-select-form-field-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (5,000 options)"
        subtitle="Setting [totalCount] switches ForSelect to the virtualized activedescendant model: [forSelectContent] becomes the single Tab stop and the active option is tracked by aria-activedescendant, so rows recycle as the listbox scrolls. The window is rendered with the library's injectVirtualizer core."
        sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/virtualized.example.ts"
      >
        <app-select-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SelectPage {
  protected readonly readme = readmeContent;
}
