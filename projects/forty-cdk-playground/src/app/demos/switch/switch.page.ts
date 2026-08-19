import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SwitchDefaultExample } from './examples/default.example';
import { SwitchDisabledExample } from './examples/disabled.example';
import { SwitchFormFieldExample } from './examples/form-field.example';
import { SwitchReadOnlyExample } from './examples/read-only.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/switch.generated';

@Component({
  selector: 'app-switch-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    SwitchDefaultExample,
    SwitchDisabledExample,
    SwitchReadOnlyExample,
    SwitchFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="switch" [doc]="doc">
      <playground-demo hero sourcePath="switch/examples/default.example.ts">
        <app-switch-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> ignores clicks and keyboard activation but keeps the switch focusable (per APG); it reflects <code>aria-disabled</code> and <code>data-disabled</code>."
        sourcePath="switch/examples/disabled.example.ts"
      >
        <app-switch-disabled-example />
      </playground-demo>

      <playground-demo
        title="Read-only"
        subtitle="<code>readonly</code> keeps the switch focusable and announced but blocks toggling; it reflects <code>aria-readonly</code> and <code>data-readonly</code>."
        sourcePath="switch/examples/read-only.example.ts"
      >
        <app-switch-read-only-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>forSwitch</code> implements <code>FormCheckboxControl</code>, so a single <code>[formField]</code> binding wires checked state, validity and touched both ways — no <code>ControlValueAccessor</code>."
        sourcePath="switch/examples/form-field.example.ts"
      >
        <app-switch-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SwitchPage {
  protected readonly doc = DOC;
}
