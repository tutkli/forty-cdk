import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AvatarExample } from './examples/avatar.example';
import readmeContent from '../../../../../forty-cdk/avatar/README.md';

@Component({
  selector: 'app-avatar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AvatarExample],
  template: `
    <primitive-page slug="avatar" [readme]="readme">
      <app-avatar-example />
    </primitive-page>
  `,
})
export class AvatarPage {
  protected readonly readme = readmeContent;
}
