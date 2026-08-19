import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { NumberInputDefaultExample } from './examples/default.example';
import { NumberInputDisabledExample } from './examples/disabled.example';
import { NumberInputFormattingExample } from './examples/formatting.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/number-input.generated';

@Component({
  selector: 'app-number-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    NumberInputDefaultExample,
    NumberInputDisabledExample,
    NumberInputFormattingExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="number-input" [doc]="doc">
      <playground-demo hero sourcePath="number-input/examples/default.example.ts">
        <app-number-input-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="<code>disabled</code> reflects <code>data-disabled</code> on the spinbutton and both stepper buttons, removes the control from the tab order, and ignores the keyboard."
        sourcePath="number-input/examples/disabled.example.ts"
      >
        <app-number-input-disabled-example />
      </playground-demo>

      <playground-demo
        title="Formatting & precision"
        subtitle="<code>formatOptions</code> feeds an <code>Intl.NumberFormat</code> that renders the displayed text and <code>aria-valuetext</code>, while <code>value()</code> stays a raw number. The <code>locale</code> drives both formatting and parsing; a hidden input submits the raw number, not the formatted string."
        sourcePath="number-input/examples/formatting.example.ts"
      >
        <app-number-input-formatting-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class NumberInputPage {
  protected readonly doc = DOC;
}
