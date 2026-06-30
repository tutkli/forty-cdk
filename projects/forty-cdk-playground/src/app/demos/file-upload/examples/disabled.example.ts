import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';

@Component({
  selector: 'app-file-upload-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div class="stage">
      <div forFileUpload disabled class="zone">
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
          <button forFileUploadTrigger class="zone-btn">Choose a file</button>
          or drag and drop
        </p>
        <p class="zone-accept">Uploads are paused</p>
      </div>
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
      color: var(--pg-text-muted);
      background: var(--pg-surface);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
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
  `,
})
export class FileUploadDisabledExample {}
