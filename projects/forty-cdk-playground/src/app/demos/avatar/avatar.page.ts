import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AvatarExample } from './examples/avatar.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/avatar/README.md';

@Component({
  selector: 'app-avatar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AvatarExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="avatar" [readme]="readme">
      <app-avatar-example />
    </primitive-page>
  `,
})
export class AvatarPage {
  protected readonly readme = readmeContent;
}
