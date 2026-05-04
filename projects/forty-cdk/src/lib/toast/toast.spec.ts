import {
  Component,
  inject,
  provideZonelessChangeDetection,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import type { ForToastTemplateContext } from './toast-context';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForToast } from './toast';
import { ForToastAction } from './toast-action';
import { ForToastClose } from './toast-close';
import { ForToastDescription } from './toast-description';
import { ForToastTitle } from './toast-title';
import { ForToastViewport } from './toast-viewport';
import { ForToastManager, provideForToastDefaults } from './toast-manager';

@Component({
  imports: [ForToastViewport],
  template: `
    <button #opener type="button" data-test-id="opener">Opener</button>
    <for-toast-viewport [maxVisible]="maxVisible()" [hotkey]="hotkey()" />
    <ng-template #titleOnly let-toast let-data="data">
      <span data-test-id="custom-title">{{ data.label }}</span>
      <button type="button" data-test-id="custom-dismiss" (click)="toast.dismiss()">x</button>
    </ng-template>
  `,
})
class ProgrammaticHost {
  readonly toasts = inject(ForToastManager);
  readonly maxVisible = signal<number>(Infinity);
  readonly hotkey = signal<string>('');
  readonly tpl =
    viewChild.required<TemplateRef<ForToastTemplateContext<{ label: string }>>>('titleOnly');
}

@Component({
  imports: [ForToast, ForToastTitle, ForToastDescription, ForToastAction, ForToastClose],
  template: `
    @if (open()) {
      <div
        forToast
        [variant]="variant()"
        [duration]="duration()"
        [closable]="closable()"
        (close)="onClose($event)"
        data-test-id="declarative"
      >
        <div forToastTitle>{{ title() }}</div>
        @if (description()) {
          <div forToastDescription>{{ description() }}</div>
        }
        @if (showAction()) {
          <button forToastAction (click)="onAction()" data-test-id="action">Action</button>
        }
        @if (closable()) {
          <button forToastClose data-test-id="close">×</button>
        }
      </div>
    }
  `,
})
class DeclarativeHost {
  readonly open = signal(true);
  readonly variant = signal<'info' | 'success' | 'warning' | 'error'>('info');
  readonly duration = signal(5000);
  readonly closable = signal(true);
  readonly title = signal('Saved');
  readonly description = signal('Your changes are live.');
  readonly showAction = signal(false);
  readonly closes: string[] = [];
  readonly actionsClicked = signal(0);

  onClose(reason: string): void {
    this.closes.push(reason);
    this.open.set(false);
  }

  onAction(): void {
    this.actionsClicked.update((n) => n + 1);
  }
}

@Component({
  imports: [ForToast, ForToastTitle, ForToastDescription, ForToastAction],
  template: `
    <div forToast [variant]="variant()" [duration]="duration()" data-test-id="alt-toast">
      <div forToastTitle>{{ title() }}</div>
      @if (description()) {
        <div forToastDescription>{{ description() }}</div>
      }
      <button forToastAction [altText]="altText()" data-test-id="alt-action">Undo</button>
    </div>
  `,
})
class AltTextHost {
  readonly variant = signal<'info' | 'success' | 'warning' | 'error'>('info');
  readonly duration = signal(5000);
  readonly title = signal('Saved');
  readonly description = signal('Your changes are live.');
  readonly altText = signal('');
}

const $ = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${id}"]`);

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

function getLiveAnnouncerRegion(politeness: 'polite' | 'assertive'): HTMLElement | null {
  // The toast directive itself binds aria-live to its host. LiveAnnouncer
  // inserts its own region directly under document.body — distinguish by
  // matching the body-level element specifically.
  const matches = document.querySelectorAll<HTMLElement>(`[aria-live="${politeness}"]`);
  for (const el of matches) {
    if (el.parentElement === document.body) {
      return el;
    }
  }
  return null;
}

