import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ButtonDefaultExample } from './examples/default.example';
import { ButtonDisabledExample } from './examples/disabled.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/button/README.md';

@Component({
  selector: 'app-button-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, ButtonDefaultExample, ButtonDisabledExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="button" [readme]="readme">
      <playground-demo
        title="Native and custom hosts"
        subtitle="forButton turns any element into an accessible button. On a native <button> the platform owns Enter / Space; on a <span> the directive adds role='button', tabindex='0' and keyboard activation. Both fire a single (activate) output."
        sourcePath="projects/forty-cdk-playground/src/app/demos/button/examples/default.example.ts"
      >
        <app-button-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled stays focusable"
        subtitle="Per the APG, a disabled button must stay reachable so assistive tech can announce it. forButton never sets the native disabled attribute — it reflects aria-disabled='true' + data-disabled and makes activation a no-op. The native disabled button is skipped entirely."
        sourcePath="projects/forty-cdk-playground/src/app/demos/button/examples/disabled.example.ts"
      >
        <app-button-disabled-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ButtonPage {
  protected readonly readme = readmeContent;
}
