import {
  afterNextRender,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injectable,
  Injector,
  input,
  signal,
} from '@angular/core';

import { renderHost } from '../../../src/test-utils';
import type { HostRovingItemHandle } from './host-roving-context';
import { injectRovingFocusRestore } from './roving-focus-restore';
import { RovingTabindex } from './roving-tabindex';

@Injectable()
class TestRovingGroup {
  readonly #items = signal<readonly HostRovingItemHandle[]>([]);
  readonly roving = new RovingTabindex(() => this.#items(), { fallback: 'nearest' });

  constructor() {
    injectRovingFocusRestore(this.roving);
  }

  register(handle: HostRovingItemHandle): void {
    this.#items.update((items) => [...items, handle]);
  }

  unregister(handle: HostRovingItemHandle): void {
    this.#items.update((items) => items.filter((item) => item !== handle));
  }
}

@Directive({
  selector: '[testRovingItem]',
  host: {
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'group.roving.tabindexFor(host)',
    '(focus)': 'group.roving.setActive(host)',
  },
})
class TestRovingItem {
  readonly disabled = input(false);
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly group = inject(TestRovingGroup);

  constructor() {
    const handle: HostRovingItemHandle = { host: this.host, disabled: this.disabled };
    this.group.register(handle);
    inject(DestroyRef).onDestroy(() => this.group.unregister(handle));
  }
}

@Component({
  imports: [TestRovingItem],
  providers: [TestRovingGroup],
  template: `
    <button data-test="outside">Outside</button>
    @for (id of ids(); track id) {
      <button testRovingItem [disabled]="disabledIds().includes(id)" [attr.data-test]="id">
        {{ id }}
      </button>
    }
  `,
})
class Host {
  readonly ids = signal(['a', 'b', 'c']);
  readonly disabledIds = signal<readonly string[]>([]);
  readonly #injector = inject(Injector);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  removeAndFocusIfLost(id: string, target: string): void {
    this.ids.update((ids) => ids.filter((each) => each !== id));
    afterNextRender(
      () => {
        if (document.activeElement === document.body) {
          byTest(this.#host, target).focus();
        }
      },
      { injector: this.#injector },
    );
  }
}

const byTest = (root: HTMLElement, id: string): HTMLElement =>
  root.querySelector<HTMLElement>(`[data-test="${id}"]`)!;

async function mountFocused(id: string) {
  const r = renderHost(Host);
  await r.flush();
  byTest(r.el, id).focus();
  await r.flush();
  expect(document.activeElement).toBe(byTest(r.el, id));
  return r;
}

describe('injectRovingFocusRestore', () => {
  it('moves focus to the item before the focused one when it is removed', async () => {
    const { el, instance, flush } = await mountFocused('b');

    instance.ids.set(['a', 'c']);
    await flush();

    expect(document.activeElement).toBe(byTest(el, 'a'));
    expect(byTest(el, 'a').getAttribute('tabindex')).toBe('0');
  });

  it('moves focus to the item after it when the first item is removed', async () => {
    const { el, instance, flush } = await mountFocused('a');

    instance.ids.set(['b', 'c']);
    await flush();

    expect(document.activeElement).toBe(byTest(el, 'b'));
  });

  it('leaves focus on a control outside the group that removed the active item', async () => {
    const { el, instance, flush } = await mountFocused('b');
    byTest(el, 'outside').focus();

    instance.ids.set(['a', 'c']);
    await flush();

    expect(document.activeElement).toBe(byTest(el, 'outside'));
    expect(byTest(el, 'a').getAttribute('tabindex')).toBe('0');
  });

  it('yields to a focus move another render hook makes in the same render', async () => {
    const { el, instance, flush } = await mountFocused('b');

    instance.removeAndFocusIfLost('b', 'c');
    await flush();

    expect(document.activeElement).toBe(byTest(el, 'c'));
  });

  it('moves focus to the item before when a focused item is disabled and then removed', async () => {
    const { el, instance, flush } = await mountFocused('b');
    instance.disabledIds.set(['b']);
    await flush();
    expect(document.activeElement).toBe(byTest(el, 'b'));

    instance.ids.set(['a', 'c']);
    await flush();

    expect(document.activeElement).toBe(byTest(el, 'a'));
    expect(byTest(el, 'a').getAttribute('tabindex')).toBe('0');
  });

  it('leaves focus on <body> when the active item leaves after focus left the group', async () => {
    const { el, instance, flush } = await mountFocused('b');
    byTest(el, 'b').blur();
    await flush();
    expect(document.activeElement).toBe(document.body);

    instance.ids.set(['a', 'c']);
    await flush();

    expect(document.activeElement).toBe(document.body);
    expect(byTest(el, 'a').getAttribute('tabindex')).toBe('0');
  });

  it('leaves focus on an item disabled in place', async () => {
    const { el, instance, flush } = await mountFocused('b');

    instance.disabledIds.set(['b']);
    await flush();

    expect(document.activeElement).toBe(byTest(el, 'b'));
    expect(byTest(el, 'a').getAttribute('tabindex')).toBe('0');
  });
});
