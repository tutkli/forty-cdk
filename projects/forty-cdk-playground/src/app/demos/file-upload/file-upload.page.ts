import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { FileUploadBasicExample } from './examples/basic.example';
import { FileUploadDirectoryExample } from './examples/directory.example';

@Component({
  selector: 'app-file-upload-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, FileUploadBasicExample, FileUploadDirectoryExample],
  template: `
    <primitive-page slug="file-upload">
      <app-file-upload-basic-example />
      <app-file-upload-directory-example />
    </primitive-page>
  `,
})
export class FileUploadPage {}
