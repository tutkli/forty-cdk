import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { CheckboxDefaultExample } from './examples/default.example';
import { CheckboxFormFieldExample } from './examples/form-field.example';
import { CheckboxSelectAllExample } from './examples/select-all.example';
import { CheckboxStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/checkbox.generated';

@Component({
  selector: 'app-checkbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    CheckboxDefaultExample,
    CheckboxSelectAllExample,
    CheckboxStatesExample,
    CheckboxFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="checkbox" [doc]="doc">
      <demo-layout hero sourcePath="checkbox/examples/default.example.ts">
        <app-checkbox-default-example />
      </demo-layout>

      <demo-layout
        title="Tri-state (select all)"
        subtitle="A parent checkbox reflects <code>indeterminate</code> when only some children are selected. Activating it selects or clears them all at once, matching native inputs."
        sourcePath="checkbox/examples/select-all.example.ts"
      >
        <app-checkbox-select-all-example />
      </demo-layout>

      <demo-layout
        title="States"
        subtitle="One class and one directive, three states. <code>disabled</code> and <code>readonly</code> both keep the box focusable and announced (per APG) while click and <kbd>Space</kbd> are a no-op; they reflect <code>data-disabled</code> and <code>data-readonly</code>, which is all the stylesheet below keys on."
        sourcePath="checkbox/examples/states.example.ts"
      >
        <app-checkbox-states-example />
      </demo-layout>

      <demo-layout
        title="Signal Forms"
        subtitle="<code>forCheckbox</code> implements <code>FormCheckboxControl</code>, so a single <code>[formField]</code> binding wires the binary <code>checked</code> value into the form and pulls validity back out. The box is required: blur it unchecked and it reflects <code>data-invalid</code> / <code>data-touched</code>."
        sourcePath="checkbox/examples/form-field.example.ts"
      >
        <app-checkbox-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class CheckboxPage {
  protected readonly doc = DOC;
}
