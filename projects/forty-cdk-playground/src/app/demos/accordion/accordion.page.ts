import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AccordionExample } from './examples/accordion.example';
import readmeContent from '../../../../../forty-cdk/accordion/README.md';

@Component({
  selector: 'app-accordion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AccordionExample],
  template: `
    <primitive-page slug="accordion" [readme]="readme">
      <app-accordion-example />
    </primitive-page>
  `,
})
export class AccordionPage {
  protected readonly readme = readmeContent;
}
