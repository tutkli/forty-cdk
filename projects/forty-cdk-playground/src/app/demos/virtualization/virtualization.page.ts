import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { VirtualizationDynamicExample } from './examples/dynamic.example';
import { VirtualizationInfiniteScrollExample } from './examples/infinite-scroll.example';
import { VirtualizationViewportExample } from './examples/viewport.example';
import readmeContent from '../../../../../forty-cdk/virtualization/README.md';

@Component({
  selector: 'app-virtualization-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    VirtualizationViewportExample,
    VirtualizationDynamicExample,
    VirtualizationInfiniteScrollExample,
  ],
  template: `
    <primitive-page slug="virtualization" [readme]="readme">
      <app-virtualization-viewport-example />
      <app-virtualization-dynamic-example />
      <app-virtualization-infinite-scroll-example />
    </primitive-page>
  `,
})
export class VirtualizationPage {
  protected readonly readme = readmeContent;
}
