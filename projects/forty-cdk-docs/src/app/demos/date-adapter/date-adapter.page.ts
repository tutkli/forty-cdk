import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DOC } from '../../../generated/docs/primitives/date-adapter.generated';
import { PrimitivePage } from '../../ui/primitive-page';

@Component({
  selector: 'app-date-adapter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage],
  template: `<primitive-page slug="date-adapter" [doc]="doc" />`,
})
export class DateAdapterPage {
  protected readonly doc = DOC;
}
