import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TooltipDefaultExample } from './examples/default.example';
import { TooltipHoverableExample } from './examples/hoverable.example';
import { TooltipOverflowExample } from './examples/overflow.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/tooltip/README.md';

@Component({
  selector: 'app-tooltip-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TooltipDefaultExample,
    TooltipOverflowExample,
    TooltipHoverableExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="tooltip" [readme]="readme">
      <playground-demo
        title="Hover & focus trigger"
        subtitle="A short label shown on hover or focus and hidden on leave, blur or Escape. It never steals focus and its content is pointer-events: none, so the pointer falls through. The bubble portals to <body>; its styles are colocated here via ViewEncapsulation.None."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tooltip/examples/default.example.ts"
      >
        <app-tooltip-default-example />
      </playground-demo>

      <playground-demo
        title="Overflow-only"
        subtitle="With showOnOverflow the tooltip opens only when the trigger's own text is actually truncated — ideal for table cells or file paths that may or may not fit. The short label fits and stays silent; the long one is clipped, so the full text appears."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tooltip/examples/overflow.example.ts"
      >
        <app-tooltip-overflow-example />
      </playground-demo>

      <playground-demo
        title="Hoverable content"
        subtitle="With hoverableContent the bubble keeps pointer-events, so the pointer can rest on it to read or select long text without dismissing it. A pointer-grace safe triangle bridges the trigger-to-content gap. The content must still stay non-interactive per APG."
        sourcePath="projects/forty-cdk-playground/src/app/demos/tooltip/examples/hoverable.example.ts"
      >
        <app-tooltip-hoverable-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TooltipPage {
  protected readonly readme = readmeContent;
}
