import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { installObserverPolyfills } from 'forty-cdk/testing';
import { ForToastManager } from 'forty-cdk/toast';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { afterEachOverlayCleanup } from '../../../../forty-cdk/src/test-utils/overlay-cleanup';
import { HomePage } from './home.page';

/**
 * The landing page's install-copy button, which has to tell every reader what
 * happened the way the demo Copy button does
 * ([#2394](https://github.com/tutkli/forty-cdk/issues/2394)): a name swap on a
 * focused control is not reliably announced, and a failure used to say nothing.
 */
describe('the landing install-copy button', () => {
  let restoreObservers: () => void;

  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });

  afterEach(() => {
    restoreObservers();
    vi.unstubAllGlobals();
  });

  afterEachOverlayCleanup();

  async function pressCopy(clipboard: Pick<Clipboard, 'writeText'> | undefined) {
    vi.stubGlobal('navigator', { ...navigator, clipboard });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const show = vi.spyOn(TestBed.inject(ForToastManager), 'show');
    const fixture = TestBed.createComponent(HomePage);
    await flush(fixture);

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.install-copy',
    );
    if (button === null) {
      throw new Error('the landing page rendered no install-copy button');
    }
    button.click();
    await flush(fixture);

    return show.mock.calls.map(([options]) => ({
      variant: options?.variant,
      title: options?.title,
    }));
  }

  it('announces the copy once the command is on the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());

    const toasts = await pressCopy({ writeText });

    expect(writeText).toHaveBeenCalledWith('npm install forty-cdk');
    expect(toasts).toEqual([{ variant: 'success', title: 'Copied to clipboard' }]);
  });

  it('announces a browser with no Clipboard API instead of doing nothing', async () => {
    const toasts = await pressCopy(undefined);

    expect(toasts).toEqual([{ variant: 'error', title: 'Clipboard unavailable in this browser' }]);
  });

  it('announces a write the browser rejects instead of swallowing it', async () => {
    const toasts = await pressCopy({
      writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
    });

    expect(toasts).toEqual([{ variant: 'error', title: 'Could not copy the install command' }]);
  });
});
