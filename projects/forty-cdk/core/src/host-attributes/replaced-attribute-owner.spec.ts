import { signal } from '@angular/core';

import { claimReplacedAttribute, type ReplacedAttribute } from './replaced-attribute-owner';

function element(name: ReplacedAttribute, value?: string): HTMLElement {
  const el = document.createElement('div');
  if (value !== undefined) {
    el.setAttribute(name, value);
  }
  return el;
}

describe.each<ReplacedAttribute>(['aria-labelledby', 'aria-errormessage'])(
  'claimReplacedAttribute(%s)',
  (name) => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('writes the claim value when the element carries no consumer value', () => {
      const el = element(name);
      const only = claimReplacedAttribute(el, name, () => 'label');

      only.write();

      expect(el.getAttribute(name)).toBe('label');
    });

    it('keeps the consumer value over every claim', () => {
      const el = element(name, 'mine');
      const only = claimReplacedAttribute(el, name, () => 'label');

      only.write();

      expect(only.consumer).toBe('mine');
      expect(el.getAttribute(name)).toBe('mine');
    });

    it('writes the earliest claim that resolves a value, whichever claim writes', () => {
      const el = element(name);
      const first = signal<string | null>('first');
      claimReplacedAttribute(el, name, () => first());
      const second = claimReplacedAttribute(el, name, () => 'second');

      second.write();
      expect(el.getAttribute(name)).toBe('first');

      first.set(null);
      second.write();
      expect(el.getAttribute(name)).toBe('second');
    });

    it('captures the consumer value once, before any claim writes', () => {
      const el = element(name, 'mine');
      const first = claimReplacedAttribute(el, name, () => 'label');
      first.write();
      el.setAttribute(name, 'label');
      const second = claimReplacedAttribute(el, name, () => 'other');

      expect(second.consumer).toBe('mine');
      second.write();
      expect(el.getAttribute(name)).toBe('mine');
    });

    it('hands the attribute to the next claim when the holder is released', () => {
      const el = element(name);
      const first = claimReplacedAttribute(el, name, () => 'first');
      claimReplacedAttribute(el, name, () => 'second');
      first.write();

      first.release();

      expect(el.getAttribute(name)).toBe('second');
    });

    it('restores the consumer value once the last claim is released', () => {
      const el = element(name, 'mine');
      const only = claimReplacedAttribute(el, name, () => 'label');
      only.write();

      only.release();

      expect(el.getAttribute(name)).toBe('mine');
    });

    it('removes the attribute on release when the consumer set none', () => {
      const el = element(name);
      const only = claimReplacedAttribute(el, name, () => 'label');
      only.write();

      only.release();

      expect(el.hasAttribute(name)).toBe(false);
    });

    it('removes the attribute while no claim resolves a value and no consumer value exists', () => {
      const el = element(name);
      const only = claimReplacedAttribute(el, name, () => '');

      only.write();

      expect(el.hasAttribute(name)).toBe(false);
    });

    it('ignores a second release of the same claim', () => {
      const el = element(name);
      const first = claimReplacedAttribute(el, name, () => 'first');
      first.release();
      const second = claimReplacedAttribute(el, name, () => 'second');
      second.write();

      first.release();

      expect(el.getAttribute(name)).toBe('second');
    });

    it('keeps each attribute of one element to its own claims', async () => {
      const other: ReplacedAttribute =
        name === 'aria-labelledby' ? 'aria-errormessage' : 'aria-labelledby';
      const el = element(name);
      const mine = claimReplacedAttribute(el, name, () => 'mine');
      const theirs = claimReplacedAttribute(el, other, () => 'theirs');

      mine.write();
      theirs.write();
      await Promise.resolve();

      expect(el.getAttribute(name)).toBe('mine');
      expect(el.getAttribute(other)).toBe('theirs');
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns once when a second claim is still registered after the pass settles', async () => {
      const el = element(name);
      claimReplacedAttribute(el, name, () => 'first');
      claimReplacedAttribute(el, name, () => 'second');
      claimReplacedAttribute(el, name, () => 'third');

      await Promise.resolve();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain('FORCDK-CORE-013');
      expect(String(warn.mock.calls[0]?.[0])).toContain(name);
    });

    it('does not warn when the second claim is released in the same pass', async () => {
      const el = element(name);
      const outgoing = claimReplacedAttribute(el, name, () => 'outgoing');
      claimReplacedAttribute(el, name, () => 'incoming');
      outgoing.release();

      await Promise.resolve();

      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn while the consumer value replaces every claim', async () => {
      const el = element(name, 'mine');
      claimReplacedAttribute(el, name, () => 'first');
      claimReplacedAttribute(el, name, () => 'second');

      await Promise.resolve();

      expect(warn).not.toHaveBeenCalled();
    });

    it('warns again on a new entry into a contested state', async () => {
      const el = element(name);
      claimReplacedAttribute(el, name, () => 'first');
      const second = claimReplacedAttribute(el, name, () => 'second');
      await Promise.resolve();
      second.release();

      claimReplacedAttribute(el, name, () => 'third');
      await Promise.resolve();

      expect(warn).toHaveBeenCalledTimes(2);
    });
  },
);
