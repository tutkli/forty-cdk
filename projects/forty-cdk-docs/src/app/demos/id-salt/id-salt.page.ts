import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DOC } from '../../../generated/docs/primitives/id-salt.generated';
import { PrimitivePage } from '../../ui/primitive-page';

@Component({
  selector: 'app-id-salt-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage],
  template: `<primitive-page slug="id-salt" [doc]="doc" />`,
})
export class IdSaltPage {
  protected readonly doc = DOC;
}
