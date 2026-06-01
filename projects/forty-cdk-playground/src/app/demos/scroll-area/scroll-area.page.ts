import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ScrollAreaExample } from './examples/scroll-area.example';

@Component({
  selector: 'app-scroll-area-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ScrollAreaExample],
  template: `
    <primitive-page slug="scroll-area">
      <app-scroll-area-example />
    </primitive-page>
  `,
})
export class ScrollAreaPage {}
