import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { installObserverPolyfills } from 'forty-cdk/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { afterEachOverlayCleanup } from '../../../../forty-cdk/src/test-utils/overlay-cleanup';
import { CommandPalette, SEARCH_INDEX_LOADER } from './command-palette';

/**
 * The palette when its index chunk cannot be fetched
 * ([#2329](https://github.com/tutkli/forty-cdk/issues/2329)): a reader who
 * kept the site open across a redeploy asks for a chunk whose hashed name no
 * longer exists, and the palette has to fall back to the documents it holds.
 */
describe('the command palette', () => {
  let restoreObservers: () => void;

  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });

  afterEach(() => {
    restoreObservers();
  });

  afterEachOverlayCleanup();

  it('falls back to the documents when the index chunk fails to load', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: SEARCH_INDEX_LOADER,
          useValue: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
        },
      ],
    });
    const fixture = TestBed.createComponent(CommandPalette);
    fixture.componentRef.setInput('open', true);
    await flush(fixture);

    const input = document.querySelector<HTMLInputElement>('.cmdk-input');
    if (input === null) {
      throw new Error('the palette rendered no search field');
    }
    input.value = 'dialog';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush(fixture);

    const labels = [...document.querySelectorAll('.cmdk-option')].map((option) =>
      option.getAttribute('aria-label'),
    );

    expect(labels).toContain('Dialog, Primitives');
  });
});
