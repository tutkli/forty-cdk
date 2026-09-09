import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DOC } from '../../../generated/docs/primitives/shared.generated';
import { PrimitivePage } from '../../ui/primitive-page';

@Component({
  selector: 'app-shared-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage],
  template: `<primitive-page slug="shared" [doc]="doc" />`,
})
export class SharedPage {
  protected readonly doc = DOC;
}
