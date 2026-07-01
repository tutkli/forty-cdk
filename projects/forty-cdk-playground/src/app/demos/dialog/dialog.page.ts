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
      <playground-demo hero sourcePath="dialog/examples/anatomy.example.ts">
        <app-dialog-anatomy-example />
      </playground-demo>

      <playground-demo
        title="Guarded close"
        subtitle="<code>(escapeKeyDown)</code> and <code>(interactOutside)</code> fire before <code>(dismiss)</code>; calling <code>preventDefault()</code> on them keeps the dialog open. <kbd>Escape</kbd> and click-outside are vetoed, so only Discard or Save close it. Modal with no backdrop, so the page behind is inert but undimmed."
        sourcePath="dialog/examples/guarded-close.example.ts"
      >
        <app-dialog-guarded-close-example />
      </playground-demo>

      <playground-demo
        title="Non-modal & keep focus"
        subtitle='<code>[modal]="false"</code> drops the focus trap, scroll lock and inert siblings. <code>autoFocusOnOpen</code> vetoes the initial focus move so the search field keeps focus while you type, and <code>autoFocusOnClose</code> returns focus to it on close. With no visible title, <code>ariaLabel</code> names the panel.'
        sourcePath="dialog/examples/non-modal.example.ts"
      >
        <app-dialog-non-modal-example />
      </playground-demo>

      <playground-demo
        title="Programmatic (ForDialogManager)"
        subtitle="Open a component imperatively and await its result. The manager mounts it under the same <code>[forDialog]</code> engine, so <code>[forDialogClose]</code> <code>[closeWith]</code> propagates straight to <code>ForDialogRef.close(value)</code>. Here as a non-dismissible <code>alertdialog</code>; <code>class</code> / <code>animateLeave</code> / <code>backdropAnimateLeave</code> style and fade out the manager-created host."
        sourcePath="dialog/examples/programmatic.example.ts"
      >
        <app-dialog-programmatic-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DialogPage {
  protected readonly readme = readmeContent;
}
