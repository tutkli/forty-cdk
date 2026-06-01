import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TooltipExample } from './examples/tooltip.example';

@Component({
  selector: 'app-tooltip-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, TooltipExample],
  template: `
    <primitive-page slug="tooltip">
      <app-tooltip-example />
    </primitive-page>
  `,
})
export class TooltipPage {}
