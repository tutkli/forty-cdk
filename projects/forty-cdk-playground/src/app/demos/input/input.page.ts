import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { InputAutosizeExample } from './examples/autosize.example';
import { InputDefaultExample } from './examples/default.example';
import { InputStatesExample } from './examples/states.example';
import { InputValidationExample } from './examples/validation.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/input.generated';

@Component({
  selector: 'app-input-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    InputDefaultExample,
    InputStatesExample,
    InputAutosizeExample,
    InputValidationExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="input" [doc]="doc">
      <playground-demo hero sourcePath="input/examples/default.example.ts">
        <app-input-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled & read-only"
        subtitle="<code>disabled</code> reflects native <code>disabled</code> plus <code>data-disabled</code> and drops out of submission; <code>readonly</code> keeps the field focusable but blocks edits and reflects <code>data-readonly</code>."
        sourcePath="input/examples/states.example.ts"
      >
        <app-input-states-example />
      </playground-demo>

      <playground-demo
        title="Auto-sizing textarea"
        subtitle="<code>autosize</code> tracks the textarea's content height — growing as you type and shrinking as you delete, recomputed on every edit and on width reflow. Pair it with the reflected <code>data-autosize</code> and <code>resize: none; overflow: hidden</code>. The measurement is browser-only, so it stays inert under SSR."
        sourcePath="input/examples/autosize.example.ts"
      >
        <app-input-autosize-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms validation"
        subtitle="Bound through <code>[formField]</code>, <code>forInput</code> auto-associates inside <code>forField</code> — the label adopts the control id, errors flow into <code>aria-errormessage</code>, and <code>touched</code> / <code>invalid</code> are reflected with no manual id plumbing. Type an invalid address and blur to surface the error."
        sourcePath="input/examples/validation.example.ts"
      >
        <app-input-validation-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class InputPage {
  protected readonly doc = DOC;
}
