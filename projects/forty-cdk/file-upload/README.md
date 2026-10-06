---
title: File Upload
group: primitives
archetype: [composable-ui]
---

# FileUpload

A headless drag-and-drop / dialog file-selection zone: a visually-hidden native `<input type="file">` stays the accessible control while a trigger button opens the picker, and dropping files emits the same change. Supports multiple, accept filters and whole-folder (directory) selection.

No ARIA role is imposed on the drop zone, which is a plain container. The `<input type="file">` remains the accessible form control; the trigger is a native `<button>`.

## Anatomy

```html
<div forFileUpload accept="image/*,.pdf" (filesChange)="onFiles($event)">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
  <p>or drag and drop</p>
</div>
```

## Examples

Click the zone or drop a file on it. The zone sets `data-dragging` while a file hovers it, and the chosen files arrive as a `FileList` you render yourself.

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';

@Component({
  selector: 'app-file-upload-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div class="stage">
      <div forFileUpload class="zone" (filesChange)="onFiles($event)">
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
        <p class="zone-accept">Any file type</p>
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
})
export class FileUploadDefaultExample {
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
```

### Multiple files

`multiple` lets the picker (and a drop) accept more than one file at once, and `accept` narrows the chooser to the MIME types you list.

```html
<div forFileUpload multiple (filesChange)="onFiles($event)">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
</div>
```

### States

One class and one directive, two states. `disabled` blocks the dialog and drops alike, and a surrounding disabled `[forFieldset]` does the same. It also reflects `data-disabled` on the zone, so the zone dims and ignores pointer events from the same stylesheet that styles `data-dragging`, without the input leaving the DOM.

### Folder selection

Set `directory` to switch the native picker into folder mode. The input mirrors it as `webkitdirectory`, which modern Chromium, Firefox and WebKit all support despite the prefix. Choose a folder and the emitted `FileList` holds every file inside it, each carrying a `webkitRelativePath` to rebuild the tree from. Dropping a folder is out of scope: a drop surfaces `DataTransfer.files` only, with no `webkitGetAsEntry` traversal.

```html
<div forFileUpload directory (filesChange)="onFolder($event)">
  <input forFileUploadInput aria-label="Upload folder" class="sr-only" />
  <button forFileUploadTrigger>Choose folder</button>
</div>
```

## Handling rejections

Every file the zone refuses arrives on `filesRejected` with the reason it was refused, and never reaches `filesChange` or the native input's `files`. A file outside `accept` is rejected with `'accept'`, and a file larger than `maxSize` bytes with `'size'`; a file of exactly `maxSize` bytes is accepted. With `multiple` off, the zone keeps the first accepted file and surfaces the extras with the reason `'multiple'`. That cap is applied last, so a refused file never takes the one slot from a valid file behind it. Nothing is discarded silently, so you can tell the user why a file did not go through. Combining `directory` with `multiple` off is noisy by design: every file in the chosen folder past the first is reported as a `'multiple'` rejection.

```html
<div forFileUpload accept="image/*" [maxSize]="5000000" (filesRejected)="onRejected($event)">
  <input forFileUploadInput aria-label="Upload an image" class="sr-only" />
  <button forFileUploadTrigger>Choose an image</button>
</div>
```

<!-- snippet: fragment -->

```ts
onRejected(rejections: ForFileUploadRejection[]): void {
  for (const { file, reason } of rejections) {
    console.warn(`${file.name} rejected: ${reason}`);
  }
}
```

## Disabled

```html
<div forFileUpload [disabled]="isDisabled()">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
</div>
```

## API

### `ForFileUpload`

| Property    | Type             | Description                                                                                                                 |
| ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `accept`    | `string \| null` | MIME types or file extensions accepted by the chooser (e.g. `"image/*,.pdf"`).<br>**Default:** `null`                       |
| `multiple`  | `boolean`        | Whether multiple files can be selected at once.<br>**Default:** `false`                                                     |
| `directory` | `boolean`        | Whether the picker selects a whole folder (mirrored as `webkitdirectory`).<br>**Default:** `false`                          |
| `maxSize`   | `number \| null` | Largest accepted file size, in bytes; a file of exactly this size is accepted. `null` sets no limit.<br>**Default:** `null` |
| `disabled`  | `boolean`        | Whether the zone and all its pieces are disabled.<br>**Default:** `false`                                                   |

| Output          | Type                       | Description                                                                                                                                                                                                                                                  |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `filesChange`   | `FileList`                 | Files chosen via the dialog or dropped onto the zone, filtered against `accept` and `maxSize` before emission through either path.                                                                                                                           |
| `filesRejected` | `ForFileUploadRejection[]` | Files refused by `accept`, by `maxSize` or by the single-file cap of `multiple="false"`, each paired with the reason (`'accept'` / `'size'` / `'multiple'`). Fires only when at least one file was refused; every selected file lands in exactly one output. |

| Data attribute  | Values                                                              |
| --------------- | ------------------------------------------------------------------- |
| `data-dragging` | present while files are dragged over the drop zone, else absent     |
| `data-disabled` | present when the zone (and all its pieces) is disabled, else absent |

## Accessibility

- **The `<input type="file">` is the accessible control.** Keep it reachable with a visually-hidden utility class (`sr-only` / `visually-hidden`) rather than `display: none` or `visibility: hidden`, which would remove it from the tab order and from assistive technology.
- **Label the input.** Supply `aria-label` directly on `[forFileUploadInput]` (as in the examples above), or wrap it in a `<label>`.
- **The trigger is a native `<button>`.** It receives focus, is announced as a button, and activates the file dialog via click / Enter / Space. No ARIA role augmentation is needed.

## Styling

forty-cdk ships no styles: put your own class on each piece and key your CSS off the `data-*` attributes listed under [API](#api), not off the `for*` selectors ([Styling forty-cdk](../../../docs/styling.md) explains why).

## Wrapping in a design system

Subclass the root and re-provide `FOR_FILE_UPLOAD_CONTEXT` with `useExisting` pointing at the subclass, since Angular does not inherit a directive's `providers`; [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md) walks the pattern.
