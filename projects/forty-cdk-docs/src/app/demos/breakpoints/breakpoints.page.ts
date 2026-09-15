import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { BreakpointsActiveExample } from './examples/active.example';
import { BreakpointsMediaQueriesExample } from './examples/media-queries.example';
import { BreakpointsResponsiveLayoutExample } from './examples/responsive-layout.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/breakpoints.generated';

@Component({
  selector: 'app-breakpoints-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    BreakpointsActiveExample,
    BreakpointsResponsiveLayoutExample,
    BreakpointsMediaQueriesExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="breakpoints" [doc]="doc">
      <demo-layout hero sourcePath="breakpoints/examples/active.example.ts">
        <app-breakpoints-active-example />
      </demo-layout>

      <demo-layout
        heading="responsive-layout"
        sourcePath="breakpoints/examples/responsive-layout.example.ts"
      >
        <app-breakpoints-responsive-layout-example />
      </demo-layout>

      <demo-layout
        heading="arbitrary-media-queries"
        sourcePath="breakpoints/examples/media-queries.example.ts"
      >
        <app-breakpoints-media-queries-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class BreakpointsPage {
  protected readonly doc = DOC;
}
