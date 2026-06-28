import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ScrollAreaGeometryExample } from './examples/geometry.example';
import { ScrollAreaExample } from './examples/scroll-area.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/scroll-area/README.md';

@Component({
  selector: 'app-scroll-area-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ScrollAreaExample, ScrollAreaGeometryExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="scroll-area" [readme]="readme">
      <app-scroll-area-example />
      <app-scroll-area-geometry-example />
    </primitive-page>
  `,
})
export class ScrollAreaPage {
  protected readonly readme = readmeContent;
}