describe('ForToast (declarative)', () => {
  describe('static accessibility', () => {
    it('non-error variants get role=status + aria-live=polite', () => {
      const { el } = renderHost(DeclarativeHost);
      const t = $(el, 'declarative')!;
      expect(t.getAttribute('role')).toBe('status');
      expect(t.getAttribute('aria-live')).toBe('polite');
      expect(t.getAttribute('aria-atomic')).toBe('true');
    });

    it('error variant becomes role=alert + aria-live=assertive', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.variant.set('error');
      r.flush();
      const t = $(r.el, 'declarative')!;
      expect(t.getAttribute('role')).toBe('alert');
      expect(t.getAttribute('aria-live')).toBe('assertive');
    });

    it('aria-labelledby + aria-describedby are wired from title and description', () => {
      const { el } = renderHost(DeclarativeHost);
      const t = $(el, 'declarative')!;
      const titleId = t.querySelector('[forToastTitle]')!.id;
      const descId = t.querySelector('[forToastDescription]')!.id;
      expect(t.getAttribute('aria-labelledby')).toBe(titleId);
      expect(t.getAttribute('aria-describedby')).toBe(descId);
    });

    it('reflects data-variant', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.variant.set('warning');
      r.flush();
      expect($(r.el, 'declarative')!.getAttribute('data-variant')).toBe('warning');
    });

    it('keeps tabindex=0 so the toast is reachable via the viewport hotkey', () => {
      const { el } = renderHost(DeclarativeHost);
      expect($(el, 'declarative')!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('auto-dismiss', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits (close) with reason "auto" after duration', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(4_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('duration=0 stays sticky', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.duration.set(0);
      r.flush();
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('changing duration mid-flight resets the timer', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      vi.advanceTimersByTime(2_000);
      r.flush();
      r.instance.duration.set(1_000);
      r.flush();
      vi.advanceTimersByTime(999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });
  });

  describe('hover / focus pause', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('pointerenter pauses, pointerleave resumes', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      vi.advanceTimersByTime(2_000);
      r.flush();
      t.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      t.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
      vi.advanceTimersByTime(2_999);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      vi.advanceTimersByTime(1);
      r.flush();
      expect(r.instance.closes).toEqual(['auto']);
    });

    it('focus inside pauses; focus leaving resumes', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      r.flush();
      const t = $(r.el, 'declarative')!;
      const action = $(r.el, 'action')!;
      action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
      vi.advanceTimersByTime(60_000);
      r.flush();
      expect(r.instance.closes).toEqual([]);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      r.flush();
      expect(t.hasAttribute('data-paused')).toBe(false);
      outside.remove();
    });

    it('focus moving between elements within the toast keeps it paused', () => {
      vi.useFakeTimers();
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      r.flush();
      const t = $(r.el, 'declarative')!;
      const action = $(r.el, 'action')!;
      const close = $(r.el, 'close')!;
      action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      action.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: close }));
      close.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      r.flush();
      expect(t.getAttribute('data-paused')).toBe('');
    });
  });

  describe('manual close paths', () => {
    it('Escape closes when closable', () => {
      const r = renderHost(DeclarativeHost);
      const t = $(r.el, 'declarative')!;
      t.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      r.flush();
      expect(r.instance.closes).toEqual(['escape']);
    });

    it('Escape is a no-op when closable=false', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.closable.set(false);
      r.flush();
      const t = $(r.el, 'declarative')!;
      t.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      r.flush();
      expect(r.instance.closes).toEqual([]);
    });

    it('close button click → reason "manual"', () => {
      const r = renderHost(DeclarativeHost);
      const close = $(r.el, 'close')!;
      close.click();
      r.flush();
      expect(r.instance.closes).toEqual(['manual']);
    });

    it('action button click → consumer handler runs, then reason "action"', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.showAction.set(true);
      r.flush();
      const action = $(r.el, 'action')!;
      action.click();
      r.flush();
      expect(r.instance.actionsClicked()).toBe(1);
      expect(r.instance.closes).toEqual(['action']);
    });

    it('action close fires even when closable=false', () => {
      const r = renderHost(DeclarativeHost);
      r.instance.closable.set(false);
      r.instance.showAction.set(true);
      r.flush();
      $(r.el, 'action')!.click();
      r.flush();
      expect(r.instance.closes).toEqual(['action']);
    });
  });

  describe('action altText (WCAG 2.2.1 announcement)', () => {
    afterEach(() => {
      // LiveAnnouncer keeps two off-screen regions in document.body across
      // tests; clear them so assertions about announcement text are scoped to
      // the current toast's emission.
      document.querySelectorAll('[aria-live]').forEach((n) => {
        n.textContent = '';
      });
    });

    it('keeps the host aria-live polite when no action carries altText', () => {
      const r = renderHost(AltTextHost);
      // altText defaults to '' — host announcement remains the active path.
      expect($(r.el, 'alt-toast')!.getAttribute('aria-live')).toBe('polite');
    });

    it('does not announce via LiveAnnouncer when altText is the empty string', async () => {
      const r = renderHost(AltTextHost);
      await flushMicrotasks();

      expect(getLiveAnnouncerRegion('polite')).toBeNull();
      expect(getLiveAnnouncerRegion('assertive')).toBeNull();
      // The toast itself still carries the visible content, of course.
      expect($(r.el, 'alt-toast')!.textContent).toContain('Saved');
    });

    it('silences the host aria-live and announces composed message via LiveAnnouncer', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AltTextHost);
      // Set altText BEFORE first change detection so the action mounts with
      // the value already in place — `afterNextRender` then sees a non-empty
      // alt text on its first (and only) firing.
      fixture.componentInstance.altText.set('Undo (Cmd+Z)');
      fixture.detectChanges();
      await flushMicrotasks();

      const t = fixture.nativeElement.querySelector('[data-test-id="alt-toast"]') as HTMLElement;
      expect(t.getAttribute('aria-live')).toBe('off');

      const region = getLiveAnnouncerRegion('polite');
      expect(region).not.toBeNull();
      expect(region!.textContent).toBe('Saved. Your changes are live.. Undo (Cmd+Z)');
    });

    it('routes error variant announcements through the assertive region', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AltTextHost);
      fixture.componentInstance.variant.set('error');
      fixture.componentInstance.title.set('Save failed');
      fixture.componentInstance.description.set('Network unreachable.');
      fixture.componentInstance.altText.set('Retry (Cmd+R)');
      fixture.detectChanges();
      await flushMicrotasks();

      const t = fixture.nativeElement.querySelector('[data-test-id="alt-toast"]') as HTMLElement;
      expect(t.getAttribute('aria-live')).toBe('off');

      const region = getLiveAnnouncerRegion('assertive');
      expect(region).not.toBeNull();
      expect(region!.textContent).toBe('Save failed. Network unreachable.. Retry (Cmd+R)');
    });
  });
});

