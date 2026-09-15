import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';

@Component({
  selector: 'app-file-upload-multiple-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div class="stage">
      <div forFileUpload multiple accept="image/*" class="zone" (filesChange)="onFiles($event)">
        <input forFileUploadInput class="sr-only" aria-label="Upload images" />

        <svg class="zone-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 16.5V4.5m0 0L7.5 9M12 4.5 16.5 9M4.5 16.5v1.5a2.25 2.25 0 0 0 2.25 2.25h10.5A2.25 2.25 0 0 0 19.5 18v-1.5"
          />
        </svg>

        <p class="zone-text">
          <button forFileUploadTrigger class="zone-btn">Choose images</button>
          or drag and drop
        </p>
        <p class="zone-accept">Images only — select as many as you like</p>
      </div>

      @if (files().length) {
        <ul class="files">
          @for (file of files(); track file.name) {
            <li class="file">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ sizeLabel(file.size) }}</span>
            </li>
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
      padding: 2rem 1.5rem;
      text-align: center;
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface, #ffffff);
      border: 2px dashed var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }

    .zone[data-dragging] {
      border-color: var(--ex-accent, #0e7c6b);
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 8%, var(--ex-surface, #ffffff));
    }

    .zone-icon {
      width: 34px;
      height: 34px;
      color: var(--ex-muted, #585d66);
    }

    .zone[data-dragging] .zone-icon {
      color: var(--ex-accent, #0e7c6b);
    }

    .zone-text {
      margin: 0;
      font-size: 0.92rem;
    }

    .zone-btn {
      font: inherit;
      font-weight: 700;
      color: var(--ex-accent, #0e7c6b);
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }

    .zone-accept {
      margin: 0;
      font-size: 0.78rem;
      color: var(--ex-muted, #585d66);
    }

    .files {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .file {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.45rem 0.7rem;
      font-size: 0.85rem;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
    }

    .file-name {
      font-weight: 600;
      color: var(--ex-text, #17191c);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      flex: none;
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 0.76rem;
      color: var(--ex-muted, #585d66);
    }

    @media (prefers-reduced-motion: reduce) {
      .zone {
        transition: none;
      }
    }
  `,
})
export class FileUploadMultipleExample {
  protected readonly files = signal<readonly File[]>([]);

  protected onFiles(list: FileList): void {
    this.files.set(Array.from(list));
  }

  protected sizeLabel(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
