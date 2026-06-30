import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';

interface FolderEntry {
  readonly path: string;
  readonly size: number;
}

@Component({
  selector: 'app-file-upload-directory-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div class="stage">
      <div forFileUpload directory class="zone" (filesChange)="onFolder($event)">
        <input forFileUploadInput class="sr-only" aria-label="Upload a folder" />
        <p class="zone-text">
          <button forFileUploadTrigger class="zone-btn">Choose a folder</button>
        </p>
        <p class="zone-accept">The whole folder’s contents are read, recursively.</p>
      </div>

      @if (entries().length) {
        <div class="tree-head">
          {{ entries().length }} files in <b>{{ rootFolder() }}</b>
        </div>
        <ul class="tree">
          @for (entry of entries().slice(0, 8); track entry.path) {
            <li class="tree-row">{{ entry.path }}</li>
          }
          @if (entries().length > 8) {
            <li class="tree-more">+ {{ entries().length - 8 }} more…</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stage {
      width: min(420px, 100%);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.75rem 1.5rem;
      text-align: center;
      color: var(--pg-text-muted);
      background: var(--pg-surface);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
    }

    .zone-text {
      margin: 0;
    }

    .zone-btn {
      font: inherit;
      font-weight: 700;
      color: var(--pg-primary);
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }

    .zone-accept {
      margin: 0;
      font-size: 0.78rem;
    }

    .tree-head {
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    .tree {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      margin: 0;
      padding: 0.6rem 0.75rem;
      list-style: none;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .tree-row,
    .tree-more {
      font-family: var(--pg-font-mono);
      font-size: 0.76rem;
      color: var(--pg-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-more {
      color: var(--pg-text-muted);
    }
  `,
})
export class FileUploadDirectoryExample {
  protected readonly entries = signal<readonly FolderEntry[]>([]);
  protected readonly rootFolder = signal('');

  protected onFolder(list: FileList): void {
    const files = Array.from(list);
    const entries = files.map((file) => ({
      path: file.webkitRelativePath || file.name,
      size: file.size,
    }));
    this.entries.set(entries);
    this.rootFolder.set(entries[0]?.path.split('/')[0] ?? '');
  }
}
