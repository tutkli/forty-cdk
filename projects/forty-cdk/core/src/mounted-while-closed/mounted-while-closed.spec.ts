import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../src/test-utils';
import { warnIfMountedWhileClosed } from './mounted-while-closed';

@Directive({ selector: '[probeSurface]' })
class ProbeSurface {
  readonly open = input(false);

  constructor() {
    warnIfMountedWhileClosed({
      primitive: 'probe',
      piece: '[probeSurface]',
      condition: 'probe.open()',
      open: this.open,
    });
  }
}

@Component({
  imports: [ProbeSurface],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <div probeSurface [open]="open()">Surface</div>
    }
  `,
})
class ProbeHost {
  readonly mounted = signal(true);
  readonly open = signal(false);
}

@Directive({ selector: '[probeLateSurface]' })
class ProbeLateSurface {
  readonly panel = input.required<string>();

  constructor() {
    warnIfMountedWhileClosed({
      primitive: 'probe',
      piece: '[probeLateSurface]',
      condition: () => `open() === '${this.panel()}'`,
      open: () => false,
    });
  }
}

@Component({
  imports: [ProbeLateSurface],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div probeLateSurface panel="products">Surface</div>`,
})
class ProbeLateHost {}

describe('warnIfMountedWhileClosed', () => {
  let warned: string[];

  beforeEach(() => {
    warned = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warned.push(args.map(String).join(' '));
    });
  });

  function mount(mounted: boolean, open: boolean) {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeHost);
    fixture.componentInstance.mounted.set(mounted);
    fixture.componentInstance.open.set(open);
    return fixture;
  }

  it('warns when the piece is still mounted after the first render while closed', async () => {
    const fixture = mount(true, false);
    await flush(fixture);

    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain('[forty-cdk/probe] [probeSurface] is mounted while the surface');
    expect(warned[0]).toContain('@if (probe.open())');
    expect(warned[0]).toContain('probe README');
  });

  it('resolves a thunk condition in the render hook, so the fix can quote a bound input', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeLateHost);
    await flush(fixture);

    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain("@if (open() === 'products')");
  });

  it('stays silent when the piece mounts open', async () => {
    const fixture = mount(true, true);
    await flush(fixture);

    expect(warned).toEqual([]);
  });

  it('stays silent for the exit-animation window — mounted open, then closed, still mounted', async () => {
    const fixture = mount(true, true);
    await flush(fixture);

    fixture.componentInstance.open.set(false);
    await flush(fixture);

    expect(warned).toEqual([]);
  });

  it('warns at most once per instance, however many renders follow', async () => {
    const fixture = mount(true, false);
    await flush(fixture);
    await flush(fixture);

    fixture.componentInstance.open.set(true);
    await flush(fixture);
    fixture.componentInstance.open.set(false);
    await flush(fixture);

    expect(warned).toHaveLength(1);
  });

  it('warns once per instance, so a remount reports again', async () => {
    const fixture = mount(true, false);
    await flush(fixture);

    fixture.componentInstance.mounted.set(false);
    await flush(fixture);
    fixture.componentInstance.mounted.set(true);
    await flush(fixture);

    expect(warned).toHaveLength(2);
  });

  it('registers nothing once `ngDevMode` is cleared, as a production build does', async () => {
    vi.stubGlobal('ngDevMode', false);

    const fixture = mount(true, false);
    await flush(fixture);

    expect(warned).toEqual([]);
  });
});
