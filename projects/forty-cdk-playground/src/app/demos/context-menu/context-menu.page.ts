import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ContextMenuExample } from './examples/context-menu.example';

@Component({
  selector: 'app-context-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ContextMenuExample],
  template: `
    <primitive-page slug="context-menu">
      <app-context-menu-example />
    </primitive-page>
  `,
})
export class ContextMenuPage {}
