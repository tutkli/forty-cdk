import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { BreakpointsActiveExample } from './examples/active.example';
import { BreakpointsMediaQueriesExample } from './examples/media-queries.example';
import { BreakpointsResponsiveLayoutExample } from './examples/responsive-layout.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/breakpoints/README.md';

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
    <primitive-page slug="breakpoints" [readme]="readme">
      <playground-demo
        title="Active breakpoint"
        subtitle="injectBreakpoints() reads the breakpoint map from the ambient provider (the Tailwind scale by default). Every query method returns a Signal<boolean>; active() is the largest breakpoint whose min-width currently matches, or null below the smallest. Resize the window to watch them update live."
        sourcePath="projects/forty-cdk-playground/src/app/demos/breakpoints/examples/active.example.ts"
      >
        <app-breakpoints-active-example />
      </playground-demo>

      <playground-demo
        title="Responsive layout"
        subtitle="Derive UI from the breakpoint inside computed() and @if instead of repeating media queries in the template. The card grid picks its column count from up('md') / up('lg') / up('xl'), and the sidebar is only mounted at lg and wider."
        sourcePath="projects/forty-cdk-playground/src/app/demos/breakpoints/examples/responsive-layout.example.ts"
      >
        <app-breakpoints-responsive-layout-example />
      </playground-demo>

      <playground-demo
        title="Arbitrary media queries"
        subtitle="matches(query) is the escape hatch for any media feature the named width helpers don't cover — orientation, pointer, hover, and the prefers-* user settings. Each call returns a live Signal<boolean> from the same cached MediaQueryList layer."
        sourcePath="projects/forty-cdk-playground/src/app/demos/breakpoints/examples/media-queries.example.ts"
      >
        <app-breakpoints-media-queries-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class BreakpointsPage {
  protected readonly readme = readmeContent;
}
