import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ToolbarExample } from './examples/toolbar.example';
import readmeContent from '../../../../../forty-cdk/toolbar/README.md';

@Component({
  selector: 'app-toolbar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ToolbarExample],
  template: `
    <primitive-page slug="toolbar" [readme]="readme">
      <app-toolbar-example />
    </primitive-page>
  `,
})
export class ToolbarPage {
  protected readonly readme = readmeContent;
}
