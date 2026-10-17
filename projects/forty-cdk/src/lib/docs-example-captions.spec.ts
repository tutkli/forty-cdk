import { pressKey, pressWithMouse } from 'forty-cdk/testing';

import { FieldDefaultExample } from '../../../forty-cdk-docs/src/app/demos/field/examples/default.example';
import { FieldValidationExample } from '../../../forty-cdk-docs/src/app/demos/field/examples/validation.example';
import { FileUploadDefaultExample } from '../../../forty-cdk-docs/src/app/demos/file-upload/examples/default.example';
import { NumberInputFormattingExample } from '../../../forty-cdk-docs/src/app/demos/number-input/examples/formatting.example';
import { ProgressDefaultExample } from '../../../forty-cdk-docs/src/app/demos/progress/examples/default.example';
import { nextMacrotask } from '../test-utils/flush';
import { renderHost } from '../test-utils/render';

describe('docs example captions perform on their demos', () => {
  describe('file upload hero: "Press the button, or drop a file anywhere on the zone"', () => {
    it('opens the file chooser from the button', async () => {
      const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
      const { query, flush } = renderHost(FileUploadDefaultExample);
      await flush();

      query<HTMLButtonElement>('[forFileUploadTrigger]')!.click();

      expect(click).toHaveBeenCalledTimes(1);
    });

    it('lists a file dropped on the zone', async () => {
      const { query, queryAll, flush } = renderHost(FileUploadDefaultExample);
      await flush();

      Object.defineProperty(query('[forFileUploadInput]')!, 'files', {
        value: null,
        writable: true,
      });
      const drop = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(drop, 'dataTransfer', {
        value: {
          types: ['Files'],
          files: [
            new File(['x'], 'report.pdf', { type: 'application/pdf' }),
          ] as unknown as FileList,
          dropEffect: 'none',
        },
      });
      query<HTMLElement>('[forFileUpload]')!.dispatchEvent(drop);
      await flush();

      expect(queryAll('.file-name').map((name) => name.textContent)).toEqual(['report.pdf']);
    });
  });

  describe('field hero: the label focuses the control and the host reflects data-required', () => {
    it('labels the control with the pressed label and reflects only the states the demo binds', async () => {
      const { query, flush } = renderHost(FieldDefaultExample);
      await flush();

      const input = query<HTMLInputElement>('[forFieldControl]')!;
      input.focus();
      input.value = 'x';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.blur();
      await flush();

      const field = query<HTMLElement>('[forField]')!;
      expect(Array.from(input.labels ?? [])).toEqual([query('[forLabel]')]);
      expect(field.hasAttribute('data-required')).toBe(true);
      expect(field.hasAttribute('data-invalid')).toBe(false);
      expect(field.hasAttribute('data-disabled')).toBe(false);
    });
  });

  describe('field validation: "Tick and untick it, then move focus away"', () => {
    it('surfaces the required error only once focus leaves the checkbox', async () => {
      const { query, flush } = renderHost(FieldValidationExample);
      await flush();

      const checkbox = query<HTMLButtonElement>('[forCheckbox]')!;
      pressWithMouse(checkbox);
      pressWithMouse(checkbox);
      await flush();
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
      expect(query('[forFieldError]')).toBeNull();

      checkbox.blur();
      await flush();
      expect(query('[forFieldError]')!.textContent!.trim()).not.toBe('');
    });
  });

  describe('number input formatting: "step it to the next whole dollar"', () => {
    it('moves the off-grid amount to the adjacent whole dollar, then by one', async () => {
      const { query, flush } = renderHost(NumberInputFormattingExample);
      await flush();

      const input = query<HTMLInputElement>('[forNumberInput]')!;
      const hint = query<HTMLElement>('.hint')!;
      expect(hint.textContent).toContain('value() is 1234.5');

      pressKey(input, 'ArrowUp');
      await flush();
      expect(hint.textContent).toContain('value() is 1235.');

      pressKey(input, 'ArrowUp');
      await flush();
      expect(hint.textContent).toContain('value() is 1236.');
    });
  });

  describe('progress hero: "Press Advance until the bar fills"', () => {
    beforeEach(() => {
      document.querySelectorAll('[aria-live]').forEach((region) => region.remove());
    });

    it('reaches complete, announces it, and restarts from zero', async () => {
      const { query, flush } = renderHost(ProgressDefaultExample);
      await flush();

      const bar = query<HTMLElement>('[forProgress]')!;
      const button = query<HTMLButtonElement>('button')!;
      expect(bar.getAttribute('data-state')).toBe('loading');
      expect(bar.getAttribute('data-value')).toBe('60');

      button.click();
      await flush();
      expect(bar.getAttribute('data-value')).toBe('80');
      expect(bar.getAttribute('data-state')).toBe('loading');

      button.click();
      await flush();
      await nextMacrotask();
      expect(bar.getAttribute('data-value')).toBe('100');
      expect(bar.getAttribute('data-state')).toBe('complete');
      expect(query('[forProgressIndicator]')!.getAttribute('data-state')).toBe('complete');
      expect(document.querySelector('[aria-live="polite"]')!.textContent).not.toBe('');
      expect(button.textContent!.trim()).toBe('Restart');

      button.click();
      await flush();
      expect(bar.getAttribute('data-value')).toBe('0');
      expect(bar.getAttribute('data-state')).toBe('loading');
      expect(button.textContent!.trim()).toBe('Advance');
    });
  });
});
