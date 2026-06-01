import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { PopoverAnchorArrowExample } from './examples/anchor-arrow.example';
import { PopoverExample } from './examples/popover.example';
import { PopoverPositioningExample } from './examples/positioning.example';

@Component({
  selector: 'app-popover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, PopoverExample, PopoverAnchorArrowExample, PopoverPositioningExample],
  template: `
    <primitive-page slug="popover">
      <app-popover-example />
      <app-popover-anchor-arrow-example />
      <app-popover-positioning-example />
    </primitive-page>
  `,
})
export class PopoverPage {}
