import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AccordionExample } from './examples/accordion.example';

@Component({
  selector: 'app-accordion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AccordionExample],
  template: `
    <primitive-page slug="accordion">
      <app-accordion-example />
    </primitive-page>
  `,
})
export class AccordionPage {}
