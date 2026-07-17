import { Directive, effect, ElementRef, inject, input } from '@angular/core';

/**
 * Applies a per-row attribute map to a `<for-table-body>` stamped row. The body
 * places it on every stamped row so its `rowAttrs` hook can set or remove
 * arbitrary attributes derived from the row datum, without the body owning a
 * static list of attribute names. A key mapped to `null` (or dropped from a
 * later map) removes that attribute. Internal to `forty-cdk/table`.
 */
@Directive({ selector: '[forTableRowAttrs]' })
export class ForTableRowAttrs {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The attribute map to reflect on the row host, or `undefined` for none. */
  readonly attrs = input<Record<string, string | null> | undefined>(undefined, {
    alias: 'forTableRowAttrs',
  });

  constructor() {
    let applied: readonly string[] = [];
    effect(() => {
      const next = this.attrs() ?? {};
      for (const key of applied) {
        if (!(key in next)) {
          this.#host.removeAttribute(key);
        }
      }
      const keys: string[] = [];
      for (const [key, value] of Object.entries(next)) {
        if (value == null) {
          this.#host.removeAttribute(key);
        } else {
          this.#host.setAttribute(key, value);
        }
        keys.push(key);
      }
      applied = keys;
    });
  }
}
