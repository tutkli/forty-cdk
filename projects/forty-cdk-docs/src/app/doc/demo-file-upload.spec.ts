import { provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { DEMO_EXAMPLES } from './testing/demo-examples.generated';

const FILE_UPLOAD_DEMOS = DEMO_EXAMPLES.filter((example) =>
  example.path.startsWith('file-upload/'),
);

async function render(
  path: string,
): Promise<{ host: HTMLElement; fixture: ComponentFixture<unknown> }> {
  const example = DEMO_EXAMPLES.find((candidate) => candidate.path === path);
  if (example === undefined) {
    throw new Error(`no example is registered at ${path}`);
  }
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(example.component);
  await flush(fixture);
  return { host: fixture.nativeElement as HTMLElement, fixture };
}

function tabStops(zone: Element): string[] {
  return [...zone.querySelectorAll<HTMLElement>('*')]
    .filter((el) => el.tabIndex >= 0 && !el.matches(':disabled'))
    .map((el) => (el.hasAttribute('forFileUploadTrigger') ? 'trigger' : el.tagName.toLowerCase()));
}

function drop(zone: Element, files: File[]): void {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files: files as unknown as FileList, dropEffect: 'none' },
  });
  zone.dispatchEvent(event);
}

describe('the docs file-upload demos', () => {
  it('are all found, past a floor that catches an empty filter', () => {
    expect(FILE_UPLOAD_DEMOS.length).toBeGreaterThanOrEqual(4);
  });

  it.each(FILE_UPLOAD_DEMOS.map((example) => example.path))(
    '%s makes the trigger the only Tab stop of each zone and hides the native input from assistive tech',
    async (path) => {
      const { host } = await render(path);
      const zones = [...host.querySelectorAll('[forFileUpload]')];
      expect(zones.length).toBeGreaterThan(0);

      expect(
        zones.map((zone) => ({
          tabStops: tabStops(zone),
          inputHidden: zone.querySelector('[forFileUploadInput]')?.getAttribute('aria-hidden'),
        })),
      ).toEqual(
        zones.map((zone) => ({
          tabStops: zone.hasAttribute('data-disabled') ? [] : ['trigger'],
          inputHidden: 'true',
        })),
      );
    },
  );

  describe('file-upload/examples/multiple.example.ts', () => {
    const path = 'file-upload/examples/multiple.example.ts';

    it('names a dropped file that is not an image in the status region instead of dropping it silently', async () => {
      const { host, fixture } = await render(path);
      const status = host.querySelector('[role="status"]');
      expect(status?.textContent?.trim()).toBe('');

      drop(host.querySelector('[forFileUpload]')!, [
        new File(['x'], 'report.pdf', { type: 'application/pdf' }),
      ]);
      await flush(fixture);

      expect(host.querySelector('[role="status"]')).toBe(status);
      expect(
        [...status!.querySelectorAll('.rejected-line')].map((line) => line.textContent?.trim()),
      ).toEqual(['report.pdf: not an image']);
      expect(host.querySelectorAll('.file')).toHaveLength(0);
    });

    it('clears the rejection once an accepted image arrives', async () => {
      const { host, fixture } = await render(path);
      Object.defineProperty(host.querySelector('[forFileUploadInput]')!, 'files', {
        value: null,
        writable: true,
      });
      const zone = host.querySelector('[forFileUpload]')!;

      drop(zone, [new File(['x'], 'report.pdf', { type: 'application/pdf' })]);
      await flush(fixture);
      drop(zone, [new File(['x'], 'photo.png', { type: 'image/png' })]);
      await flush(fixture);

      expect(host.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
      expect([...host.querySelectorAll('.file-name')].map((name) => name.textContent)).toEqual([
        'photo.png',
      ]);
    });
  });
});
