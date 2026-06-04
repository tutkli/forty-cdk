import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectTypeahead, Typeahead } from './typeahead';

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: k, ...init });

describe('Typeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an empty buffer', () => {
    const t = new Typeahead();
    expect(t.buffer()).toBe('');
  });

  it('appends printable characters to the buffer', () => {
    const t = new Typeahead();
    expect(t.handle(key('a'))).toBe(true);
    expect(t.handle(key('b'))).toBe(true);
    expect(t.buffer()).toBe('ab');
  });

  it('ignores non-printable keys', () => {
    const t = new Typeahead();
    expect(t.handle(key('ArrowDown'))).toBe(false);
    expect(t.handle(key('Enter'))).toBe(false);
    expect(t.handle(key('Tab'))).toBe(false);
    expect(t.handle(key('Escape'))).toBe(false);
    expect(t.buffer()).toBe('');
  });

  it('ignores the first Space (empty buffer) so widgets can use it for activation', () => {
    const t = new Typeahead();
    expect(t.handle(key(' '))).toBe(false);
    expect(t.buffer()).toBe('');
  });

  it('accumulates Space once the buffer is non-empty (multi-word prefixes)', () => {
    const t = new Typeahead();
    expect(t.handle(key('n'))).toBe(true);
    expect(t.handle(key('e'))).toBe(true);
    expect(t.handle(key('w'))).toBe(true);
    expect(t.handle(key(' '))).toBe(true);
    expect(t.handle(key('y'))).toBe(true);
    expect(t.buffer()).toBe('new y');
  });

  it('rejects Space again after the buffer resets to empty', () => {
    const t = new Typeahead({ debounceMs: 300 });
    t.handle(key('a'));
    expect(t.handle(key(' '))).toBe(true);
    expect(t.buffer()).toBe('a ');

    vi.advanceTimersByTime(300);
    expect(t.buffer()).toBe('');
    expect(t.handle(key(' '))).toBe(false);
    expect(t.buffer()).toBe('');
  });

  it('ignores keys with modifier keys held', () => {
    const t = new Typeahead();
    expect(t.handle(key('a', { ctrlKey: true }))).toBe(false);
    expect(t.handle(key('a', { altKey: true }))).toBe(false);
    expect(t.handle(key('a', { metaKey: true }))).toBe(false);
    expect(t.buffer()).toBe('');
  });

  it('resets the buffer after debounceMs of no keypresses', () => {
    const t = new Typeahead({ debounceMs: 300 });
    t.handle(key('a'));
    t.handle(key('b'));
    expect(t.buffer()).toBe('ab');

    vi.advanceTimersByTime(299);
    expect(t.buffer()).toBe('ab');

    vi.advanceTimersByTime(1);
    expect(t.buffer()).toBe('');
  });

  it('extends the debounce window on each new keypress', () => {
    const t = new Typeahead({ debounceMs: 300 });
    t.handle(key('a'));
    vi.advanceTimersByTime(200);
    t.handle(key('b'));
    vi.advanceTimersByTime(200);
    expect(t.buffer()).toBe('ab');
    vi.advanceTimersByTime(101);
    expect(t.buffer()).toBe('');
  });

  it('reset() clears buffer and timer', () => {
    const t = new Typeahead({ debounceMs: 300 });
    t.handle(key('a'));
    t.reset();
    expect(t.buffer()).toBe('');
    vi.advanceTimersByTime(500);
    // No re-clear since buffer was already empty; just verifies no throw.
    expect(t.buffer()).toBe('');
  });

  it('destroy() clears the pending timer', () => {
    const t = new Typeahead({ debounceMs: 300 });
    t.handle(key('a'));
    t.destroy();
    // Timer cancelled — buffer stays as it was at destroy time.
    vi.advanceTimersByTime(500);
    expect(t.buffer()).toBe('a');
  });

  describe('injectTypeahead', () => {
    it('auto-destroys when the host directive is torn down', () => {
      let captured!: Typeahead;

      @Component({
        standalone: true,
        template: '',
      })
      class Host {
        readonly typeahead = (() => {
          captured = injectTypeahead({ debounceMs: 300 });
          return captured;
        })();
      }

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      captured.handle(key('a'));
      expect(captured.buffer()).toBe('a');

      fixture.destroy();
      // After destroy, the timer is cancelled — fast-forwarding does not reset.
      vi.advanceTimersByTime(500);
      expect(captured.buffer()).toBe('a');
    });
  });
});
