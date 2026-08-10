import {
  type OutputEmitterRef,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  createVetoableEvent,
  type ListNavigationAction,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  ListboxOverlayController,
  type ListboxOverlayOptionHandle,
} from './listbox-overlay-controller';

interface FakeHandle extends ListboxOverlayOptionHandle {
  readonly id: () => string;
}

type Focus = 'first' | 'last' | 'selected';
type CloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

function makeHandle(
  parent: HTMLElement,
  opts: { id?: string; disabled?: boolean } = {},
): FakeHandle {
  const host = document.createElement('div');
  host.tabIndex = -1;
  parent.appendChild(host);
  const disabled = signal(opts.disabled ?? false);
  const id = signal(opts.id ?? 'opt');
  return { host, disabled, id };
}

interface Harness {
  readonly controller: ListboxOverlayController<FakeHandle, Focus, CloseReason>;
  readonly parent: HTMLElement;
  readonly open: WritableSignal<boolean>;
  readonly effectiveDisabled: WritableSignal<boolean>;
  readonly dismissible: WritableSignal<boolean>;
  readonly touched: { count: number };
  readonly closed: CloseReason[];
  readonly navigated: FakeHandle[];
  readonly emit: {
    escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
    pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
    focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
    interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;
    autoFocusOnOpen: OutputEmitterRef<VetoableEvent>;
    autoFocusOnClose: OutputEmitterRef<VetoableEvent>;
  };
}

function createHarness(opts: { withNavigateFocus?: boolean } = {}): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const parent = document.createElement('div');
  document.body.appendChild(parent);

  const open = signal(false);
  const effectiveDisabled = signal(false);
  const loop = signal(true);
  const dismissible = signal(true);
  const touched = { count: 0 };
  const closed: CloseReason[] = [];
  const navigated: FakeHandle[] = [];

  let harness!: Harness;
  TestBed.runInInjectionContext(() => {
    const escapeKeyDown = makeOutput<VetoableNativeEvent<KeyboardEvent>>();
    const pointerDownOutside = makeOutput<VetoableNativeEvent<PointerEvent>>();
    const focusOutside = makeOutput<VetoableNativeEvent<FocusEvent>>();
    const interactOutside = makeOutput<VetoableNativeEvent<PointerEvent | FocusEvent>>();
    const autoFocusOnOpen = makeOutput<VetoableEvent>();
    const autoFocusOnClose = makeOutput<VetoableEvent>();
    const emit = {
      escapeKeyDown,
      pointerDownOutside,
      focusOutside,
      interactOutside,
      autoFocusOnOpen,
      autoFocusOnClose,
    };

    const controller = new ListboxOverlayController<FakeHandle, Focus, CloseReason>({
      idPrefix: 'for-listbox-test',
      multipleAnchorsError: '[forty-cdk/test] Multiple anchors; only one is allowed.',
      defaultInitialFocus: 'selected',
      effectiveDisabled,
      setOpen: (v) => open.set(v),
      isOpen: () => open(),
      emit,
      loop,
      dismissible,
      escapeReason: 'escape',
      programmaticReason: 'programmatic',
      markTouched: () => {
        touched.count++;
      },
      onClose: (reason) => closed.push(reason),
      onNavigateFocus: opts.withNavigateFocus ? (target) => navigated.push(target) : undefined,
    });
    harness = {
      controller,
      parent,
      open,
      effectiveDisabled,
      dismissible,
      touched,
      closed,
      navigated,
      emit,
    };
  });
  return harness;
}

function makeOutput<T>(): OutputEmitterRef<T> {
  const listeners: ((value: T) => void)[] = [];
  return {
    emit: (value: T) => listeners.forEach((l) => l(value)),
    subscribe: (l: (value: T) => void) => {
      listeners.push(l);
      return { unsubscribe: () => void 0 };
    },
  } as unknown as OutputEmitterRef<T>;
}

