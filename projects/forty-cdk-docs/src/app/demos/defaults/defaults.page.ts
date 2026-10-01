import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DOC } from '../../../generated/docs/primitives/defaults.generated';
import { PrimitivePage } from '../../ui/primitive-page';

@Component({
  selector: 'app-defaults-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage],
  template: `<primitive-page slug="defaults" [doc]="doc" />`,
})
export class DefaultsPage {
  protected readonly doc = DOC;
}
