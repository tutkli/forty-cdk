import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { ThemeToggle } from './theme-toggle';

describe('the theme toggle', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (): string | null => null,
      setItem: (): void => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps one name while aria-checked carries the theme', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ThemeToggle);
    await flush(fixture);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    if (button === null) {
      throw new Error('the theme toggle rendered no button');
    }
    const before = {
      name: button.getAttribute('aria-label'),
      checked: button.getAttribute('aria-checked'),
    };

    button.click();
    await flush(fixture);

    const after = {
      name: button.getAttribute('aria-label'),
      checked: button.getAttribute('aria-checked'),
    };

    expect(button.getAttribute('role')).toBe('switch');
    expect(before).toEqual({ name: 'Dark theme', checked: 'false' });
    expect(after).toEqual({ name: 'Dark theme', checked: 'true' });
  });
});
