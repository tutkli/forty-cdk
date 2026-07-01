import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { VirtualizationDynamicExample } from './examples/dynamic.example';
import { VirtualizationInfiniteScrollExample } from './examples/infinite-scroll.example';
import { VirtualizationViewportExample } from './examples/viewport.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/virtualization/README.md';

@Component({
  selector: 'app-virtualization-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    VirtualizationViewportExample,
    VirtualizationDynamicExample,
    VirtualizationInfiniteScrollExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="virtualization" [readme]="readme">
      <playground-demo hero sourcePath="virtualization/examples/viewport.example.ts">
        <app-virtualization-viewport-example />
      </playground-demo>

      <playground-demo
        title="Dynamic heights (measured)"
        subtitle="When rows vary in height, drop to the headless <code>injectVirtualizer</code> core: it owns no DOM, so the consumer renders the spacer and the absolutely-positioned window. Each row carries <code>[attr.data-index]</code> and is fed to <code>measureElement()</code> in <code>afterEveryRender</code>, so estimates refine and jumping to the bottom lands precisely."
        sourcePath="virtualization/examples/dynamic.example.ts"
      >
        <app-virtualization-dynamic-example />
      </playground-demo>

      <playground-demo
        title="Infinite scroll (endReached)"
        subtitle="The Shape A turnkey path: bind <code>(endReached)</code> on <code>[forVirtualViewport]</code> and it builds the infinite-scroll detector internally, firing once when the rendered window comes within the overscan of the end. The consumer owns the fetch and appends the next page; the detector re-arms when the bound <code>count</code> grows."
        sourcePath="virtualization/examples/infinite-scroll.example.ts"
      >
        <app-virtualization-infinite-scroll-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class VirtualizationPage {
  protected readonly readme = readmeContent;
}
