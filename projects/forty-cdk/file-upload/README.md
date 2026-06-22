# FileUpload

Headless drag-and-drop / dialog file-selection primitive. No ARIA role is imposed on the drop zone — it is a plain container. The `<input type="file">` remains the accessible form control; the trigger is a native `<button>`.

## Usage

```html
<div forFileUpload accept="image/*,.pdf" (filesChange)="onFiles($event)">
  <!-- Visually hidden input: keep it focusable for keyboard / AT users.
       Apply your own sr-only / visually-hidden CSS utility. -->
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />

  <!-- The trigger opens the native file dialog on click / Enter / Space. -->
  <button forFileUploadTrigger type="button">Choose files</button>

  <p>or drag and drop here</p>
</div>
```

### Multiple files

```html
<div forFileUpload multiple (filesChange)="onFiles($event)">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
</div>
```

### Directory (folder) selection

Set `directory` to switch the native picker into folder-selection mode (mirrored onto the input as `webkitdirectory`). The emitted `FileList` then contains every file inside the chosen folder, each carrying a `webkitRelativePath` the consumer reads to reconstruct the tree.

```html
<div forFileUpload directory (filesChange)="onFolder($event)">
  <input forFileUploadInput aria-label="Upload folder" class="sr-only" />
  <button forFileUploadTrigger>Choose folder</button>
</div>
```

```ts
onFolder(files: FileList): void {
  for (const file of Array.from(files)) {
    console.log(file.webkitRelativePath); // e.g. "photos/2024/img.jpg"
  }
}
```

Despite the `webkit-` prefix the attribute is supported across modern Chromium, Firefox, and WebKit. Directory drag-and-drop (`DataTransferItem.webkitGetAsEntry`) is out of scope — drop continues to surface `DataTransfer.files` only.

### Disabled

```html
<div forFileUpload [disabled]="isDisabled()">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
</div>
```

## Inputs

| Input       | Type             | Default | Description                                                                    |
| ----------- | ---------------- | ------- | ------------------------------------------------------------------------------ |
| `accept`    | `string \| null` | `null`  | MIME types or file extensions accepted by the chooser (e.g. `"image/*,.pdf"`). |
| `multiple`  | `boolean`        | `false` | Whether multiple files can be selected at once.                                |
| `directory` | `boolean`        | `false` | Whether the picker selects a whole folder (mirrored as `webkitdirectory`).     |
| `disabled`  | `boolean`        | `false` | Whether the zone and all its pieces are disabled.                              |

## Data attributes

| Attribute       | When present                                         |
| --------------- | ---------------------------------------------------- |
| `data-dragging` | Files are actively being dragged over the drop zone. |
| `data-disabled` | The zone (and all its pieces) is disabled.           |
