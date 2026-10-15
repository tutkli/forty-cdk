import type { Type, WritableSignal } from '@angular/core';

import { renderHost } from '../render';

export type NativeSubmissionEntries = ReadonlyArray<readonly [string, string]>;

export interface NativeSubmissionHost {
  readonly fieldsetDisabled: WritableSignal<boolean>;
  commit(): void;
  clear(): void;
}

export interface NativeSubmissionContractOptions {
  entries: NativeSubmissionEntries;
  label?: string;
}

function submitted(form: HTMLFormElement): Array<[string, string]> {
  return sorted([...new FormData(form).entries()].map(([name, value]) => [name, String(value)]));
}

function sorted(entries: NativeSubmissionEntries): Array<[string, string]> {
  return entries
    .map(([name, value]): [string, string] => [name, value])
    .sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
}

export function assertNativeSubmissionContract(
  host: Type<NativeSubmissionHost>,
  options: NativeSubmissionContractOptions,
): void {
  const expected = sorted(options.entries);
  const title = options.label
    ? `native submission contract (${options.label})`
    : 'native submission contract';

  async function mount() {
    const r = renderHost(host);
    await r.flush();
    const form = r.el.querySelector('form');
    if (form === null) {
      throw new Error(`${host.name} renders no <form> around the control under test.`);
    }
    return { r, form };
  }

  describe(title, () => {
    it('declares the entries it expects the committed value to submit', () => {
      expect(expected.length).toBeGreaterThan(0);
    });

    it('submits nothing before a value is committed', async () => {
      const { form } = await mount();

      expect(submitted(form)).toEqual([]);
    });

    it('submits the committed value under its name', async () => {
      const { r, form } = await mount();

      r.instance.commit();
      await r.flush();

      expect(submitted(form)).toEqual(expected);
    });

    it('stops submitting once the value is cleared', async () => {
      const { r, form } = await mount();
      r.instance.commit();
      await r.flush();

      r.instance.clear();
      await r.flush();

      expect(submitted(form)).toEqual([]);
    });

    it('submits nothing while a surrounding [forFieldset] is disabled', async () => {
      const { r, form } = await mount();
      r.instance.commit();
      await r.flush();

      r.instance.fieldsetDisabled.set(true);
      await r.flush();
      expect(submitted(form)).toEqual([]);

      r.instance.fieldsetDisabled.set(false);
      await r.flush();
      expect(submitted(form)).toEqual(expected);
    });
  });
}
