import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TabsExample } from './examples/tabs.example';

@Component({
  selector: 'app-tabs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TabsExample],
  template: `
    <primitive-page slug="tabs">
      <app-tabs-example />
    </primitive-page>
  `,
})
export class TabsPage {}
