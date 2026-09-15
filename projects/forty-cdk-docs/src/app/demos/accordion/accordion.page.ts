import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { AccordionDefaultExample } from './examples/default.example';
import { AccordionDisabledItemExample } from './examples/disabled-item.example';
import { AccordionHorizontalExample } from './examples/horizontal.example';
import { AccordionMultipleExample } from './examples/multiple.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/accordion.generated';

@Component({
  selector: 'app-accordion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    AccordionDefaultExample,
    AccordionMultipleExample,
    AccordionHorizontalExample,
    AccordionDisabledItemExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="accordion" [doc]="doc">
      <demo-layout hero sourcePath="accordion/examples/default.example.ts">
        <app-accordion-default-example />
      </demo-layout>

      <demo-layout heading="multiple" sourcePath="accordion/examples/multiple.example.ts">
        <app-accordion-multiple-example />
      </demo-layout>

      <demo-layout heading="horizontal" sourcePath="accordion/examples/horizontal.example.ts">
        <app-accordion-horizontal-example />
      </demo-layout>

      <demo-layout heading="disabled-item" sourcePath="accordion/examples/disabled-item.example.ts">
        <app-accordion-disabled-item-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class AccordionPage {
  protected readonly doc = DOC;
}
