import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DrawerDefaultExample } from './examples/default.example';
import { DrawerNestedExample } from './examples/nested.example';
import { DrawerProgrammaticExample } from './examples/programmatic.example';
import { DrawerRegionScopedExample } from './examples/region-scoped.example';
import { DrawerScaleBackgroundExample } from './examples/scale-background.example';
import { DrawerSnapPointsExample } from './examples/snap-points.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/drawer/README.md';

@Component({
  selector: 'app-drawer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DrawerDefaultExample,
    DrawerSnapPointsExample,
    DrawerScaleBackgroundExample,
    DrawerNestedExample,
    DrawerRegionScopedExample,
    DrawerProgrammaticExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="drawer" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/default.example.ts"
      >
        <app-drawer-default-example />
      </playground-demo>

      <playground-demo
        title="Snap points"
        subtitle="Drag the sheet between peek / half / full. Release resolves to the nearest snap by position (or dismisses past the lowest one). The consumer positions each snap via CSS keyed off <code>data-active-snap-point</code>; <code>data-dragging</code> disables the transition mid-gesture. <code>fadeFromIndex</code> fades the backdrop in only once the sheet reaches the half snap."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/snap-points.example.ts"
      >
        <app-drawer-snap-points-example />
      </playground-demo>

      <playground-demo
        title="Scale background"
        subtitle="With <code>[scaleBackground]</code> the <code>[forDrawerWrapper]</code> element scales and rounds its corners behind the drawer, so the page reads as a layer that recedes. Here the wrapper is the playground app shell, so the whole page recedes behind the sheet."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/scale-background.example.ts"
      >
        <app-drawer-scale-background-example />
      </playground-demo>

      <playground-demo
        title="Nested drawers"
        subtitle="A drawer mounted inside another joins a LIFO stack automatically — no flag needed. The parent recedes (<code>data-state-nested</code>), focus stays trapped in the topmost, scroll-lock is refcounted, and <kbd>Escape</kbd> closes the topmost first."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/nested.example.ts"
      >
        <app-drawer-nested-example />
      </playground-demo>

      <playground-demo
        title="Region-scoped (container)"
        subtitle="Set <code>[container]</code> to a positioned element and the drawer portals into that region instead of <code>&lt;body&gt;</code>. With <code>modal</code> on, the backdrop, focus trap, scroll lock and inert siblings are all scoped to the card — only this region is dimmed and trapped, while the rest of the page stays fully interactive."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/region-scoped.example.ts"
      >
        <app-drawer-region-scoped-example />
      </playground-demo>

      <playground-demo
        title="Programmatic (ForDrawerManager)"
        subtitle="Open an arbitrary component imperatively and await its result. The manager mounts the component under the same <code>[forDrawer]</code> engine, so every piece and input works identically; <code>[forDrawerClose]</code> <code>[closeWith]</code> propagates straight through to <code>ForDrawerRef.close(value)</code>. <code>class</code> / <code>animateEnter</code> / <code>animateLeave</code> / <code>backdropAnimateLeave</code> land on the real host so the imperative overlay plays the same slide and fade as the declarative drawers."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/programmatic.example.ts"
      >
        <app-drawer-programmatic-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DrawerPage {
  protected readonly readme = readmeContent;
}
