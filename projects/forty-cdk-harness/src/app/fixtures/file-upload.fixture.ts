import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-file-upload-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div
      forFileUpload
      data-testid="zone"
      [disabled]="disabled"
      [multiple]="multiple"
      (filesChange)="onFiles($event)"
    >
      <button forFileUploadTrigger data-testid="trigger">Choose files</button>
      <input forFileUploadInput data-testid="input" aria-label="Upload files" />
    </div>
    <output data-testid="files">{{ fileNames() }}</output>
    <output data-testid="count">{{ fileCount() }}</output>
  `,
})
export class FileUploadFixture {
  protected readonly disabled = queryFlag('disabled');
  protected readonly multiple = queryFlag('multiple');

  protected readonly fileNames = signal('');
  protected readonly fileCount = signal('0');

  protected onFiles(files: FileList): void {
    const names: string[] = [];
    for (let i = 0; i < files.length; i++) {
      names.push(files[i].name);
    }
    this.fileNames.set(names.join(','));
    this.fileCount.set(String(files.length));
  }
}
