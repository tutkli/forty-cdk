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
      <playground-demo hero sourcePath="button/examples/default.example.ts">
        <app-button-default-example />
      </playground-demo>

      <playground-demo
        title="Disabled stays focusable"
        subtitle="Per the APG, a disabled button must stay reachable so assistive tech can announce it. <code>forButton</code> never sets the native <code>disabled</code> attribute — it reflects <code>aria-disabled='true'</code> + <code>data-disabled</code> and makes activation a no-op. The native disabled button is skipped entirely."
        sourcePath="button/examples/disabled.example.ts"
      >
        <app-button-disabled-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ButtonPage {
  protected readonly readme = readmeContent;
}
