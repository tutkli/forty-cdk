import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../test-utils';
import { renderHost } from '../../test-utils/render';
import { ForFileUpload } from './file-upload';
import { ForFileUploadInput } from './file-upload-input';
import { ForFileUploadTrigger } from './file-upload-trigger';

@Component({
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div
      forFileUpload
      [accept]="accept()"
      [multiple]="multiple()"
      [disabled]="disabled()"
      (filesChange)="onFiles($event)"
    >
      <button forFileUploadTrigger data-testid="trigger">Choose files</button>
      <input forFileUploadInput data-testid="input" aria-label="Upload files" />
    </div>
  `,
})
class FileUploadHost {
  readonly accept = signal<string | null>(null);
  readonly multiple = signal(false);
  readonly disabled = signal(false);
  readonly capturedFiles = signal<FileList | null>(null);
  onFiles(files: FileList): void {
    this.capturedFiles.set(files);
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
      expect(captured).not.toBeNull();
      expect(captured!.length).toBe(1);
      expect(captured![0].name).toBe('a.txt');
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
      expect(captured).not.toBeNull();
      expect(captured![0].name).toBe('c.txt');
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

  describe('zoneless reactivity', () => {
    it('reflects an external disabled set without Zone.js', async () => {
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
