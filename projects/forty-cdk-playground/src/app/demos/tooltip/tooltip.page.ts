import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TooltipExample } from './examples/tooltip.example';
import { TooltipOverflowExample } from './examples/overflow.example';

@Component({
  selector: 'app-tooltip-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TooltipExample, TooltipOverflowExample],
  template: `
    <primitive-page slug="tooltip">
      <app-tooltip-example />
      <app-tooltip-overflow-example />
    </primitive-page>
  `,
})
export class TooltipPage {}
