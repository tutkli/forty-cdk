import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SelectExample } from './examples/select.example';

@Component({
  selector: 'app-select-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SelectExample],
  template: `
    <primitive-page slug="select">
      <app-select-example />
    </primitive-page>
  `,
})
export class SelectPage {}
