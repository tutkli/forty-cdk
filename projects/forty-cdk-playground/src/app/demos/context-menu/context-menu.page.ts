import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ContextMenuExample } from './examples/context-menu.example';
import { ContextMenuRichContentExample } from './examples/rich-content.example';

@Component({
  selector: 'app-context-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ContextMenuExample, ContextMenuRichContentExample],
  template: `
    <primitive-page slug="context-menu">
      <app-context-menu-example />
      <app-context-menu-rich-content-example />
    </primitive-page>
  `,
})
export class ContextMenuPage {}
