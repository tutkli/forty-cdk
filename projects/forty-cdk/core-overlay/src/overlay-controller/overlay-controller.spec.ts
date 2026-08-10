import {
  type OutputEmitterRef,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  createVetoableEvent,
  createVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { IdentifiedElementSlot } from './element-registry';
import {
  OverlayController,
  type OverlayEmitTargets,
  type OverlayTransitionOptions,
} from './overlay-controller';

type Focus = 'first' | 'last' | 'selected';
type CloseReason = 'escape' | 'pointerDownOutside' | 'focusOutside' | 'tab' | 'programmatic';

interface Harness {
  readonly controller: OverlayController<Focus, CloseReason>;
  readonly open: WritableSignal<boolean>;
  readonly disabled: WritableSignal<boolean>;
  readonly dismissible: WritableSignal<boolean>;
  readonly emit: OverlayEmitTargets;
  readonly emitted: {
    escapeKeyDown: VetoableNativeEvent<KeyboardEvent>[];
    pointerDownOutside: VetoableNativeEvent<PointerEvent>[];
    focusOutside: VetoableNativeEvent<FocusEvent>[];
    interactOutside: VetoableNativeEvent<PointerEvent | FocusEvent>[];
    autoFocusOnOpen: VetoableEvent[];
    autoFocusOnClose: VetoableEvent[];
  };
  readonly opens: { initialFocus: Focus; options: OverlayTransitionOptions }[];
  readonly closes: { reason: CloseReason; options: OverlayTransitionOptions }[];
  readonly dismissals: number[];
  readonly setOpenCalls: boolean[];
  readonly seededTriggerIds: string[];
}

function makeOutput<T>(sink: T[]): OutputEmitterRef<T> {
  const listeners: ((value: T) => void)[] = [(value) => sink.push(value)];
  return {
    emit: (value: T) => listeners.forEach((l) => l(value)),
    subscribe: (l: (value: T) => void) => {
      listeners.push(l);
      return { unsubscribe: () => void 0 };
    },
  } as unknown as OutputEmitterRef<T>;
}

function createHarness(opts: { withDismissHook?: boolean } = {}): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  const open = signal(false);
  const disabled = signal(false);
  const dismissible = signal(true);
  const emitted: Harness['emitted'] = {
    escapeKeyDown: [],
    pointerDownOutside: [],
    focusOutside: [],
    interactOutside: [],
    autoFocusOnOpen: [],
    autoFocusOnClose: [],
  };
  const emit: OverlayEmitTargets = {
    escapeKeyDown: makeOutput(emitted.escapeKeyDown),
    pointerDownOutside: makeOutput(emitted.pointerDownOutside),
    focusOutside: makeOutput(emitted.focusOutside),
    interactOutside: makeOutput(emitted.interactOutside),
    autoFocusOnOpen: makeOutput(emitted.autoFocusOnOpen),
    autoFocusOnClose: makeOutput(emitted.autoFocusOnClose),
  };
  const opens: Harness['opens'] = [];
  const closes: Harness['closes'] = [];
  const dismissals: number[] = [];
  const setOpenCalls: boolean[] = [];
  const seededTriggerIds: string[] = [];

  let harness!: Harness;
  TestBed.runInInjectionContext(() => {
    const controller = new OverlayController<Focus, CloseReason>({
      idPrefix: 'for-test-overlay',
      createTrigger: (id) => {
        seededTriggerIds.push(id());
        return new IdentifiedElementSlot(id);
      },
      defaultInitialFocus: 'selected',
      disabled,
      dismissible,
      isOpen: () => open(),
      setOpen: (value) => {
        setOpenCalls.push(value);
        open.set(value);
      },
      emit,
      escapeReason: 'escape',
      programmaticReason: 'programmatic',
      onOpen: (initialFocus, options) => opens.push({ initialFocus, options }),
      onClose: (reason, options) => closes.push({ reason, options }),
      onDismiss: opts.withDismissHook ? () => dismissals.push(dismissals.length) : undefined,
    });
    harness = {
      controller,
      open,
      disabled,
      dismissible,
      emit,
      emitted,
      opens,
      closes,
      dismissals,
      setOpenCalls,
      seededTriggerIds,
    };
  });
  return harness;
}

