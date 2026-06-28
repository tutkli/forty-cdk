import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { FileUploadBasicExample } from './examples/basic.example';
import { FileUploadDirectoryExample } from './examples/directory.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/file-upload/README.md';

@Component({
  selector: 'app-file-upload-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, FileUploadBasicExample, FileUploadDirectoryExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
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
