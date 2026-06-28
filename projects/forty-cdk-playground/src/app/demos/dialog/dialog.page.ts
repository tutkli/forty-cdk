import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DialogAnatomyExample } from './examples/anatomy.example';
import { DialogGuardedCloseExample } from './examples/guarded-close.example';
import { DialogNonModalExample } from './examples/non-modal.example';
import { DialogProgrammaticExample } from './examples/programmatic.example';
import readmeContent from '../../../../../forty-cdk/dialog/README.md';

@Component({
  selector: 'app-dialog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DialogAnatomyExample,
    DialogGuardedCloseExample,
    DialogNonModalExample,
    DialogProgrammaticExample,
  ],
  template: `
    <primitive-page slug="dialog" [readme]="readme">
      <app-dialog-anatomy-example />
      <app-dialog-guarded-close-example />
      <app-dialog-non-modal-example />
      <app-dialog-programmatic-example />
    </primitive-page>
  `,
})
export class DialogPage {
  protected readonly readme = readmeContent;
}
