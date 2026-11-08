import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForButton } from 'forty-cdk/button';
import { ForToolbar, ForToolbarButton, ForToolbarLink } from 'forty-cdk/toolbar';

import { renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const CLICK_HOST_LISTENER = /'\((?:click|auxclick)\)':\s*'(\w+)\(/g;

const GUARD_HOME = 'core/src/synthetic-activation/disabled-click-guard.ts';

/** The body of the method `name` declared in `code`, brace-matched, or `null`. */
function methodBody(code: string, name: string): string | null {
  const declaration = new RegExp(`\\b${name}\\([^)]*\\)(?::\\s*[\\w<>|\\s]+)?\\s*\\{`).exec(code);
  if (!declaration) {
    return null;
  }
  const start = declaration.index + declaration[0].length;
  let depth = 1;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') {
      depth++;
    } else if (code[i] === '}' && --depth === 0) {
      return code.slice(start, i);
    }
  }
  return null;
}

/** Every `(click)` / `(auxclick)` host listener in library code, keyed `<file>::<method>`. */
function clickHostListeners(): Map<string, string> {
  const listeners = new Map<string, string>();
  for (const [path, code] of LIBRARY_CODE) {
    for (const match of code.matchAll(CLICK_HOST_LISTENER)) {
      const body = methodBody(code, match[1]!);
      if (body !== null) {
        listeners.set(`${path}::${match[1]}`, body);
      }
    }
  }
  return listeners;
}

@Component({
  imports: [ForButton, ForToolbar, ForToolbarButton, ForToolbarLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      forButton
      data-testid="button"
      [disabled]="disabled()"
      (click)="count('button')"
      (activate)="count('activate')"
    >
      <span>Save</span>
    </button>
    <div forToolbar aria-label="Edit">
      <button
        forToolbarButton
        data-testid="toolbar-button"
        [disabled]="disabled()"
        (click)="count('toolbar-button')"
      >
        <span>Undo</span>
      </button>
      <a
        forToolbarLink
        data-testid="toolbar-link"
        href="#help"
        [disabled]="disabled()"
        (click)="count('toolbar-link')"
        (auxclick)="count('toolbar-link-aux')"
      >
        <span>Help</span>
      </a>
    </div>
  `,
})
class Host {
  readonly disabled = signal(true);
  readonly counts = signal<Record<string, number>>({});

  count(key: string): void {
    this.counts.update((counts) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 }));
  }
}

const ADOPTERS = ['button', 'toolbar-button', 'toolbar-link'] as const;

describe('disabled click guard adopters', () => {
  it('reads the body of every (click) host listener in library code', () => {
    const bound = [...LIBRARY_CODE.values()].reduce(
      (count, code) => count + [...code.matchAll(CLICK_HOST_LISTENER)].length,
      0,
    );
    expect(bound).toBeGreaterThan(40);
    expect(clickHostListeners().size).toBe(bound);
  });

  it('suppresses no disabled click by hand in a (click) host listener', () => {
    const handWritten = [...clickHostListeners()]
      .filter(([, body]) => body.includes('stopImmediatePropagation'))
      .map(([site]) => site);

    expect(handWritten).toEqual([]);
  });

  it('keeps stopImmediatePropagation on a click inside the core guard only', () => {
    const sites = [...LIBRARY_CODE]
      .filter(
        ([, code]) =>
          code.includes('stopImmediatePropagation') &&
          /addEventListener\(\s*'(?:click|auxclick)'/.test(code),
      )
      .map(([path]) => path);

    expect(sites).toEqual([GUARD_HOME]);
  });

  it('guards every adopter through injectDisabledClickGuard', () => {
    for (const path of [
      'button/src/button.ts',
      'toolbar/src/toolbar-button.ts',
      'toolbar/src/toolbar-link.ts',
    ]) {
      expect(LIBRARY_CODE.get(path), path).toContain('injectDisabledClickGuard(');
    }
  });

  for (const id of ADOPTERS) {
    describe(id, () => {
      it('runs no template (click) handler when the disabled host is clicked', () => {
        const { fixture, query } = renderHost(Host);
        const host = query<HTMLElement>(`[data-testid="${id}"]`)!;

        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        host.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(fixture.componentInstance.counts()).toEqual({});
      });

      it('runs no template (click) handler when a child of the disabled host is clicked', () => {
        const { fixture, query } = renderHost(Host);
        const child = query<HTMLElement>(`[data-testid="${id}"] span`)!;

        child.click();

        expect(fixture.componentInstance.counts()).toEqual({});
      });

      it('runs the template (click) handler once enabled', async () => {
        const { fixture, query, flush } = renderHost(Host);
        fixture.componentInstance.disabled.set(false);
        await flush();
        const host = query<HTMLElement>(`[data-testid="${id}"]`)!;

        host.click();

        expect(fixture.componentInstance.counts()[id]).toBe(1);
      });
    });
  }

  it('emits activate from an enabled button and never from a disabled one', async () => {
    const { fixture, query, flush } = renderHost(Host);
    const button = query<HTMLElement>('[data-testid="button"]')!;

    button.click();
    expect(fixture.componentInstance.counts()['activate']).toBeUndefined();

    fixture.componentInstance.disabled.set(false);
    await flush();
    button.click();
    expect(fixture.componentInstance.counts()['activate']).toBe(1);
  });

  it('runs no template (auxclick) handler for a middle-click on a disabled link', () => {
    const { fixture, query } = renderHost(Host);
    const link = query<HTMLElement>('[data-testid="toolbar-link"]')!;

    const event = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.counts()).toEqual({});
  });
});
