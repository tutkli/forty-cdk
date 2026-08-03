import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../src/test-utils';
import { renderHost } from '../../src/test-utils/render';
import { ForFileUpload } from './file-upload';
import { ForFileUploadInput } from './file-upload-input';
import type { ForFileUploadRejection } from './file-upload-rejection';
import { ForFileUploadTrigger } from './file-upload-trigger';

@Component({
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div
      forFileUpload
      [accept]="accept()"
      [multiple]="multiple()"
      [directory]="directory()"
      [disabled]="disabled()"
      (filesChange)="onFiles($event)"
      (filesRejected)="onRejected($event)"
    >
      <button forFileUploadTrigger data-testid="trigger">Choose files</button>
      <input forFileUploadInput data-testid="input" aria-label="Upload files" />
    </div>
  `,
})
class FileUploadHost {
  readonly accept = signal<string | null>(null);
  readonly multiple = signal(false);
  readonly directory = signal(false);
  readonly disabled = signal(false);
  readonly capturedFiles = signal<FileList | null>(null);
  readonly rejectedFiles = signal<ForFileUploadRejection[] | null>(null);
  onFiles(files: FileList): void {
    this.capturedFiles.set(files);
  }
  onRejected(rejections: ForFileUploadRejection[]): void {
    this.rejectedFiles.set(rejections);
  }
}

@Component({
  imports: [ForFileUpload],
  template: `
    <div forFileUpload [disabled]="disabled()" (filesChange)="onFiles($event)">drop zone</div>
  `,
})
class FileUploadDropOnlyHost {
  readonly disabled = signal(false);
  readonly capturedFiles = signal<FileList | null>(null);
  onFiles(files: FileList): void {
    this.capturedFiles.set(files);
  }
}

@Component({
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div forFileUpload>
      <button forFileUploadTrigger data-testid="trigger">Choose</button>
      @if (showInput()) {
        <input forFileUploadInput data-testid="input" aria-label="Upload" />
      }
    </div>
  `,
})
class ToggleInputHost {
  readonly showInput = signal(true);
}

