import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { MeterDefaultExample } from './examples/default.example';
import { MeterValueLabelExample } from './examples/value-label.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/meter/README.md';

@Component({
  selector: 'app-meter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, MeterDefaultExample, MeterValueLabelExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="meter" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/meter/examples/default.example.ts"
      >
        <app-meter-default-example />
      </playground-demo>

      <playground-demo
        title="Custom value label"
        subtitle="<code>getValueLabel</code> receives the clamped value, <code>min</code> and <code>max</code> and returns <code>aria-valuetext</code>, so AT announces 'Disk: 200 GB used · 312 GB free' instead of the bare number."
        sourcePath="projects/forty-cdk-playground/src/app/demos/meter/examples/value-label.example.ts"
      >
        <app-meter-value-label-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class MeterPage {
  protected readonly readme = readmeContent;
}
