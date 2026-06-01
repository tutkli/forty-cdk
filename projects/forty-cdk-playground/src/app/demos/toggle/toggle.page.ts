import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ToggleExample } from './examples/toggle.example';

@Component({
  selector: 'app-toggle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ToggleExample],
  template: `
    <primitive-page slug="toggle">
      <app-toggle-example />
    </primitive-page>
  `,
})
export class TogglePage {}
