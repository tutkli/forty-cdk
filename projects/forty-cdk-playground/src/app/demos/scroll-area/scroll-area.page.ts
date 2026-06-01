import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ScrollAreaGeometryExample } from './examples/geometry.example';
import { ScrollAreaExample } from './examples/scroll-area.example';

@Component({
  selector: 'app-scroll-area-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ScrollAreaExample, ScrollAreaGeometryExample],
  template: `
    <primitive-page slug="scroll-area">
      <app-scroll-area-example />
      <app-scroll-area-geometry-example />
    </primitive-page>
  `,
})
export class ScrollAreaPage {}
