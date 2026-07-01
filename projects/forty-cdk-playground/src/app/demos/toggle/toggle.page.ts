import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ToggleDefaultExample } from './examples/default.example';
import { ToggleDisabledExample } from './examples/disabled.example';
import { ToggleFormFieldExample } from './examples/form-field.example';
import { ToggleGroupExample } from './examples/group.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/toggle/README.md';

@Component({
  selector: 'app-toggle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ToggleDefaultExample,
    ToggleDisabledExample,
    ToggleGroupExample,
    ToggleFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="toggle" [readme]="readme">
      <playground-demo hero sourcePath="toggle/examples/default.example.ts">
        <app-toggle-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="A disabled toggle stays focusable (per APG) — it reflects <code>aria-disabled</code> and <code>data-disabled</code> rather than the native <code>disabled</code> attribute, so assistive tech still announces it while interaction is a no-op."
        sourcePath="toggle/examples/disabled.example.ts"
      >
        <app-toggle-disabled-example />
      </playground-demo>

      <playground-demo
        title="ToggleGroup"
        subtitle="A group of toggles with roving tabindex. In <code>multiple</code> mode each item toggles independently; arrows only move focus — selection needs <kbd>Space</kbd> / <kbd>Enter</kbd> or click."
        sourcePath="toggle/examples/group.example.ts"
      >
        <app-toggle-group-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>ForToggleGroup</code> implements <code>FormValueControl&lt;readonly string[]&gt;</code>, so <code>[formField]</code> binds the pressed-values array to a form field. This single-select alignment group is required: clearing the choice and blurring marks the group <code>data-invalid</code> / <code>data-touched</code>."
        sourcePath="toggle/examples/form-field.example.ts"
      >
        <app-toggle-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TogglePage {
  protected readonly readme = readmeContent;
}
