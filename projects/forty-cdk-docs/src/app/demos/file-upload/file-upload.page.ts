import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { FileUploadDefaultExample } from './examples/default.example';
import { FileUploadDirectoryExample } from './examples/directory.example';
import { FileUploadStatesExample } from './examples/states.example';
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
    FileUploadStatesExample,
    FileUploadDirectoryExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="file-upload" [doc]="doc">
      <demo-layout hero sourcePath="file-upload/examples/default.example.ts">
        <app-file-upload-default-example />
      </demo-layout>

      <demo-layout heading="multiple-files" sourcePath="file-upload/examples/multiple.example.ts">
        <app-file-upload-multiple-example />
      </demo-layout>

      <demo-layout heading="states" sourcePath="file-upload/examples/states.example.ts">
        <app-file-upload-states-example />
      </demo-layout>

      <demo-layout
        heading="folder-selection"
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
