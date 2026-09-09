import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { RadioGroupDefaultExample } from './examples/default.example';
import { RadioGroupFormFieldExample } from './examples/form-field.example';
import { RadioGroupHorizontalExample } from './examples/horizontal.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/radio-group.generated';

@Component({
  selector: 'app-radio-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    RadioGroupDefaultExample,
    RadioGroupHorizontalExample,
    RadioGroupFormFieldExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="radio-group" [doc]="doc">
      <playground-demo hero sourcePath="radio-group/examples/default.example.ts">
        <app-radio-group-default-example />
      </playground-demo>

      <playground-demo
        title="Horizontal orientation"
        subtitle="<code>orientation='horizontal'</code> reflects <code>data-orientation</code> and switches arrow navigation to <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> (swapped in RTL)."
        sourcePath="radio-group/examples/horizontal.example.ts"
      >
        <app-radio-group-horizontal-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>forRadioGroup</code> implements <code>FormValueControl&lt;string | null&gt;</code>, so <code>[formField]</code> binds the selected value into the form and surfaces validity back. This field is required: <kbd>Tab</kbd> through without choosing and the group reflects <code>data-invalid</code> / <code>data-touched</code> once focus leaves it."
        sourcePath="radio-group/examples/form-field.example.ts"
      >
        <app-radio-group-form-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class RadioGroupPage {
  protected readonly doc = DOC;
}
