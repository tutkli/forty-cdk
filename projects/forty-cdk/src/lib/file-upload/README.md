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

### Disabled

```html
<div forFileUpload [disabled]="isDisabled()">
  <input forFileUploadInput aria-label="Upload files" class="sr-only" />
  <button forFileUploadTrigger>Choose files</button>
</div>
```

## Data attributes

| Attribute       | When present                                         |
| --------------- | ---------------------------------------------------- |
| `data-dragging` | Files are actively being dragged over the drop zone. |
| `data-disabled` | The zone (and all its pieces) is disabled.           |
