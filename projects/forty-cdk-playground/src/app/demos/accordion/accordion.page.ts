import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AccordionExample } from './examples/accordion.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/accordion/README.md';

@Component({
  selector: 'app-accordion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AccordionExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="accordion" [readme]="readme">
      <app-accordion-example />
    </primitive-page>
  `,
})
export class AccordionPage {
  protected readonly readme = readmeContent;
}
