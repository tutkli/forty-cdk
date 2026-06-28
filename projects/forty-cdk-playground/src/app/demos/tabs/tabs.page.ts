import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TabsExample } from './examples/tabs.example';
import readmeContent from '../../../../../forty-cdk/tabs/README.md';

@Component({
  selector: 'app-tabs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TabsExample],
  template: `
    <primitive-page slug="tabs" [readme]="readme">
      <app-tabs-example />
    </primitive-page>
  `,
})
export class TabsPage {
  protected readonly readme = readmeContent;
}
