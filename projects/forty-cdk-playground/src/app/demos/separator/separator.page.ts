import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SeparatorCollapsibleExample } from './examples/collapsible.example';
import { SeparatorExample } from './examples/separator.example';

@Component({
  selector: 'app-separator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SeparatorExample, SeparatorCollapsibleExample],
  template: `
    <primitive-page slug="separator">
      <app-separator-example />
      <app-separator-collapsible-example />
    </primitive-page>
  `,
})
export class SeparatorPage {}
