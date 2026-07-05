import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-file-upload-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div
      forFileUpload
      data-testid="zone"
      [accept]="accept"
      [disabled]="disabled"
      [multiple]="multiple"
      [directory]="directory"
      (filesChange)="onFiles($event)"
      (filesRejected)="onRejected($event)"
    >
      <button forFileUploadTrigger data-testid="trigger">Choose files</button>
      <input forFileUploadInput data-testid="input" aria-label="Upload files" />
    </div>
    <output data-testid="files">{{ fileNames() }}</output>
    <output data-testid="count">{{ fileCount() }}</output>
    <output data-testid="rejected">{{ rejectedNames() }}</output>
  `,
})
export class FileUploadFixture {
  protected readonly disabled = queryFlag('disabled');
  protected readonly multiple = queryFlag('multiple');
  protected readonly directory = queryFlag('directory');
  protected readonly accept = queryFlag('accept') ? 'image/*' : null;

  protected readonly fileNames = signal('');
  protected readonly fileCount = signal('0');
  protected readonly rejectedNames = signal('');

  protected onFiles(files: FileList): void {
    const names: string[] = [];
    for (let i = 0; i < files.length; i++) {
      names.push(files[i]!.name);
    }
    this.fileNames.set(names.join(','));
    this.fileCount.set(String(files.length));
  }

  protected onRejected(files: File[]): void {
    this.rejectedNames.set(files.map((file) => file.name).join(','));
  }
}