describe('ListboxOverlayController', () => {
  afterEach(() => {
    document.querySelectorAll('body > div').forEach((el) => el.remove());
  });

  it('generates trigger / content ids from the configured prefix', () => {
    const { controller } = createHarness();
    expect(controller.triggerId()).toContain('for-listbox-test-trigger');
    expect(controller.contentId()).toContain('for-listbox-test-content');
  });

  it('adopts a consumer static id on the trigger and content', () => {
    const { controller } = createHarness();
    const trigger = document.createElement('button');
    trigger.id = 'my-trigger';
    controller.registerTrigger(trigger);
    expect(controller.triggerId()).toBe('my-trigger');

    const content = document.createElement('div');
    content.id = 'my-content';
    controller.registerContent(content);
    expect(controller.contentId()).toBe('my-content');
  });

  it('falls the anchor back to the trigger until an explicit anchor registers', () => {
    const { controller } = createHarness();
    const trigger = document.createElement('button');
    controller.registerTrigger(trigger);
    expect(controller.anchor()).toBe(trigger);

    const anchor = document.createElement('div');
    controller.registerAnchor(anchor);
    expect(controller.anchor()).toBe(anchor);

    controller.unregisterAnchor(anchor);
    expect(controller.anchor()).toBe(trigger);
  });

  it('throws the configured error when a second anchor registers', () => {
    const { controller } = createHarness();
    controller.registerAnchor(document.createElement('div'));
    expect(() => controller.registerAnchor(document.createElement('div'))).toThrowError(
      '[forty-cdk/test] Multiple anchors; only one is allowed.',
    );
  });

  it('opens with the requested initial focus and resets last-close-reason', () => {
    const { controller, open } = createHarness();
    controller.closeMenu('escape');
    expect(controller.lastCloseReason()).toBe('escape');
    controller.openMenu('last');
    expect(open()).toBe(true);
    expect(controller.initialFocus()).toBe('last');
    expect(controller.lastCloseReason()).toBeNull();
  });

  it('closeMenu flips open false, records the reason, and runs the close side effect', () => {
    const { controller, open, closed } = createHarness();
    open.set(true);
    controller.closeMenu('select');
    expect(open()).toBe(false);
    expect(controller.lastCloseReason()).toBe('select');
    expect(closed).toEqual(['select']);
  });

  it('toggle opens when closed and closes (programmatic) when open', () => {
    const { controller, open } = createHarness();
    controller.toggle('first');
    expect(open()).toBe(true);
    controller.toggle('first');
    expect(open()).toBe(false);
    expect(controller.lastCloseReason()).toBe('programmatic');
  });

  it('open / toggle / navigate are no-ops while effectively disabled', () => {
    const { controller, open, effectiveDisabled } = createHarness();
    effectiveDisabled.set(true);
    controller.openMenu('first');
    expect(open()).toBe(false);
    controller.toggle('first');
    expect(open()).toBe(false);
  });

  it('navigate moves DOM focus skipping disabled options', () => {
    const { controller, parent } = createHarness();
    const a = makeHandle(parent);
    const b = makeHandle(parent, { disabled: true });
    const c = makeHandle(parent);
    controller.registerOption(a);
    controller.registerOption(b);
    controller.registerOption(c);

    controller.navigate(a.host, 'next' as ListNavigationAction);
    expect(document.activeElement).toBe(c.host);
  });

  it('runs the per-navigate focus side effect on the focused target', () => {
    const { controller, parent, navigated } = createHarness({ withNavigateFocus: true });
    const a = makeHandle(parent);
    const b = makeHandle(parent);
    controller.registerOption(a);
    controller.registerOption(b);

    controller.navigate(a.host, 'next' as ListNavigationAction);
    expect(navigated).toEqual([b]);
  });

  it('focusFirstEnabledOption / focusLastEnabledOption skip disabled ends', () => {
    const { controller, parent } = createHarness();
    const a = makeHandle(parent, { disabled: true });
    const b = makeHandle(parent);
    const c = makeHandle(parent, { disabled: true });
    controller.registerOption(a);
    controller.registerOption(b);
    controller.registerOption(c);

    expect(controller.focusFirstEnabledOption()).toBe(true);
    expect(document.activeElement).toBe(b.host);
    expect(controller.focusLastEnabledOption()).toBe(true);
    expect(document.activeElement).toBe(b.host);
  });

  it('focusFirstEnabledOption returns false when every option is disabled', () => {
    const { controller, parent } = createHarness();
    const a = makeHandle(parent, { disabled: true });
    controller.registerOption(a);
    expect(controller.focusFirstEnabledOption()).toBe(false);
  });

  it('emitEscapeKeyDown closes when dismissible and not vetoed, marking touched', () => {
    const { controller, open, touched, closed } = createHarness();
    open.set(true);
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    controller.emitEscapeKeyDown(event);
    expect(open()).toBe(false);
    expect(touched.count).toBe(1);
    expect(closed).toEqual(['escape']);
  });

  it('emitEscapeKeyDown does not close when not dismissible', () => {
    const { controller, open, touched, dismissible } = createHarness();
    dismissible.set(false);
    open.set(true);
    controller.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(open()).toBe(true);
    expect(touched.count).toBe(0);
  });

  it('emitEscapeKeyDown does not close when the consumer vetoes', () => {
    const { controller, open, emit } = createHarness();
    emit.escapeKeyDown.subscribe((veto) => veto.preventDefault());
    open.set(true);
    controller.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(open()).toBe(true);
  });

  it('requestClose marks touched and closes with the channel reason', () => {
    const { controller, open, touched, closed } = createHarness();
    open.set(true);
    controller.requestClose('pointerDownOutside');
    expect(touched.count).toBe(1);
    expect(open()).toBe(false);
    expect(closed).toEqual(['pointerDownOutside']);
  });

  it('requestClose is a no-op while already closed, preserving the prior close reason', () => {
    const { controller, open, touched, closed } = createHarness();
    open.set(true);
    controller.closeMenu('tab');
    expect(open()).toBe(false);
    expect(controller.lastCloseReason()).toBe('tab');

    const setOpen = vi.spyOn(open, 'set');
    controller.requestClose('focusOutside');

    expect(setOpen).not.toHaveBeenCalled();
    expect(controller.lastCloseReason()).toBe('tab');
    expect(touched.count).toBe(0);
    expect(closed).toEqual(['tab']);
  });

  it('emitAutoFocusOnOpen / emitAutoFocusOnClose report the veto', () => {
    const { controller, emit } = createHarness();
    expect(controller.emitAutoFocusOnOpen()).toBe(false);
    emit.autoFocusOnClose.subscribe((veto) => veto.preventDefault());
    expect(controller.emitAutoFocusOnClose()).toBe(true);
  });

  it('forwards outside / forward-escape vetoes to the matching output', () => {
    const { controller, emit } = createHarness();
    const seen: string[] = [];
    emit.pointerDownOutside.subscribe(() => seen.push('pointer'));
    emit.focusOutside.subscribe(() => seen.push('focus'));
    emit.interactOutside.subscribe(() => seen.push('interact'));
    emit.escapeKeyDown.subscribe(() => seen.push('escape'));

    controller.emitPointerDownOutside(
      createVetoableEvent() as unknown as VetoableNativeEvent<PointerEvent>,
    );
    controller.emitFocusOutside(
      createVetoableEvent() as unknown as VetoableNativeEvent<FocusEvent>,
    );
    controller.emitInteractOutside(
      createVetoableEvent() as unknown as VetoableNativeEvent<PointerEvent | FocusEvent>,
    );
    controller.forwardEscapeKeyDown(
      createVetoableEvent() as unknown as VetoableNativeEvent<KeyboardEvent>,
    );
    expect(seen).toEqual(['pointer', 'focus', 'interact', 'escape']);
  });
});
