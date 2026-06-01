import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MenubarExample } from './examples/menubar.example';

@Component({
  selector: 'app-menubar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MenubarExample],
  template: `
    <primitive-page slug="menubar">
      <app-menubar-example />
    </primitive-page>
  `,
})
export class MenubarPage {}