@Component({
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div forFileUpload>
      <button forFileUploadTrigger data-testid="trigger">Choose</button>
      <input forFileUploadInput data-testid="first" aria-label="First" />
      @if (showSecond()) {
        <input forFileUploadInput data-testid="second" aria-label="Second" />
      }
    </div>
  `,
})
class DuplicateInputHost {
  readonly showSecond = signal(true);
}

describe('ForFileUpload', () => {
  describe('input attribute mirroring', () => {
    it('reflects type="file", accept, multiple, and disabled on the native input', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;

      expect(input.getAttribute('type')).toBe('file');
      expect(input.getAttribute('accept')).toBeNull();
      expect(input.hasAttribute('multiple')).toBe(false);
      expect(input.hasAttribute('disabled')).toBe(false);

      instance.accept.set('image/*');
      instance.multiple.set(true);
      await f();

      expect(input.getAttribute('accept')).toBe('image/*');
      expect(input.getAttribute('multiple')).toBe('');

      instance.disabled.set(true);
      await f();

      expect(input.hasAttribute('disabled')).toBe(true);

      instance.disabled.set(false);
      await f();

      expect(input.hasAttribute('disabled')).toBe(false);
    });

    it('reflects webkitdirectory reactively from the directory input', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;

      expect(input.hasAttribute('webkitdirectory')).toBe(false);

      instance.directory.set(true);
      await f();

      expect(input.getAttribute('webkitdirectory')).toBe('');

      instance.directory.set(false);
      await f();

      expect(input.hasAttribute('webkitdirectory')).toBe(false);
    });
  });

  describe('trigger opens dialog', () => {
    it('calls click() on the native input when the trigger is clicked', async () => {
      const { el } = renderHost(FileUploadHost);
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;
      const trigger = el.querySelector<HTMLButtonElement>('[forFileUploadTrigger]')!;
      const spy = vi.spyOn(input, 'click').mockImplementation(() => undefined);

      trigger.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled blocks dialog', () => {
    it('does not call click() when disabled and reflects disabled on the trigger', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;
      const trigger = el.querySelector<HTMLButtonElement>('[forFileUploadTrigger]')!;
      const spy = vi.spyOn(input, 'click').mockImplementation(() => undefined);

      instance.disabled.set(true);
      await f();

      expect(trigger.hasAttribute('disabled')).toBe(true);
      trigger.click();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('data-dragging reflection', () => {
    it('reflects data-dragging on dragenter and removes it on dragleave', async () => {
      const { el, flush: f } = renderHost(FileUploadHost);
      const zone = el.querySelector('[forFileUpload]') as HTMLElement;

      zone.dispatchEvent(new Event('dragenter', { bubbles: true, cancelable: true }));
      await f();
      expect(zone.getAttribute('data-dragging')).toBe('');

      zone.dispatchEvent(new Event('dragleave', { bubbles: true }));
      await f();
      expect(zone.hasAttribute('data-dragging')).toBe(false);
    });

    it('depth counter keeps data-dragging present until matching number of leaves', async () => {
      const { el, flush: f } = renderHost(FileUploadHost);
      const zone = el.querySelector('[forFileUpload]') as HTMLElement;

      zone.dispatchEvent(new Event('dragenter', { bubbles: true, cancelable: true }));
      await f();
      zone.dispatchEvent(new Event('dragenter', { bubbles: true, cancelable: true }));
      await f();

      zone.dispatchEvent(new Event('dragleave', { bubbles: true }));
      await f();
      expect(zone.getAttribute('data-dragging')).toBe('');

      zone.dispatchEvent(new Event('dragleave', { bubbles: true }));
      await f();
      expect(zone.hasAttribute('data-dragging')).toBe(false);
    });
  });

  describe('filesChange on drop', () => {
    it('emits the dropped files when a file is dropped', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadDropOnlyHost);
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      const file = new File(['x'], 'a.txt', { type: 'text/plain' });
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { files: [file] as unknown as FileList, dropEffect: 'none' },
      });
      zone.dispatchEvent(event);
      await f();

      const captured = instance.capturedFiles();
      expect(captured!.length).toBe(1);
      expect(captured![0]!.name).toBe('a.txt');
    });
  });

  describe('accept filtering on drop', () => {
    @Component({
      imports: [ForFileUpload],
      template: `
        <div
          forFileUpload
          [accept]="accept()"
          [multiple]="multiple()"
          (filesChange)="onFiles($event)"
          (filesRejected)="onRejected($event)"
        >
          drop zone
        </div>
      `,
    })
    class AcceptDropHost {
      readonly accept = signal<string | null>(null);
      readonly multiple = signal(false);
      readonly accepted = signal<FileList | null>(null);
      readonly rejected = signal<ForFileUploadRejection[] | null>(null);
      onFiles(files: FileList): void {
        this.accepted.set(files);
      }
      onRejected(rejections: ForFileUploadRejection[]): void {
        this.rejected.set(rejections);
      }
    }

    const drop = (zone: HTMLElement, files: File[]): void => {
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { files: files as unknown as FileList, dropEffect: 'none' },
      });
      zone.dispatchEvent(event);
    };

    it('keeps a dropped file that matches a `type/*` wildcard', async () => {
      const { el, instance, flush: f } = renderHost(AcceptDropHost);
      instance.accept.set('image/*');
      await f();
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      drop(zone, [new File(['x'], 'photo.png', { type: 'image/png' })]);
      await f();

      expect(instance.accepted()?.length).toBe(1);
      expect(instance.accepted()![0]!.name).toBe('photo.png');
      expect(instance.rejected()).toBeNull();
    });

    it('rejects a dropped file whose type is not accepted and reports it on filesRejected', async () => {
      const { el, instance, flush: f } = renderHost(AcceptDropHost);
      instance.accept.set('image/*');
      await f();
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      drop(zone, [new File(['x'], 'malware.exe', { type: 'application/octet-stream' })]);
      await f();

      expect(instance.accepted()).toBeNull();
      expect(instance.rejected()?.map((r) => r.file.name)).toEqual(['malware.exe']);
    });

    it('matches by file extension case-insensitively', async () => {
      const { el, instance, flush: f } = renderHost(AcceptDropHost);
      instance.accept.set('.pdf');
      await f();
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      drop(zone, [new File(['x'], 'report.PDF', { type: '' })]);
      await f();

      expect(instance.accepted()?.length).toBe(1);
      expect(instance.rejected()).toBeNull();
    });

    it('rejects every non-matching file in a multi-file drop', async () => {
      const { el, instance, flush: f } = renderHost(AcceptDropHost);
      instance.accept.set('image/*');
      instance.multiple.set(true);
      await f();
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      drop(zone, [
        new File(['x'], 'a.exe', { type: 'application/octet-stream' }),
        new File(['x'], 'b.bat', { type: 'application/octet-stream' }),
      ]);
      await f();

      expect(instance.accepted()).toBeNull();
      expect(instance.rejected()?.map((r) => r.file.name)).toEqual(['a.exe', 'b.bat']);
    });

    describe('single-file overflow', () => {
      beforeEach(() => {
        vi.stubGlobal(
          'DataTransfer',
          class {
            readonly #files: File[] = [];
            readonly items = { add: (file: File): void => void this.#files.push(file) };
            get files(): FileList {
              return this.#files as unknown as FileList;
            }
          },
        );
      });

      it('rejects the overflow files with reason "multiple" when multiple is false', async () => {
        const { el, instance, flush: f } = renderHost(AcceptDropHost);
        await f();
        const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

        drop(zone, [
          new File(['x'], 'a.txt', { type: 'text/plain' }),
          new File(['x'], 'b.txt', { type: 'text/plain' }),
          new File(['x'], 'c.txt', { type: 'text/plain' }),
        ]);
        await f();

        expect(instance.accepted()!.length).toBe(1);
        expect(instance.accepted()![0]!.name).toBe('a.txt');
        expect(instance.rejected()!.map((r) => [r.file.name, r.reason])).toEqual([
          ['b.txt', 'multiple'],
          ['c.txt', 'multiple'],
        ]);
        expect(instance.accepted()!.length + instance.rejected()!.length).toBe(3);
      });

      it('mixes accept failures and overflow in one emission, in source order', async () => {
        const { el, instance, flush: f } = renderHost(AcceptDropHost);
        instance.accept.set('image/*');
        await f();
        const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

        drop(zone, [
          new File(['x'], 'notes.txt', { type: 'text/plain' }),
          new File(['x'], 'a.png', { type: 'image/png' }),
          new File(['x'], 'b.png', { type: 'image/png' }),
        ]);
        await f();

        expect(Array.from(instance.accepted()!).map((file) => file.name)).toEqual(['a.png']);
        expect(instance.rejected()!.map((r) => [r.file.name, r.reason])).toEqual([
          ['notes.txt', 'accept'],
          ['b.png', 'multiple'],
        ]);
      });

      it('keeps every accepted file when multiple is true', async () => {
        const { el, instance, flush: f } = renderHost(AcceptDropHost);
        instance.multiple.set(true);
        await f();
        const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

        drop(zone, [
          new File(['x'], 'a.txt', { type: 'text/plain' }),
          new File(['x'], 'b.txt', { type: 'text/plain' }),
          new File(['x'], 'c.txt', { type: 'text/plain' }),
        ]);
        await f();

        expect(instance.accepted()!.length).toBe(3);
        expect(instance.rejected()).toBeNull();
      });
    });
  });

  describe('drag state while disabled', () => {
    const dragEvent = (type: string): Event => new Event(type, { bubbles: true, cancelable: true });

    it('clears data-dragging when disabled mid-drag and a dragleave arrives', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      zone.dispatchEvent(dragEvent('dragenter'));
      await f();
      expect(zone.getAttribute('data-dragging')).toBe('');

      instance.disabled.set(true);
      await f();

      zone.dispatchEvent(dragEvent('dragleave'));
      await f();
      expect(zone.hasAttribute('data-dragging')).toBe(false);
    });

    it('clears data-dragging and emits nothing when a drop lands after disabling mid-drag', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      zone.dispatchEvent(dragEvent('dragenter'));
      await f();

      instance.disabled.set(true);
      await f();

      const event = dragEvent('drop');
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          files: [new File(['x'], 'a.txt', { type: 'text/plain' })] as unknown as FileList,
          dropEffect: 'none',
        },
      });
      zone.dispatchEvent(event);
      await f();

      expect(zone.hasAttribute('data-dragging')).toBe(false);
      expect(instance.capturedFiles()).toBeNull();
      expect(instance.rejectedFiles()).toBeNull();
    });

    it('resets the drag depth counter so a later drag cycle toggles data-dragging once', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      zone.dispatchEvent(dragEvent('dragenter'));
      await f();
      zone.dispatchEvent(dragEvent('dragenter'));
      await f();

      instance.disabled.set(true);
      await f();
      zone.dispatchEvent(dragEvent('drop'));
      await f();

      instance.disabled.set(false);
      await f();

      zone.dispatchEvent(dragEvent('dragenter'));
      await f();
      expect(zone.getAttribute('data-dragging')).toBe('');

      zone.dispatchEvent(dragEvent('dragleave'));
      await f();
      expect(zone.hasAttribute('data-dragging')).toBe(false);
    });

    it('does not mark itself a drop target while disabled', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      const enabled = dragEvent('dragover');
      zone.dispatchEvent(enabled);
      await f();
      expect(enabled.defaultPrevented).toBe(true);

      instance.disabled.set(true);
      await f();

      const disabled = dragEvent('dragover');
      zone.dispatchEvent(disabled);
      await f();
      expect(disabled.defaultPrevented).toBe(false);
    });
  });

  describe('disabled blocks drop emission', () => {
    it('does not emit filesChange when disabled', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadDropOnlyHost);
      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;

      instance.disabled.set(true);
      await f();

      const file = new File(['x'], 'b.txt', { type: 'text/plain' });
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { files: [file] as unknown as FileList, dropEffect: 'none' },
      });
      zone.dispatchEvent(event);
      await f();

      expect(instance.capturedFiles()).toBeNull();
    });
  });

  describe('change on the input emits filesChange', () => {
    it('wires input change event to filesChange', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;
      const file = new File(['x'], 'c.txt', { type: 'text/plain' });

      Object.defineProperty(input, 'files', {
        value: [file] as unknown as FileList,
        configurable: true,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await f();

      const captured = instance.capturedFiles();
      expect(captured![0]!.name).toBe('c.txt');
    });

    it('applies the accept filter to a dialog selection made through the "All files" override', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      instance.accept.set('image/*');
      await f();
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;

      Object.defineProperty(input, 'files', {
        value: [new File(['x'], 'notes.txt', { type: 'text/plain' })] as unknown as FileList,
        configurable: true,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await f();

      expect(instance.capturedFiles()).toBeNull();
      expect(instance.rejectedFiles()?.map((r) => r.file.name)).toEqual(['notes.txt']);
    });
  });

  describe('accept filtering on dialog change', () => {
    it('clears the native input when an all-rejected dialog selection is made', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      instance.accept.set('image/*');
      await f();
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;

      Object.defineProperty(input, 'files', {
        value: [
          new File(['x'], 'a.exe', { type: 'application/octet-stream' }),
        ] as unknown as FileList,
        configurable: true,
      });
      const setValue = vi.spyOn(input, 'value', 'set');
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await f();

      expect(instance.rejectedFiles()?.map((r) => r.file.name)).toEqual(['a.exe']);
      expect(instance.capturedFiles()).toBeNull();
      expect(setValue).toHaveBeenCalledWith('');
    });

    it('does not clear a prior input selection when a drop is fully rejected', async () => {
      const { el, instance, flush: f } = renderHost(FileUploadHost);
      instance.accept.set('image/*');
      await f();
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;

      Object.defineProperty(input, 'files', {
        value: [new File(['x'], 'photo.png', { type: 'image/png' })] as unknown as FileList,
        configurable: true,
      });
      const setValue = vi.spyOn(input, 'value', 'set');

      const zone = el.querySelector<HTMLElement>('[forFileUpload]')!;
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          files: [
            new File(['x'], 'b.exe', { type: 'application/octet-stream' }),
          ] as unknown as FileList,
          dropEffect: 'none',
        },
      });
      zone.dispatchEvent(event);
      await f();

      expect(instance.rejectedFiles()?.map((r) => r.file.name)).toEqual(['b.exe']);
      expect(setValue).not.toHaveBeenCalled();
    });
  });

  describe('input registration lifecycle', () => {
    it('stops clicking a detached input once the [forFileUploadInput] unmounts', async () => {
      const { el, instance, flush: f } = renderHost(ToggleInputHost);
      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;
      const trigger = el.querySelector<HTMLButtonElement>('[forFileUploadTrigger]')!;
      const spy = vi.spyOn(input, 'click').mockImplementation(() => undefined);

      instance.showInput.set(false);
      await f();

      expect(el.querySelector('input[forFileUploadInput]')).toBeNull();
      expect(() => trigger.click()).not.toThrow();
      expect(spy).not.toHaveBeenCalled();
    });

    it('opens the remounted input after the [forFileUploadInput] returns', async () => {
      const { el, instance, flush: f } = renderHost(ToggleInputHost);

      instance.showInput.set(false);
      await f();
      instance.showInput.set(true);
      await f();

      const input = el.querySelector<HTMLInputElement>('input[forFileUploadInput]')!;
      const trigger = el.querySelector<HTMLButtonElement>('[forFileUploadTrigger]')!;
      const spy = vi.spyOn(input, 'click').mockImplementation(() => undefined);

      trigger.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('warns when a second [forFileUploadInput] registers under one [forFileUpload]', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderHost(DuplicateInputHost);

      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain('[forty-cdk/file-upload]');
      expect(message).toContain('[forFileUploadInput]');
    });

    it('falls back to the surviving input when a duplicate unmounts', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { el, instance, flush: f } = renderHost(DuplicateInputHost);
      const first = el.querySelector<HTMLInputElement>('[data-testid="first"]')!;
      const trigger = el.querySelector<HTMLButtonElement>('[forFileUploadTrigger]')!;
      const spy = vi.spyOn(first, 'click').mockImplementation(() => undefined);

      instance.showSecond.set(false);
      await f();

      trigger.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('orphan guard', () => {
    it('throws a prefixed error when [forFileUploadTrigger] is used without [forFileUpload]', () => {
      @Component({
        imports: [ForFileUploadTrigger],
        template: `<button forFileUploadTrigger>orphan</button>`,
      })
      class OrphanTrigger {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => {
        const fixture = TestBed.createComponent(OrphanTrigger);
        fixture.detectChanges();
      }).toThrow(/\[forty-cdk\/file-upload\]/);
    });

    it('throws a prefixed error when [forFileUploadInput] is used without [forFileUpload]', () => {
      @Component({
        imports: [ForFileUploadInput],
        template: `<input forFileUploadInput aria-label="orphan" />`,
      })
      class OrphanInput {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => {
        const fixture = TestBed.createComponent(OrphanInput);
        fixture.detectChanges();
      }).toThrow(/\[forty-cdk\/file-upload\]/);
    });
  });

  describe('reactive updates', () => {
    it('reflects a disabled write on the trigger and the input', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      const fixture = TestBed.createComponent(FileUploadHost);
      await flush(fixture);

      const trigger = fixture.nativeElement.querySelector(
        '[forFileUploadTrigger]',
      ) as HTMLButtonElement;
      const input = fixture.nativeElement.querySelector(
        'input[forFileUploadInput]',
      ) as HTMLInputElement;

      expect(trigger.hasAttribute('disabled')).toBe(false);
      expect(input.hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.disabled.set(true);
      await flush(fixture);

      expect(trigger.hasAttribute('disabled')).toBe(true);
      expect(input.hasAttribute('disabled')).toBe(true);

      fixture.componentInstance.disabled.set(false);
      await flush(fixture);

      expect(trigger.hasAttribute('disabled')).toBe(false);
      expect(input.hasAttribute('disabled')).toBe(false);
    });
  });
});
