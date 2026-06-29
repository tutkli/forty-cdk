import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DialogAnatomyExample } from './examples/anatomy.example';
import { DialogGuardedCloseExample } from './examples/guarded-close.example';
import { DialogNonModalExample } from './examples/non-modal.example';
import { DialogProgrammaticExample } from './examples/programmatic.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/dialog/README.md';

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
    <primitive-page slug="dialog" [readme]="readme">
      <playground-demo
        title="Anatomy"
        subtitle="A modal confirm dialog composed from trigger, backdrop, title, description and close button. The surface portals to <body>, so its styles are colocated here via ViewEncapsulation.None; animate.enter / animate.leave play on real mount and unmount."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/anatomy.example.ts"
      >
        <app-dialog-anatomy-example />
      </playground-demo>

      <playground-demo
        title="Guarded close"
        subtitle="(escapeKeyDown) and (interactOutside) fire before (dismiss); calling preventDefault() on them keeps the dialog open. Escape and click-outside are vetoed, so only Discard or Save close it. Modal with no backdrop, so the page behind is inert but undimmed."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/guarded-close.example.ts"
      >
        <app-dialog-guarded-close-example />
      </playground-demo>

      <playground-demo
        title="Non-modal & keep focus"
        subtitle="[modal]=false drops the focus trap, scroll lock and inert siblings. autoFocusOnOpen vetoes the initial focus move so the search field keeps focus while you type, and autoFocusOnClose returns focus to it on close. With no visible title, ariaLabel names the panel."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/non-modal.example.ts"
      >
        <app-dialog-non-modal-example />
      </playground-demo>

      <playground-demo
        title="Programmatic (ForDialogManager)"
        subtitle="Open a component imperatively and await its result. The manager mounts it under the same [forDialog] engine, so [forDialogClose] [closeWith] propagates straight to ForDialogRef.close(value). Here as a non-dismissible alertdialog; class / animateLeave / backdropAnimateLeave style and fade out the manager-created host."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/programmatic.example.ts"
      >
        <app-dialog-programmatic-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DialogPage {
  protected readonly readme = readmeContent;
}