describe('ForToastManager (programmatic)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('show() pushes a toast and renders it through the viewport', () => {
    const r = renderHost(ProgrammaticHost);
    expect(r.el.querySelectorAll('[forToast]').length).toBe(0);
    r.instance.toasts.show({ title: 'Saved' });
    r.flush();
    const rendered = r.el.querySelectorAll('[forToast]');
    expect(rendered.length).toBe(1);
    expect(rendered[0]!.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
  });

  it('description and close button render by default', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Saved', description: 'Your changes are live.' });
    r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.querySelector('[forToastDescription]')?.textContent).toContain('Your changes');
    expect(t.querySelector('[forToastClose]')).not.toBeNull();
  });

  it('action button invokes handler and dismisses the toast', () => {
    const r = renderHost(ProgrammaticHost);
    let clicked = 0;
    const ref = r.instance.toasts.show({
      title: 'Item deleted',
      action: { label: 'Undo', onClick: () => clicked++ },
    });
    r.flush();
    const action = r.el.querySelector<HTMLElement>('[forToastAction]')!;
    action.click();
    r.flush();
    expect(clicked).toBe(1);
    expect(ref.isClosed()).toBe(true);
  });

  it('close button click removes the toast from the manager', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.flush();
    expect(r.instance.toasts.count()).toBe(2);
    r.el.querySelectorAll<HTMLElement>('[forToastClose]')[0]!.click();
    r.flush();
    expect(r.instance.toasts.count()).toBe(1);
  });

  it('ref.dismiss() closes programmatically', () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saved' });
    r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    ref.dismiss();
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
    expect(ref.isClosed()).toBe(true);
  });

  it('ref.update() patches config in place', () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show({ title: 'Saving…', duration: 0 });
    r.flush();
    ref.update({ title: 'Saved', variant: 'success' });
    r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
    expect(t.getAttribute('data-variant')).toBe('success');
  });

  it('show() with same id updates the existing toast', () => {
    const r = renderHost(ProgrammaticHost);
    const a = r.instance.toasts.show({ id: 'job', title: 'Saving…' });
    const b = r.instance.toasts.show({ id: 'job', title: 'Saved' });
    r.flush();
    expect(a).toBe(b);
    expect(r.instance.toasts.count()).toBe(1);
    expect(r.el.querySelector('[forToastTitle]')?.textContent).toContain('Saved');
  });

  it('dismissAll() closes every live toast', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.instance.toasts.show({ title: 'C' });
    r.flush();
    expect(r.instance.toasts.count()).toBe(3);
    r.instance.toasts.dismissAll();
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('ref.closed promise resolves with reason and result', async () => {
    const r = renderHost(ProgrammaticHost);
    const ref = r.instance.toasts.show<string>({ title: 'A' });
    r.flush();
    const closed = ref.closed;
    ref.dismiss('action', 'undo');
    await closed.then((v) => {
      expect(v).toEqual({ reason: 'action', result: 'undo' });
    });
  });

  it('error variant gets role=alert', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Boom', variant: 'error' });
    r.flush();
    const t = r.el.querySelector('[forToast]')!;
    expect(t.getAttribute('role')).toBe('alert');
  });

  it('respects custom template via show({ template, data })', () => {
    const r = renderHost(ProgrammaticHost);
    const tpl = r.instance.tpl();
    r.instance.toasts.show({ template: tpl, data: { label: 'Custom!' } });
    r.flush();
    const titles = r.el.querySelectorAll<HTMLElement>('[data-test-id="custom-title"]');
    expect(titles.length).toBe(1);
    expect(titles[0]!.textContent).toContain('Custom!');
  });

  it('custom template can dismiss via the $implicit toast handle', () => {
    const r = renderHost(ProgrammaticHost);
    const tpl = r.instance.tpl();
    r.instance.toasts.show({ template: tpl, data: { label: 'X' } });
    r.flush();
    expect(r.instance.toasts.count()).toBe(1);
    r.el.querySelector<HTMLElement>('[data-test-id="custom-dismiss"]')!.click();
    r.flush();
    expect(r.instance.toasts.count()).toBe(0);
  });

  it('default variant info → role=status', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'Hello' });
    r.flush();
    expect(r.el.querySelector('[forToast]')!.getAttribute('role')).toBe('status');
  });

  it('emits no toasts initially', () => {
    const r = renderHost(ProgrammaticHost);
    expect(r.instance.toasts.count()).toBe(0);
  });
});

