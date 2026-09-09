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
      <playground-demo hero sourcePath="accordion/examples/default.example.ts">
        <app-accordion-default-example />
      </playground-demo>

      <playground-demo
        title="Multiple"
        subtitle="<code>multiple</code> lets several sections stay open at once, so <code>value</code> holds an array of every open item."
        sourcePath="accordion/examples/multiple.example.ts"
      >
        <app-accordion-multiple-example />
      </playground-demo>

      <playground-demo
        title="Horizontal"
        subtitle="<code>orientation='horizontal'</code> lays the sections out in a row and switches roving navigation to <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd>. It is reflected as <code>data-orientation</code> for styling."
        sourcePath="accordion/examples/horizontal.example.ts"
      >
        <app-accordion-horizontal-example />
      </playground-demo>

      <playground-demo
        title="Disabled item"
        subtitle="A disabled item cannot be toggled and is skipped by the arrow keys, while staying in the DOM for screen readers."
        sourcePath="accordion/examples/disabled-item.example.ts"
      >
        <app-accordion-disabled-item-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class AccordionPage {
  protected readonly doc = DOC;
}
