import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { PaneResizerCollapsibleExample } from './examples/collapsible.example';
import { PaneResizerResizeExample } from './examples/resize.example';
import readmeContent from '../../../../../forty-cdk/pane-resizer/README.md';

@Component({
  selector: 'app-pane-resizer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, PaneResizerResizeExample, PaneResizerCollapsibleExample],
  template: `
    <primitive-page slug="pane-resizer" [readme]="readme">
      <app-pane-resizer-resize-example />
      <app-pane-resizer-collapsible-example />
    </primitive-page>
  `,
})
export class PaneResizerPage {
  protected readonly readme = readmeContent;
}
