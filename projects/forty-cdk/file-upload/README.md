---
title: File Upload
group: primitives
archetype: [composable-ui]
---

# FileUpload

A headless drag-and-drop / dialog file-selection zone: a visually-hidden native `<input type="file">` stays the accessible control while a trigger button opens the picker, and dropping files emits the same change. Supports multiple, accept filters and whole-folder (directory) selection.

No ARIA role is imposed on the drop zone — it is a plain container. The `<input type="file">` remains the accessible form control; the trigger is a native `<button>`.

## Anatomy

```html
<div forFileUpload accept="image/*,.pdf" (filesChange)="onFiles($event)">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
  <p>or drag and drop</p>
</div>
```

## Examples

### Stand-alone

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

With `multiple` off the zone keeps the first accepted file and surfaces the extras on `filesRejected` with the reason `'multiple'` — nothing is discarded silently, so a consumer can tell the user why only one file went through. Combining `directory` with `multiple` off is therefore noisy by design: every file in the chosen folder past the first is reported as a `'multiple'` rejection.

### Handling rejections

```ts
onRejected(rejections: ForFileUploadRejection[]): void {
  for (const { file, reason } of rejections) {
    console.warn(`${file.name} rejected: ${reason}`);
  }
}
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

## API

### `ForFileUpload`

| Property    | Type             | Description                                                                                           |
| ----------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `accept`    | `string \| null` | MIME types or file extensions accepted by the chooser (e.g. `"image/*,.pdf"`).<br>**Default:** `null` |
| `multiple`  | `boolean`        | Whether multiple files can be selected at once.<br>**Default:** `false`                               |
| `directory` | `boolean`        | Whether the picker selects a whole folder (mirrored as `webkitdirectory`).<br>**Default:** `false`    |
| `disabled`  | `boolean`        | Whether the zone and all its pieces are disabled.<br>**Default:** `false`                             |

| Output          | Type                       | Description                                                                                                                                                                                                                         |
| --------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filesChange`   | `FileList`                 | Files chosen via the dialog or dropped onto the zone, filtered against `accept` before emission through either path.                                                                                                                |
| `filesRejected` | `ForFileUploadRejection[]` | Files refused by `accept` or by the single-file cap of `multiple="false"`, each paired with the reason (`'accept'` / `'multiple'`). Fires only when at least one file was refused; every selected file lands in exactly one output. |

| Data attribute  | Values                                                              |
| --------------- | ------------------------------------------------------------------- |
| `data-dragging` | present while files are dragged over the drop zone, else absent     |
| `data-disabled` | present when the zone (and all its pieces) is disabled, else absent |

## Accessibility

- **The `<input type="file">` is the accessible control.** Keep it reachable with a visually-hidden utility class (`sr-only` / `visually-hidden`) rather than `display: none` or `visibility: hidden`, which would remove it from the tab order and from assistive technology.
- **Label the input.** Supply `aria-label` directly on `[forFileUploadInput]` (as in the examples above), or wrap it in a `<label>`.
- **The trigger is a native `<button>`.** It receives focus, is announced as a button, and activates the file dialog via click / Enter / Space — no ARIA role augmentation needed.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_FILE_UPLOAD_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
