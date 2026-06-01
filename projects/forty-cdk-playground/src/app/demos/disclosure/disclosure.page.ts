import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DisclosureExample } from './examples/disclosure.example';

@Component({
  selector: 'app-disclosure-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DisclosureExample],
  template: `
    <primitive-page slug="disclosure">
      <app-disclosure-example />
    </primitive-page>
  `,
})
export class DisclosurePage {}
