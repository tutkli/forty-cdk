import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { FieldsetGroupExample } from './examples/group.example';
import { FieldsetRoleExample } from './examples/role-group.example';
import readmeContent from '../../../../../forty-cdk/fieldset/README.md';

@Component({
  selector: 'app-fieldset-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, FieldsetGroupExample, FieldsetRoleExample],
  template: `
    <primitive-page slug="fieldset" [readme]="readme">
      <app-fieldset-group-example />
      <app-fieldset-role-example />
    </primitive-page>
  `,
})
export class FieldsetPage {
  protected readonly readme = readmeContent;
}
