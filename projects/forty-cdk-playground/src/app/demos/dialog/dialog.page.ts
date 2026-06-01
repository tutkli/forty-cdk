import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DialogAnatomyExample } from './examples/anatomy.example';
import { DialogGuardedCloseExample } from './examples/guarded-close.example';
import { DialogNonModalExample } from './examples/non-modal.example';
import { DialogProgrammaticExample } from './examples/programmatic.example';

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
    <primitive-page slug="dialog">
      <app-dialog-anatomy-example />
      <app-dialog-guarded-close-example />
      <app-dialog-non-modal-example />
      <app-dialog-programmatic-example />
    </primitive-page>
  `,
})
export class DialogPage {}