describe('OverlayController', () => {
  describe('slots and ids', () => {
    it('seeds the trigger id before the content id, both off the configured prefix', () => {
      const { controller, seededTriggerIds } = createHarness();
      expect(seededTriggerIds).toHaveLength(1);
      expect(seededTriggerIds[0]).toContain('for-test-overlay-trigger');
      expect(controller.triggerId()).toBe(seededTriggerIds[0]);
      expect(controller.contentId()).toContain('for-test-overlay-content');

      const triggerSeq = Number(controller.triggerId().split('-').pop());
      const contentSeq = Number(controller.contentId().split('-').pop());
      expect(triggerSeq).toBeLessThan(contentSeq);
    });

    it('exposes the trigger slot the deps built and adopts a consumer static id', () => {
      const { controller } = createHarness();
      const trigger = document.createElement('button');
      trigger.id = 'my-trigger';
      controller.registerTrigger(trigger);
      expect(controller.trigger()).toBe(trigger);
      expect(controller.triggerId()).toBe('my-trigger');

      controller.unregisterTrigger(trigger);
      expect(controller.trigger()).toBeNull();
    });

    it('registers content and adopts its consumer static id', () => {
      const { controller } = createHarness();
      const content = document.createElement('div');
      content.id = 'my-content';
      controller.registerContent(content);
      expect(controller.content()).toBe(content);
      expect(controller.contentId()).toBe('my-content');

      controller.unregisterContent(content);
      expect(controller.content()).toBeNull();
    });

    it('rests at the configured default initial-focus target', () => {
      const { controller } = createHarness();
      expect(controller.initialFocus()).toBe('selected');
      expect(controller.lastCloseReason()).toBeNull();
    });
  });

  describe('open', () => {
    it('reports "opened", records the target, resets the close reason and flips open', () => {
      const { controller, open, opens } = createHarness();
      controller.close('escape');
      expect(controller.lastCloseReason()).toBe('escape');

      expect(controller.open('last')).toBe('opened');
      expect(open()).toBe(true);
      expect(controller.initialFocus()).toBe('last');
      expect(controller.lastCloseReason()).toBeNull();
      expect(opens).toEqual([{ initialFocus: 'last', options: {} }]);
    });

    it('reports "blocked" while disabled, writing nothing and running no hook', () => {
      const { controller, open, disabled, opens, setOpenCalls } = createHarness();
      disabled.set(true);
      expect(controller.open('first')).toBe('blocked');
      expect(open()).toBe(false);
      expect(controller.initialFocus()).toBe('selected');
      expect(opens).toEqual([]);
      expect(setOpenCalls).toEqual([]);
    });

    it('reports "already-open" without a second open write, re-arming the target', () => {
      const { controller, opens, setOpenCalls } = createHarness();
      controller.open('first');
      expect(setOpenCalls).toEqual([true]);

      expect(controller.open('last')).toBe('already-open');
      expect(setOpenCalls).toEqual([true]);
      expect(controller.initialFocus()).toBe('last');
      expect(opens).toHaveLength(2);
    });

    it('forwards the transition options verbatim to the open hook', () => {
      const { controller, opens } = createHarness();
      controller.open('first', { transition: { suppressFocusMoves: true } });
      expect(opens).toEqual([{ initialFocus: 'first', options: { suppressFocusMoves: true } }]);
    });

    it('leaves the one-shot highlight armed when no highlight is requested', () => {
      const { controller } = createHarness();
      controller.open('first');
      expect(controller.consumeInitialHighlight()).toBe(true);
    });

    it('suppresses the highlight for one move only when opened with highlight false', () => {
      const { controller } = createHarness();
      controller.open('first', { highlight: false });
      expect(controller.consumeInitialHighlight()).toBe(false);
      expect(controller.consumeInitialHighlight()).toBe(true);
    });
  });

  describe('close', () => {
    it('records the reason, flips open false and runs the close hook', () => {
      const { controller, open, closes } = createHarness();
      controller.open('first');
      controller.close('tab');
      expect(open()).toBe(false);
      expect(controller.lastCloseReason()).toBe('tab');
      expect(closes).toEqual([{ reason: 'tab', options: {} }]);
    });

    it('forwards the transition options verbatim to the close hook', () => {
      const { controller, closes } = createHarness();
      controller.close('programmatic', { suppressFocusMoves: true });
      expect(closes).toEqual([{ reason: 'programmatic', options: { suppressFocusMoves: true } }]);
    });

    it('closes a disabled surface, so a control disabled while open is still dismissible', () => {
      const { controller, open, disabled } = createHarness();
      controller.open('first');
      disabled.set(true);
      controller.close('escape');
      expect(open()).toBe(false);
      expect(controller.lastCloseReason()).toBe('escape');
    });
  });

  describe('toggle', () => {
    it('opens when closed and closes with the programmatic reason when open', () => {
      const { controller, open } = createHarness();
      controller.toggle('last');
      expect(open()).toBe(true);
      expect(controller.initialFocus()).toBe('last');

      controller.toggle('first');
      expect(open()).toBe(false);
      expect(controller.lastCloseReason()).toBe('programmatic');
    });

    it('does nothing while disabled, on either branch', () => {
      const { controller, open, disabled, setOpenCalls } = createHarness();
      disabled.set(true);
      controller.toggle('first');
      expect(setOpenCalls).toEqual([]);

      disabled.set(false);
      controller.toggle('first');
      disabled.set(true);
      controller.toggle('first');
      expect(open()).toBe(true);
      expect(setOpenCalls).toEqual([true]);
    });

    it('arms the highlight suppression it was given', () => {
      const { controller } = createHarness();
      controller.toggle('first', { highlight: false });
      expect(controller.consumeInitialHighlight()).toBe(false);
    });
  });

  describe('Escape', () => {
    it('emits, stops propagation and closes with the escape reason', () => {
      const { controller, open, emitted } = createHarness();
      controller.open('first');
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      controller.emitEscapeKeyDown(event);
      expect(emitted.escapeKeyDown).toHaveLength(1);
      expect(stopPropagation).toHaveBeenCalledTimes(1);
      expect(open()).toBe(false);
      expect(controller.lastCloseReason()).toBe('escape');
    });

    it('keeps the surface open when a listener vetoes the emitted event', () => {
      const { controller, open, emit } = createHarness();
      controller.open('first');
      emit.escapeKeyDown.subscribe((e) => e.preventDefault());

      controller.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(open()).toBe(true);
      expect(controller.lastCloseReason()).toBeNull();
    });

    it('emits but does not close while not dismissible', () => {
      const { controller, open, dismissible, emitted } = createHarness();
      controller.open('first');
      dismissible.set(false);

      controller.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(emitted.escapeKeyDown).toHaveLength(1);
      expect(open()).toBe(true);
    });

    it('runs the dismiss hook before the close, only on the un-vetoed path', () => {
      const { controller, dismissible, dismissals } = createHarness({ withDismissHook: true });
      controller.open('first');
      dismissible.set(false);
      controller.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(dismissals).toHaveLength(0);

      dismissible.set(true);
      controller.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(dismissals).toHaveLength(1);
    });

    it('forwardEscapeKeyDown only emits, leaving the close to the modal shell', () => {
      const { controller, open, emitted } = createHarness();
      controller.open('first');
      controller.forwardEscapeKeyDown(
        createVetoableNativeEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
      );
      expect(emitted.escapeKeyDown).toHaveLength(1);
      expect(open()).toBe(true);
    });
  });

  describe('outside interactions', () => {
    it('forwards each outside veto on its own channel without closing', () => {
      const { controller, open, emitted } = createHarness();
      controller.open('first');
      const pointer = createVetoableEvent() as unknown as VetoableNativeEvent<PointerEvent>;
      const focus = createVetoableEvent() as unknown as VetoableNativeEvent<FocusEvent>;
      const composite = createVetoableEvent() as unknown as VetoableNativeEvent<
        PointerEvent | FocusEvent
      >;

      controller.emitPointerDownOutside(pointer);
      controller.emitFocusOutside(focus);
      controller.emitInteractOutside(composite);

      expect(emitted.pointerDownOutside).toEqual([pointer]);
      expect(emitted.focusOutside).toEqual([focus]);
      expect(emitted.interactOutside).toEqual([composite]);
      expect(open()).toBe(true);
    });

    it('requestClose closes an open surface with the supplied reason', () => {
      const { controller, open, dismissals } = createHarness({ withDismissHook: true });
      controller.open('first');
      controller.requestClose('pointerDownOutside');
      expect(open()).toBe(false);
      expect(controller.lastCloseReason()).toBe('pointerDownOutside');
      expect(dismissals).toHaveLength(1);
    });

    it('requestClose on a closed surface clobbers neither the reason nor the dismiss hook', () => {
      const { controller, closes, dismissals } = createHarness({ withDismissHook: true });
      controller.open('first');
      controller.close('tab');
      expect(closes).toHaveLength(1);

      controller.requestClose('focusOutside');
      expect(controller.lastCloseReason()).toBe('tab');
      expect(closes).toHaveLength(1);
      expect(dismissals).toHaveLength(0);
    });
  });

  describe('auto-focus vetoes', () => {
    it('reports the veto per channel, emitting on the matching one only', () => {
      const { controller, emit, emitted } = createHarness();
      expect(controller.emitAutoFocusOnOpen()).toBe(false);
      expect(controller.emitAutoFocusOnClose()).toBe(false);
      expect(emitted.autoFocusOnOpen).toHaveLength(1);
      expect(emitted.autoFocusOnClose).toHaveLength(1);

      emit.autoFocusOnOpen.subscribe((e: VetoableEvent) => e.preventDefault());
      expect(controller.emitAutoFocusOnOpen()).toBe(true);
      expect(controller.emitAutoFocusOnClose()).toBe(false);
    });
  });
});
