import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TooltipDefaultExample } from './examples/default.example';
import { TooltipHoverableExample } from './examples/hoverable.example';
import { TooltipOverflowExample } from './examples/overflow.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/tooltip.generated';

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
    <primitive-page slug="tooltip" [doc]="doc">
      <demo-layout hero sourcePath="tooltip/examples/default.example.ts">
        <app-tooltip-default-example />
      </demo-layout>

      <demo-layout heading="overflow-only" sourcePath="tooltip/examples/overflow.example.ts">
        <app-tooltip-overflow-example />
      </demo-layout>

      <demo-layout heading="hoverable-content" sourcePath="tooltip/examples/hoverable.example.ts">
        <app-tooltip-hoverable-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TooltipPage {
  protected readonly doc = DOC;
}
