import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk';

import { ControlSelect, type ControlOption } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

type AcceptMode = 'all' | 'images' | 'pdf';

@Component({
  selector: 'app-file-upload-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForFileUpload,
    ForFileUploadInput,
    ForFileUploadTrigger,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Drop zone with a file dialog"
      subtitle="forFileUpload is a headless drop zone: the visually-hidden <input type='file'> stays the accessible form control, the trigger button opens the native dialog, and dropping files onto the zone emits the same (filesChange). data-dragging reflects an active drag-over so you can light up the target."
      sourcePath="projects/forty-cdk-playground/src/app/demos/file-upload/examples/basic.example.ts"
    >
      <div demo class="stage">
        <div
          forFileUpload
          class="zone"
          [multiple]="multiple()"
          [disabled]="disabled()"
          [accept]="accept()"
          (filesChange)="onFiles($event)"
        >
          <input forFileUploadInput class="sr-only" aria-label="Upload files" />

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
            <button forFileUploadTrigger class="zone-btn">Choose files</button>
            or drag and drop
          </p>
          <p class="zone-accept">{{ acceptLabel() }}</p>
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

      <div controls class="pg-controls">
        <app-control-switch label="multiple" [(checked)]="multiple" />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-select label="accept" [options]="acceptOptions" [(value)]="acceptMode" />

        <p class="pg-state">
          files: <b>{{ files().length }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
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
      color: var(--pg-text-muted);
      background: var(--pg-surface);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }

    .zone[data-dragging] {
      border-color: var(--pg-primary);
      background: color-mix(in srgb, var(--pg-primary) 8%, var(--pg-surface));
    }

    .zone[data-disabled] {
      opacity: 0.5;
      pointer-events: none;
    }

    .zone-icon {
      width: 34px;
      height: 34px;
      color: var(--pg-text-muted);
    }

    .zone[data-dragging] .zone-icon {
      color: var(--pg-primary);
    }

    .zone-text {
      margin: 0;
      font-size: 0.92rem;
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
      color: var(--pg-text-muted);
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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .file-name {
      font-weight: 600;
      color: var(--pg-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      flex: none;
      font-family: var(--pg-font-mono);
      font-size: 0.76rem;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .zone {
        transition: none;
      }
    }
  `,
})
export class FileUploadBasicExample {
  protected readonly multiple = signal(true);
  protected readonly disabled = signal(false);
  protected readonly acceptMode = signal<AcceptMode>('all');
  protected readonly files = signal<readonly File[]>([]);

  protected readonly acceptOptions: readonly ControlOption<AcceptMode>[] = [
    { value: 'all', label: 'Any file' },
    { value: 'images', label: 'Images' },
    { value: 'pdf', label: 'PDF' },
  ];

  protected readonly accept = computed<string | null>(() => {
    switch (this.acceptMode()) {
      case 'images':
        return 'image/*';
      case 'pdf':
        return '.pdf,application/pdf';
      default:
        return null;
    }
  });

  protected readonly acceptLabel = computed(() => {
    switch (this.acceptMode()) {
      case 'images':
        return 'Images only';
      case 'pdf':
        return 'PDF documents only';
      default:
        return 'Any file type';
    }
  });

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
