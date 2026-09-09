import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FileUploadDefaultExample } from './examples/default.example';
import { FileUploadDirectoryExample } from './examples/directory.example';
import { FileUploadDisabledExample } from './examples/disabled.example';
import { FileUploadMultipleExample } from './examples/multiple.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/file-upload.generated';

@Component({
  selector: 'app-file-upload-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    FileUploadDefaultExample,
    FileUploadMultipleExample,
    FileUploadDisabledExample,
    FileUploadDirectoryExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="file-upload" [doc]="doc">
      <demo-layout hero sourcePath="file-upload/examples/default.example.ts">
        <app-file-upload-default-example />
      </demo-layout>

      <demo-layout
        title="Multiple files"
        subtitle="<code>multiple</code> lets the picker (and a drop) accept more than one file at once, and <code>accept</code> narrows the chooser to the MIME types you list."
        sourcePath="file-upload/examples/multiple.example.ts"
      >
        <app-file-upload-multiple-example />
      </demo-layout>

      <demo-layout
        title="Disabled"
        subtitle="<code>disabled</code> blocks the dialog and drops and reflects <code>data-disabled</code> on the zone, so you can dim it and ignore pointer events without removing the input from the DOM."
        sourcePath="file-upload/examples/disabled.example.ts"
      >
        <app-file-upload-disabled-example />
      </demo-layout>

      <demo-layout
        title="Folder selection"
        subtitle="Set <code>directory</code> to switch the native picker into folder mode (mirrored as <code>webkitdirectory</code> on the input). The emitted <code>FileList</code> then contains every file inside the chosen folder, each carrying a <code>webkitRelativePath</code> the consumer reads to reconstruct the tree."
        sourcePath="file-upload/examples/directory.example.ts"
      >
        <app-file-upload-directory-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class FileUploadPage {
  protected readonly doc = DOC;
}
