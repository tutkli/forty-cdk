import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { BreakpointsActiveExample } from './examples/active.example';
import { BreakpointsMediaQueriesExample } from './examples/media-queries.example';
import { BreakpointsResponsiveLayoutExample } from './examples/responsive-layout.example';

@Component({
  selector: 'app-breakpoints-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    BreakpointsActiveExample,
    BreakpointsResponsiveLayoutExample,
    BreakpointsMediaQueriesExample,
  ],
  template: `
    <primitive-page slug="breakpoints">
      <app-breakpoints-active-example />
      <app-breakpoints-responsive-layout-example />
      <app-breakpoints-media-queries-example />
    </primitive-page>
  `,
})
export class BreakpointsPage {}
