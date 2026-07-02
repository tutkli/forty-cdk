import { ɵPLATFORM_SERVER_ID } from '@angular/common';
import {
  Component,
  Directive,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type Signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WritingDirection } from '../keyboard-navigation/keyboard-navigation';
import { flush } from '../../../src/test-utils/flush';
import { injectTextDirection } from './text-direction';

@Directive({
  selector: '[probeDir]',
  host: {
    '[attr.dir]': 'resolved()',
  },
})
class DirProbe {
  readonly explicit = signal<WritingDirection | null>(null);
  readonly resolved: Signal<WritingDirection> = injectTextDirection(this.explicit);
}

@Component({
  imports: [DirProbe],
  template: `
    <div [attr.dir]="ancestorDir()">
      <span probeDir></span>
    </div>
  `,
})
class Host {
  readonly ancestorDir = signal<string | null>(null);
}

@Component({
  imports: [DirProbe],
  template: `
    <div [attr.dir]="ancestorDir()">
      @for (i of probes; track i) {
        <span probeDir></span>
      }
    </div>
  `,
})
class MultiHost {
  readonly probes = [0, 1, 2, 3, 4];
  readonly ancestorDir = signal<string | null>(null);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  const probe = fixture.debugElement.children[0]!.children[0]!.injector.get(DirProbe);
  const host = fixture.nativeElement.querySelector('[probeDir]') as HTMLElement;
  return { fixture, probe, host };
}

function renderMulti() {
  const fixture = TestBed.createComponent(MultiHost);
  const probeHosts = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[probeDir]')) as HTMLElement[];
  return { fixture, probeHosts };
}

describe('injectTextDirection', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute('dir');
  });

  describe('browser platform', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    });

    it('defaults to ltr with no explicit dir and no ambient ancestor', async () => {
      const { fixture, host } = render();
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');
    });

    it('resolves rtl from an ancestor [dir] when no explicit dir is set', async () => {
      const { fixture, host } = render();
      fixture.componentInstance.ancestorDir.set('rtl');
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('rtl');
    });

    it('resolves rtl from <html dir="rtl"> when there is no closer ancestor', async () => {
      document.documentElement.setAttribute('dir', 'rtl');
      const { fixture, host } = render();
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('rtl');
    });

    it('lets an explicit dir win over an rtl ancestor', async () => {
      const { fixture, probe, host } = render();
      fixture.componentInstance.ancestorDir.set('rtl');
      probe.explicit.set('ltr');
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');
    });

    it('normalises a non-rtl ancestor value (auto) to ltr', async () => {
      const { fixture, host } = render();
      fixture.componentInstance.ancestorDir.set('auto');
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');
    });

    it('reacts to a runtime flip of the ancestor dir', async () => {
      const { fixture, host } = render();
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.ancestorDir.set('rtl');
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('rtl');
    });

    it('reacts to a runtime flip of <html dir>', async () => {
      const { fixture, host } = render();
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');

      document.documentElement.setAttribute('dir', 'rtl');
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('rtl');
    });

    it('creates at most one document-level dir observer across many primitives', async () => {
      const observeSpy = vi.spyOn(globalThis.MutationObserver.prototype, 'observe');

      const { fixture, probeHosts } = renderMulti();
      await flush(fixture);

      const hosts = probeHosts();
      expect(hosts).toHaveLength(5);
      for (const host of hosts) {
        expect(host.getAttribute('dir')).toBe('ltr');
      }

      const documentObserveCalls = observeSpy.mock.calls.filter(
        ([target]) => target === document.documentElement,
      );
      expect(documentObserveCalls).toHaveLength(1);
    });

    it('updates every probe on a single <html dir> flip', async () => {
      const { fixture, probeHosts } = renderMulti();
      await flush(fixture);
      for (const host of probeHosts()) {
        expect(host.getAttribute('dir')).toBe('ltr');
      }

      document.documentElement.setAttribute('dir', 'rtl');
      await flush(fixture);
      for (const host of probeHosts()) {
        expect(host.getAttribute('dir')).toBe('rtl');
      }
    });

    it('goes stale on reparent into a different-dir subtree until a dir mutation fires (documented limitation)', async () => {
      const { fixture, host } = render();
      const ltrBox = fixture.nativeElement.querySelector('div') as HTMLElement;

      const rtlBox = document.createElement('div');
      rtlBox.setAttribute('dir', 'rtl');
      ltrBox.parentElement!.appendChild(rtlBox);

      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');

      // Move the probe host under the rtl subtree without touching any `dir`
      // attribute. The shared observer only watches `dir` mutations, not
      // childList, so the ambient does NOT recompute and stays stale at ltr.
      rtlBox.appendChild(host);
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('ltr');

      // Any subsequent `dir` mutation in the document forces the recompute,
      // and the host now resolves rtl from its new ancestor.
      document.documentElement.setAttribute('dir', 'ltr');
      await flush(fixture);
      expect(host.getAttribute('dir')).toBe('rtl');

      rtlBox.remove();
    });
  });

  describe('server platform', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
        ],
      });
    });

    it('does not throw and defaults to ltr on the server even with an rtl ancestor', async () => {
      document.documentElement.setAttribute('dir', 'rtl');
      let host!: HTMLElement;
      expect(() => {
        const r = render();
        host = r.host;
        r.fixture.detectChanges();
      }).not.toThrow();
      expect(host.getAttribute('dir')).toBe('ltr');
    });
  });
});
