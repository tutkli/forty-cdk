import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DisclosureExample } from './examples/disclosure.example';
import readmeContent from '../../../../../forty-cdk/disclosure/README.md';

@Component({
  selector: 'app-disclosure-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DisclosureExample],
  template: `
    <primitive-page slug="disclosure" [readme]="readme">
      <app-disclosure-example />
    </primitive-page>
  `,
})
export class DisclosurePage {
  protected readonly readme = readmeContent;
}
