import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { PopoverExample } from './examples/popover.example';

@Component({
  selector: 'app-popover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, PopoverExample],
  template: `
    <primitive-page slug="popover">
      <app-popover-example />
    </primitive-page>
  `,
})
export class PopoverPage {}
