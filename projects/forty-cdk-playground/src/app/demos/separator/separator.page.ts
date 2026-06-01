import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SeparatorExample } from './examples/separator.example';

@Component({
  selector: 'app-separator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SeparatorExample],
  template: `
    <primitive-page slug="separator">
      <app-separator-example />
    </primitive-page>
  `,
})
export class SeparatorPage {}
