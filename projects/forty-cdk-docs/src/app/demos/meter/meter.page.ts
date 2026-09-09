import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { MeterDefaultExample } from './examples/default.example';
import { MeterValueLabelExample } from './examples/value-label.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/meter.generated';

@Component({
  selector: 'app-meter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, MeterDefaultExample, MeterValueLabelExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="meter" [doc]="doc">
      <demo-layout hero sourcePath="meter/examples/default.example.ts">
        <app-meter-default-example />
      </demo-layout>

      <demo-layout
        title="Custom value label"
        subtitle="<code>getValueLabel</code> receives the clamped value, <code>min</code> and <code>max</code> and returns <code>aria-valuetext</code>, so AT announces 'Disk: 200 GB used · 312 GB free' instead of the bare number."
        sourcePath="meter/examples/value-label.example.ts"
      >
        <app-meter-value-label-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class MeterPage {
  protected readonly doc = DOC;
}
