import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ToolbarExample } from './examples/toolbar.example';

@Component({
  selector: 'app-toolbar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ToolbarExample],
  template: `
    <primitive-page slug="toolbar">
      <app-toolbar-example />
    </primitive-page>
  `,
})
export class ToolbarPage {}
