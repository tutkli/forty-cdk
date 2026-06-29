import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FileUploadDefaultExample } from './examples/default.example';
import { FileUploadDirectoryExample } from './examples/directory.example';
import { FileUploadDisabledExample } from './examples/disabled.example';
import { FileUploadMultipleExample } from './examples/multiple.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/file-upload/README.md';

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
    <primitive-page slug="file-upload" [readme]="readme">
      <playground-demo
        title="Drop zone with a file dialog"
        subtitle="forFileUpload is a headless drop zone: the visually-hidden <input type='file'> stays the accessible form control, the trigger button opens the native dialog, and dropping files onto the zone emits the same (filesChange). data-dragging reflects an active drag-over so you can light up the target."
        sourcePath="projects/forty-cdk-playground/src/app/demos/file-upload/examples/default.example.ts"
      >
        <app-file-upload-default-example />
      </playground-demo>

      <playground-demo
        title="Multiple files"
        subtitle="multiple lets the picker (and a drop) accept more than one file at once, and accept narrows the chooser to the MIME types you list."
        sourcePath="projects/forty-cdk-playground/src/app/demos/file-upload/examples/multiple.example.ts"
      >
        <app-file-upload-multiple-example />
      </playground-demo>

      <playground-demo
        title="Disabled"
        subtitle="disabled blocks the dialog and drops and reflects data-disabled on the zone, so you can dim it and ignore pointer events without removing the input from the DOM."
        sourcePath="projects/forty-cdk-playground/src/app/demos/file-upload/examples/disabled.example.ts"
      >
        <app-file-upload-disabled-example />
      </playground-demo>

      <playground-demo
        title="Folder selection"
        subtitle="Set directory to switch the native picker into folder mode (mirrored as webkitdirectory on the input). The emitted FileList then contains every file inside the chosen folder, each carrying a webkitRelativePath the consumer reads to reconstruct the tree."
        sourcePath="projects/forty-cdk-playground/src/app/demos/file-upload/examples/directory.example.ts"
      >
        <app-file-upload-directory-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class FileUploadPage {
  protected readonly readme = readmeContent;
}
