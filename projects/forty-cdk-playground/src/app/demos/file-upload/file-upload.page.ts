import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { FileUploadBasicExample } from './examples/basic.example';
import { FileUploadDirectoryExample } from './examples/directory.example';
import readmeContent from '../../../../../forty-cdk/file-upload/README.md';

@Component({
  selector: 'app-file-upload-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, FileUploadBasicExample, FileUploadDirectoryExample],
  template: `
    <primitive-page slug="file-upload" [readme]="readme">
      <app-file-upload-basic-example />
      <app-file-upload-directory-example />
    </primitive-page>
  `,
})
export class FileUploadPage {
  protected readonly readme = readmeContent;
}
