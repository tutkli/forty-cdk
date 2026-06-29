import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { InputAutosizeExample } from './examples/autosize.example';
import { InputDefaultExample } from './examples/default.example';
import { InputStatesExample } from './examples/states.example';
import { InputValidationExample } from './examples/validation.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/input/README.md';

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
    <primitive-page slug="input" [readme]="readme">
      <playground-demo
        title="Text & textarea"
        subtitle="forInput and forTextarea are plain attribute directives that own a string value() and reflect form state as aria-* / data-*. They ship no styles — the data-empty / data-disabled / data-readonly / data-invalid hooks drive the look."
        sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/default.example.ts"
      >
        <app-input-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled & read-only"
        subtitle="disabled reflects native disabled plus data-disabled and drops out of submission; readonly keeps the field focusable but blocks edits and reflects data-readonly."
        sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/states.example.ts"
      >
        <app-input-states-example />
      </playground-demo>

      <playground-demo
        title="Auto-sizing textarea"
        subtitle="autosize tracks the textarea's content height — growing as you type and shrinking as you delete, recomputed on every edit and on width reflow. Pair it with the reflected data-autosize and resize: none; overflow: hidden. The measurement is browser-only, so it stays inert under SSR."
        sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/autosize.example.ts"
      >
        <app-input-autosize-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms validation"
        subtitle="Bound through [formField], forInput auto-associates inside forField — the label adopts the control id, errors flow into aria-errormessage, and touched / invalid are reflected with no manual id plumbing. Type an invalid address and blur to surface the error."
        sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/validation.example.ts"
      >
        <app-input-validation-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class InputPage {
  protected readonly readme = readmeContent;
}
