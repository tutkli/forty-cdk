import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DOC } from '../../../generated/docs/primitives/testing.generated';
import { PrimitivePage } from '../../ui/primitive-page';

@Component({
  selector: 'app-testing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage],
  template: `<primitive-page slug="testing" [doc]="doc" />`,
})
export class TestingPage {
  protected readonly doc = DOC;
}
