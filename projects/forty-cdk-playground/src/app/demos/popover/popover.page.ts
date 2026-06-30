import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { PopoverAnchorExample } from './examples/anchor.example';
import { PopoverDefaultExample } from './examples/default.example';
import { PopoverPositioningExample } from './examples/positioning.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/popover/README.md';

@Component({
  selector: 'app-popover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    PopoverDefaultExample,
    PopoverAnchorExample,
    PopoverPositioningExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="popover" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/popover/examples/default.example.ts"
      >
        <app-popover-default-example />
      </playground-demo>

      <playground-demo
        title="Anchor & arrow"
        subtitle="The element that opens the popover and the element it points at can differ: the button is the trigger, but <code>[forPopoverAnchor]</code> on the highlighted phrase is what floating-ui positions against."
        sourcePath="projects/forty-cdk-playground/src/app/demos/popover/examples/anchor.example.ts"
      >
        <app-popover-anchor-example />
      </playground-demo>

      <playground-demo
        title="Positioning & collisions"
        subtitle="The trigger sits in a tight, scrollable frame. <code>sideOffset</code> nudges the surface off the trigger and <code>collisionPadding</code> reserves a margin from the edge before <code>flip</code> / <code>shift</code> kick in — scroll the frame to see it react."
        sourcePath="projects/forty-cdk-playground/src/app/demos/popover/examples/positioning.example.ts"
      >
        <app-popover-positioning-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class PopoverPage {
  protected readonly readme = readmeContent;
}
