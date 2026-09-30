import { computed, signal } from '@angular/core';

import { resolveText, resolveTextInput, resolveTextRecord } from './localizable-text';

describe('localizable text', () => {
  it('resolveText returns a string as is and calls a function', () => {
    expect(resolveText('Close')).toBe('Close');
    expect(resolveText(() => 'Cerrar')).toBe('Cerrar');
  });

  it('resolveText inside a computed tracks the signal a function reads', () => {
    const lang = signal<'en' | 'es'>('en');
    const label = computed(() => resolveText(() => (lang() === 'en' ? 'Close' : 'Cerrar')));
    expect(label()).toBe('Close');

    lang.set('es');

    expect(label()).toBe('Cerrar');
  });

  it('resolveTextInput falls back to the key only for an unset input', () => {
    expect(resolveTextInput(undefined, () => 'Scope')).toBe('Scope');
    expect(resolveTextInput('Own', () => 'Scope')).toBe('Own');
    expect(resolveTextInput(null, () => 'Scope')).toBeNull();
    expect(resolveTextInput('', 'Scope')).toBe('');
  });

  it('resolveTextRecord resolves each scope entry and lets the own record win per key', () => {
    const merged = resolveTextRecord<'day' | 'month' | 'year'>(
      { day: 'jj', month: () => 'mm', year: () => 'aaaa' },
      { year: 'yyyy', month: undefined },
    );

    expect(merged).toEqual({ day: 'jj', month: 'mm', year: 'yyyy' });
  });
});