describe('ForToastViewport', () => {
  it('host has role=region with default aria-label "Notifications"', () => {
    const r = renderHost(ProgrammaticHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport, [forToastViewport]')!;
    expect(v.getAttribute('role')).toBe('region');
    expect(v.getAttribute('aria-label')).toBe('Notifications');
  });

  it('exposes data-toast-count reflecting visible toasts', () => {
    const r = renderHost(ProgrammaticHost);
    const v = r.el.querySelector<HTMLElement>('for-toast-viewport, [forToastViewport]')!;
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.flush();
    expect(v.getAttribute('data-toast-count')).toBe('2');
  });

  it('maxVisible caps the rendered window to the newest entries', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.maxVisible.set(2);
    r.flush();
    r.instance.toasts.show({ title: 'A' });
    r.instance.toasts.show({ title: 'B' });
    r.instance.toasts.show({ title: 'C' });
    r.flush();
    const titles = Array.from(r.el.querySelectorAll<HTMLElement>('[forToastTitle]')).map((e) =>
      e.textContent?.trim(),
    );
    expect(titles).toEqual(['B', 'C']);
    expect(r.instance.toasts.count()).toBe(3);
  });

  it('F6 hotkey focuses the first rendered toast', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.toasts.show({ title: 'A' });
    r.flush();
    const opener = $(r.el, 'opener')!;
    opener.focus();
    expect(document.activeElement).toBe(opener);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    r.flush();
    const first = r.el.querySelector<HTMLElement>('[forToast]')!;
    expect(document.activeElement).toBe(first);
  });

  it('per-viewport [hotkey] override takes precedence', () => {
    const r = renderHost(ProgrammaticHost);
    r.instance.hotkey.set('F8');
    r.flush();
    r.instance.toasts.show({ title: 'A' });
    r.flush();
    const opener = $(r.el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }),
    );
    r.flush();
    expect(document.activeElement).toBe(opener);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true }),
    );
    r.flush();
    expect(document.activeElement).toBe(r.el.querySelector('[forToast]'));
  });
});

describe('global defaults via provideForToastDefaults', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('default duration applies when a toast omits it', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ duration: 1_000 })],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    fixture.componentInstance.toasts.show({ title: 'Quick' });
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(999);
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(0);
  });

  it('default hotkey applies when viewport leaves [hotkey] empty', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForToastDefaults({ hotkey: 'F2' })],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    fixture.componentInstance.toasts.show({ title: 'A' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const opener = $(el, 'opener')!;
    opener.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(document.activeElement).toBe(el.querySelector('[forToast]'));
  });
});

describe('zoneless', () => {
  it('show() + auto-dismiss work without Zone.js', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(ProgrammaticHost);
    fixture.detectChanges();
    const ref = fixture.componentInstance.toasts.show({ title: 'A', duration: 50 });
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(1);
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(fixture.componentInstance.toasts.count()).toBe(0);
    expect(ref.isClosed()).toBe(true);
    vi.useRealTimers();
  });
});
