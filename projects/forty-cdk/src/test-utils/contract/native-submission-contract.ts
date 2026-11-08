import type { Type, WritableSignal } from '@angular/core';

import { renderHost } from '../render';

export type NativeSubmissionEntries = ReadonlyArray<readonly [string, string]>;

export interface NativeSubmissionHost {
  readonly fieldsetDisabled: WritableSignal<boolean>;
  readonly required: WritableSignal<boolean>;
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

function invalidControl(form: HTMLFormElement): HTMLElement | undefined {
  return [...form.elements].find(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.willValidate && !element.validity.valid,
  );
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

    it('puts no constraint on the form while not required', async () => {
      const { form } = await mount();

      expect(form.checkValidity()).toBe(true);
    });

    it('fails native constraint validation while required with no value committed', async () => {
      const { r, form } = await mount();

      r.instance.required.set(true);
      await r.flush();

      expect(form.checkValidity()).toBe(false);
      expect(form.matches(':invalid')).toBe(true);
    });

    it('passes native constraint validation once a required value is committed', async () => {
      const { r, form } = await mount();
      r.instance.required.set(true);
      await r.flush();

      r.instance.commit();
      await r.flush();
      expect(form.checkValidity()).toBe(true);
      expect(submitted(form)).toEqual(expected);

      r.instance.clear();
      await r.flush();
      expect(form.checkValidity()).toBe(false);
    });

    it('does not block a form while a surrounding [forFieldset] disables the required control', async () => {
      const { r, form } = await mount();
      r.instance.required.set(true);
      r.instance.fieldsetDisabled.set(true);
      await r.flush();

      expect(form.checkValidity()).toBe(true);
    });

    it('moves the focus the browser gives the invalid element into the control', async () => {
      const { r, form } = await mount();
      r.instance.required.set(true);
      await r.flush();

      invalidControl(form)!.focus();

      const active = document.activeElement;
      expect(active).not.toBe(document.body);
      expect(form.contains(active)).toBe(true);
      expect(active!.closest('[aria-hidden="true"]')).toBeNull();
    });
  });
}
