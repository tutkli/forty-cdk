import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DialogAnatomyExample } from './examples/anatomy.example';
import { DialogGuardedCloseExample } from './examples/guarded-close.example';
import { DialogNonModalExample } from './examples/non-modal.example';
import { DialogProgrammaticExample } from './examples/programmatic.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/dialog.generated';

@Component({
  selector: 'app-dialog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DialogAnatomyExample,
    DialogGuardedCloseExample,
    DialogNonModalExample,
    DialogProgrammaticExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="dialog" [doc]="doc">
      <demo-layout hero sourcePath="dialog/examples/anatomy.example.ts">
        <app-dialog-anatomy-example />
      </demo-layout>

      <demo-layout heading="guarded-close" sourcePath="dialog/examples/guarded-close.example.ts">
        <app-dialog-guarded-close-example />
      </demo-layout>

      <demo-layout
        heading="non-modal--keep-focus"
        sourcePath="dialog/examples/non-modal.example.ts"
      >
        <app-dialog-non-modal-example />
      </demo-layout>

      <demo-layout
        heading="programmatic-fordialogmanager"
        sourcePath="dialog/examples/programmatic.example.ts"
      >
        <app-dialog-programmatic-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DialogPage {
  protected readonly doc = DOC;
}
