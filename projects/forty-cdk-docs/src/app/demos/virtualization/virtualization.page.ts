import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { VirtualizationDynamicExample } from './examples/dynamic.example';
import { VirtualizationInfiniteScrollExample } from './examples/infinite-scroll.example';
import { VirtualizationViewportExample } from './examples/viewport.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/virtualization.generated';

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
    <primitive-page slug="virtualization" [doc]="doc">
      <demo-layout hero sourcePath="virtualization/examples/viewport.example.ts">
        <app-virtualization-viewport-example />
      </demo-layout>

      <demo-layout
        heading="dynamic-heights-measured"
        sourcePath="virtualization/examples/dynamic.example.ts"
      >
        <app-virtualization-dynamic-example />
      </demo-layout>

      <demo-layout
        heading="infinite-scroll-endreached"
        sourcePath="virtualization/examples/infinite-scroll.example.ts"
      >
        <app-virtualization-infinite-scroll-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class VirtualizationPage {
  protected readonly doc = DOC;
}
