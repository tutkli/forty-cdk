import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AvatarExample } from './examples/avatar.example';

@Component({
  selector: 'app-avatar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AvatarExample],
  template: `
    <primitive-page slug="avatar">
      <app-avatar-example />
    </primitive-page>
  `,
})
export class AvatarPage {}
