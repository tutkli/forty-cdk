import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { PopoverAnchorArrowExample } from './examples/anchor-arrow.example';
import { PopoverExample } from './examples/popover.example';
import { PopoverPositioningExample } from './examples/positioning.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/popover/README.md';

@Component({
  selector: 'app-popover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, PopoverExample, PopoverAnchorArrowExample, PopoverPositioningExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="popover" [readme]="readme">
      <app-popover-example />
      <app-popover-anchor-arrow-example />
      <app-popover-positioning-example />
    </primitive-page>
  `,
})
export class PopoverPage {
  protected readonly readme = readmeContent;
}
