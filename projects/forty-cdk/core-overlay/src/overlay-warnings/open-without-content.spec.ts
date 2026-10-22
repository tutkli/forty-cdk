import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { registerHandle } from 'forty-cdk/core';
import { flush } from '../../../src/test-utils';
import { warnIfOpenWithoutContent } from './open-without-content';

@Directive({ selector: '[probeRoot]' })
class ProbeRoot {
  readonly open = input(false);
  readonly panel = input('products');
  readonly content = signal<HTMLElement | null>(null);

  constructor() {
    warnIfOpenWithoutContent({
      primitive: 'probe',
      piece: '[probeContent]',
      condition: () => `open() === '${this.panel()}'`,
      open: this.open,
      content: this.content,
    });
  }
}

@Directive({ selector: '[probeContent]' })
class ProbeContent {
  constructor() {
    const root = inject(ProbeRoot);
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => root.content.set(el),
      (el) => {
        if (root.content() === el) {
          root.content.set(null);
        }
      },
    );
  }
}

@Directive({ selector: '[probeLateContent]' })
class ProbeLateContent {
  constructor() {
    const root = inject(ProbeRoot);
    registerHandle(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      (el) => root.content.set(el),
      () => root.content.set(null),
      'afterNextRender',
    );
  }
}

@Component({
  selector: 'probe-late-slot',
  imports: [ProbeLateContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <div probeLateContent>Surface</div>
    }
  `,
})
class ProbeLateSlot {
  readonly mounted = input(false);
}

@Component({
  imports: [ProbeRoot, ProbeContent, ProbeLateSlot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div probeRoot [open]="open()" [panel]="panel()">
      @if (mounted()) {
        <div probeContent>Surface</div>
      }
      <probe-late-slot [mounted]="lateMounted()" />
    </div>
  `,
})
class ProbeHost {
  readonly open = signal(false);
  readonly mounted = signal(false);
  readonly lateMounted = signal(false);
  readonly panel = signal('products');
}

describe('warnIfOpenWithoutContent', () => {
  let warned: string[];

  beforeEach(() => {
    warned = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warned.push(args.map(String).join(' '));
    });
  });

  async function mount() {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeHost);
    await flush(fixture);
    return fixture;
  }

  it('warns when the surface is still open after a render with no content mounted', async () => {
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    await flush(fixture);

    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain(
      '[forty-cdk/probe] FORCDK-CORE-014: The surface is open, but no [probeContent] is mounted.',
    );
    expect(warned[0]).toContain("@if (open() === 'products')");
    expect(warned[0]).toContain('probe README');
  });

  it('quotes the condition the open state resolved to when it warns', async () => {
    const fixture = await mount();

    fixture.componentInstance.panel.set('solutions');
    fixture.componentInstance.open.set(true);
    await flush(fixture);

    expect(warned[0]).toContain("@if (open() === 'solutions')");
  });

  it('stays silent when the content mounts in the render that opens the surface', async () => {
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    fixture.componentInstance.mounted.set(true);
    await flush(fixture);

    expect(warned).toEqual([]);
  });

  it('stays silent when the content registers from a render hook of that same render', async () => {
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    fixture.componentInstance.lateMounted.set(true);
    await flush(fixture);

    expect(warned).toEqual([]);
  });

  it('stays silent while closed, and through the exit window of a mounted surface', async () => {
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    fixture.componentInstance.mounted.set(true);
    await flush(fixture);
    fixture.componentInstance.open.set(false);
    await flush(fixture);
    fixture.componentInstance.mounted.set(false);
    await flush(fixture);

    expect(warned).toEqual([]);
  });

  it('warns once per entry into the state, however many renders it lasts', async () => {
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    await flush(fixture);
    await flush(fixture);
    fixture.componentInstance.panel.set('solutions');
    await flush(fixture);

    expect(warned).toHaveLength(1);

    fixture.componentInstance.open.set(false);
    await flush(fixture);
    fixture.componentInstance.open.set(true);
    await flush(fixture);

    expect(warned).toHaveLength(2);
  });

  it('re-arms when the content unmounts while the surface stays open', async () => {
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    fixture.componentInstance.mounted.set(true);
    await flush(fixture);
    fixture.componentInstance.mounted.set(false);
    await flush(fixture);

    expect(warned).toHaveLength(1);
  });

  it('creates nothing once `ngDevMode` is cleared, as a production build does', async () => {
    vi.stubGlobal('ngDevMode', false);
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    await flush(fixture);

    expect(warned).toEqual([]);
  });

  it('is inert on the server, where no render hook runs', async () => {
    vi.stubGlobal('ngServerMode', true);
    const fixture = await mount();

    fixture.componentInstance.open.set(true);
    await flush(fixture);

    expect(warned).toEqual([]);
  });
});
