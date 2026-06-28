import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TooltipExample } from './examples/tooltip.example';
import { TooltipOverflowExample } from './examples/overflow.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/tooltip/README.md';

@Component({
  selector: 'app-tooltip-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TooltipExample, TooltipOverflowExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="tooltip" [readme]="readme">
      <app-tooltip-example />
      <app-tooltip-overflow-example />
    </primitive-page>
  `,
})
export class TooltipPage {
  protected readonly readme = readmeContent;
}
