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
      <playground-demo
        title="Standalone Toggle"
        subtitle="A standalone two-state button (aria-pressed). Toggle it with click, Enter or Space; data-state reflects the pressed state for styling."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toggle/examples/default.example.ts"
      >
        <app-toggle-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="A disabled toggle stays focusable (per APG) — it reflects aria-disabled and data-disabled rather than the native disabled attribute, so assistive tech still announces it while interaction is a no-op."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toggle/examples/disabled.example.ts"
      >
        <app-toggle-disabled-example />
      </playground-demo>

      <playground-demo
        title="ToggleGroup"
        subtitle="A group of toggles with roving tabindex. In multiple mode each item toggles independently; arrows only move focus — selection needs Space / Enter or click."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toggle/examples/group.example.ts"
      >
        <app-toggle-group-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="ForToggleGroup implements FormValueControl<readonly string[]>, so [formField] binds the pressed-values array to a form field. This single-select alignment group is required: clearing the choice and blurring marks the group data-invalid / data-touched."
        sourcePath="projects/forty-cdk-playground/src/app/demos/toggle/examples/form-field.example.ts"
      >
        <app-toggle-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TogglePage {
  protected readonly readme = readmeContent;
}
