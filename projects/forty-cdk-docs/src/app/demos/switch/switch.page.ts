import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchDefaultExample } from './examples/default.example';
import { SwitchFormFieldExample } from './examples/form-field.example';
import { SwitchStatesExample } from './examples/states.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/switch.generated';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    SwitchDefaultExample,
    SwitchStatesExample,
    SwitchFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="switch" [doc]="doc">
      <demo-layout hero sourcePath="switch/examples/default.example.ts">
        <app-switch-default-example />
      </demo-layout>

      <demo-layout
        title="States"
        subtitle="One class and one directive, three states. <code>disabled</code> and <code>readonly</code> both keep the switch focusable and announced (per APG) while interaction is a no-op; they reflect <code>aria-disabled</code> / <code>data-disabled</code> and <code>aria-readonly</code> / <code>data-readonly</code>, which is all the stylesheet below keys on."
        sourcePath="switch/examples/states.example.ts"
      >
        <app-switch-states-example />
      </demo-layout>

      <demo-layout
        title="Signal Forms"
        subtitle="<code>forSwitch</code> implements <code>FormCheckboxControl</code>, so a single <code>[formField]</code> binding wires checked state, validity and touched both ways — no <code>ControlValueAccessor</code>."
        sourcePath="switch/examples/form-field.example.ts"
      >
        <app-switch-form-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class SwitchPage {
  protected readonly doc = DOC;
}
