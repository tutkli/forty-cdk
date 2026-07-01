import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CheckboxDefaultExample } from './examples/default.example';
import { CheckboxDisabledExample } from './examples/disabled.example';
import { CheckboxFormFieldExample } from './examples/form-field.example';
import { CheckboxSelectAllExample } from './examples/select-all.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/checkbox/README.md';

@Component({
  selector: 'app-checkbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    CheckboxDefaultExample,
    CheckboxSelectAllExample,
    CheckboxDisabledExample,
    CheckboxFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="checkbox" [readme]="readme">
      <playground-demo hero sourcePath="checkbox/examples/default.example.ts">
        <app-checkbox-default-example />
      </playground-demo>

      <playground-demo
        title="Tri-state (select all)"
        subtitle="A parent checkbox reflects <code>indeterminate</code> when only some children are selected. Activating it selects or clears them all at once, matching native inputs."
        sourcePath="checkbox/examples/select-all.example.ts"
      >
        <app-checkbox-select-all-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> keeps the checkbox focusable and announced (per APG) but makes click a no-op, and reflects <code>data-disabled</code>."
        sourcePath="checkbox/examples/disabled.example.ts"
      >
        <app-checkbox-disabled-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>forCheckbox</code> implements <code>FormCheckboxControl</code>, so a single <code>[formField]</code> binding wires the binary <code>checked</code> value into the form and pulls validity back out. The box is required: blur it unchecked and it reflects <code>data-invalid</code> / <code>data-touched</code>."
        sourcePath="checkbox/examples/form-field.example.ts"
      >
        <app-checkbox-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class CheckboxPage {
  protected readonly readme = readmeContent;
}
