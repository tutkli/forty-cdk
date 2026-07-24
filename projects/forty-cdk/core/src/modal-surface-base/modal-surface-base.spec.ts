import {
  booleanAttribute,
  Component,
  Directive,
  input,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../../src/test-utils';
import { injectModalShell } from '../modal-shell/modal-shell';
import { ModalSurfaceBase } from './modal-surface-base';

type TestReason = 'escape' | 'pointerDownOutside' | 'focusOutside' | 'closeButton' | 'programmatic';

@Directive({ selector: '[testModalSurface]' })
class TestSurface extends ModalSurfaceBase<TestReason> {
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly modal = input(true, { transform: booleanAttribute });
  readonly returnFocus = input(true, { transform: booleanAttribute });
  readonly initialFocus = input<'first' | 'container'>('first');

  protected readonly errorPrefix = '[forty-cdk/test-surface]';

  constructor() {
    super();
    injectModalShell(this.modalShellConfig());
  }
}

@Component({
  imports: [TestSurface],
  template: `
    @if (open()) {
      <div
        testModalSurface
        [dismissible]="dismissible()"
        [modal]="modal()"
        [alert]="alert()"
        [initialFocus]="initialFocus()"
        [ariaLabel]="ariaLabel()"
        (dismiss)="reasons.push($event)"
      >
        <button id="inside">inside</button>
      </div>
    }
  `,
})
class SurfaceHost {
  readonly surface = viewChild(TestSurface);
  readonly open = signal(true);
  readonly dismissible = signal(true);
  readonly modal = signal(true);
  readonly alert = signal(false);
  readonly initialFocus = signal<'first' | 'container'>('first');
  readonly ariaLabel = signal<string | null>(null);
  readonly reasons: TestReason[] = [];
}

function surfaceEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[testModalSurface]');
}

describe('ModalSurfaceBase', () => {
  afterEachOverlayCleanup();

  describe('inherited ARIA / state host bindings', () => {
    it('reflects role, aria-modal, data-state="open", and tabindex from the base host block', async () => {
      const r = renderHost(SurfaceHost);
      await flush(r.fixture);

      const el = surfaceEl()!;
      expect(el.getAttribute('role')).toBe('dialog');
      expect(el.getAttribute('aria-modal')).toBe('true');
      expect(el.getAttribute('data-state')).toBe('open');
      expect(el.getAttribute('tabindex')).toBe('-1');
    });

    it('switches role to alertdialog when alert=true', async () => {
      const r = renderHost(SurfaceHost);
      r.instance.alert.set(true);
      await flush(r.fixture);

      expect(surfaceEl()!.getAttribute('role')).toBe('alertdialog');
    });

    it('drops aria-modal when modal=false', async () => {
      const r = renderHost(SurfaceHost);
      r.instance.modal.set(false);
      await flush(r.fixture);

      expect(surfaceEl()!.hasAttribute('aria-modal')).toBe(false);
    });

    it('emits a truthy ariaLabel and drops the attribute for an empty one', async () => {
      const r = renderHost(SurfaceHost);
      r.instance.ariaLabel.set('Prompt');
      await flush(r.fixture);
      expect(surfaceEl()!.getAttribute('aria-label')).toBe('Prompt');

      r.instance.ariaLabel.set('');
      await flush(r.fixture);
      expect(surfaceEl()!.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('label / description registry', () => {
    it('drives aria-labelledby from registered label ids', async () => {
      const r = renderHost(SurfaceHost);
      await flush(r.fixture);
      expect(surfaceEl()!.hasAttribute('aria-labelledby')).toBe(false);

      r.instance.surface()!.registerLabel('lbl-1');
      await flush(r.fixture);
      expect(surfaceEl()!.getAttribute('aria-labelledby')).toBe('lbl-1');

      r.instance.surface()!.unregisterLabel('lbl-1');
      await flush(r.fixture);
      expect(surfaceEl()!.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('drives aria-describedby from registered description ids', async () => {
      const r = renderHost(SurfaceHost);
      await flush(r.fixture);

      r.instance.surface()!.registerDescription('desc-1');
      await flush(r.fixture);
      expect(surfaceEl()!.getAttribute('aria-describedby')).toBe('desc-1');
    });
  });

  describe('requestClose gating', () => {
    it('is a no-op for a gated reason when dismissible=false', async () => {
      const r = renderHost(SurfaceHost);
      r.instance.dismissible.set(false);
      await flush(r.fixture);

      r.instance.surface()!.requestClose('escape');
      await flush(r.fixture);
      expect(r.instance.reasons).toEqual([]);
    });

    it('always emits (dismiss) for closeButton / programmatic regardless of dismissible', async () => {
      const r = renderHost(SurfaceHost);
      r.instance.dismissible.set(false);
      await flush(r.fixture);

      r.instance.surface()!.requestClose('closeButton');
      r.instance.surface()!.requestClose('programmatic');
      await flush(r.fixture);
      expect(r.instance.reasons).toEqual(['closeButton', 'programmatic']);
    });

    it('emits a gated reason when dismissible=true', async () => {
      const r = renderHost(SurfaceHost);
      await flush(r.fixture);

      r.instance.surface()!.requestClose('escape');
      await flush(r.fixture);
      expect(r.instance.reasons).toEqual(['escape']);
    });
  });

  describe('backdrop registry', () => {
    it('throws with the subclass errorPrefix when a second backdrop is registered', async () => {
      const r = renderHost(SurfaceHost);
      await flush(r.fixture);

      const a = document.createElement('div');
      const b = document.createElement('div');
      r.instance.surface()!.registerBackdrop(a);
      expect(() => r.instance.surface()!.registerBackdrop(b)).toThrow(
        /\[forty-cdk\/test-surface\] Multiple/,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects host bindings and gates requestClose under provideZonelessChangeDetection', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      const r = renderHost(SurfaceHost);
      r.instance.dismissible.set(false);
      await flush(r.fixture);

      const el = surfaceEl()!;
      expect(el.getAttribute('role')).toBe('dialog');
      expect(el.getAttribute('data-state')).toBe('open');

      r.instance.surface()!.requestClose('escape');
      await flush(r.fixture);
      expect(r.instance.reasons).toEqual([]);

      r.instance.surface()!.registerLabel('z-label');
      await flush(r.fixture);
      expect(el.getAttribute('aria-labelledby')).toBe('z-label');
    });
  });
});
