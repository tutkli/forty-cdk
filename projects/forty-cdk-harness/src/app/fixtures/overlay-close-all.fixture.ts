import {
  ChangeDetectionStrategy,
  Component,
  inject,
  InjectionToken,
  type Provider,
  ViewEncapsulation,
} from '@angular/core';
import { ForDialogManager } from 'forty-cdk/dialog';
import { ForDrawerManager } from 'forty-cdk/drawer';
import { queryFlag } from './_query-flag';

interface OpenConfig {
  readonly ariaLabel: string;
  readonly providers: Provider[];
  readonly class?: string;
  readonly animateLeave?: string;
}

interface Opener {
  open(component: unknown, config: OpenConfig): unknown;
  closeAll(): void;
}

const OPENER = new InjectionToken<Opener>('OPENER');

const ANIMATED = { class: 'close-all-host', animateLeave: 'close-all-leaving' };

@Component({
  template: `<button data-testid="close-all-b" (click)="closeAll()">Cancel all</button>`,
})
class CloseAllB {
  readonly #opener = inject(OPENER);

  closeAll(): void {
    this.#opener.closeAll();
  }
}

@Component({
  template: `<button data-testid="open-b" (click)="openB()">Open B</button>`,
})
class CloseAllA {
  readonly #opener = inject(OPENER);

  openB(): void {
    this.#opener.open(CloseAllB, {
      ...ANIMATED,
      ariaLabel: 'Overlay B',
      providers: [{ provide: OPENER, useValue: this.#opener }],
    });
  }
}

@Component({
  selector: 'app-overlay-close-all-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .close-all-host {
        opacity: 1;
        transition: opacity 300ms ease-out;
      }
      .close-all-host.close-all-leaving {
        opacity: 0;
      }
    `,
  ],
  template: `<button data-testid="open-close-all-a" (click)="openA($event)">Open A</button>`,
})
export class OverlayCloseAllFixture {
  readonly #opener: Opener = queryFlag('drawer')
    ? (inject(ForDrawerManager) as unknown as Opener)
    : (inject(ForDialogManager) as unknown as Opener);
  readonly #sameLeave = queryFlag('sameLeave');

  openA(event: Event): void {
    (event.currentTarget as HTMLElement).focus();
    this.#opener.open(CloseAllA, {
      ...(this.#sameLeave ? ANIMATED : {}),
      ariaLabel: 'Overlay A',
      providers: [{ provide: OPENER, useValue: this.#opener }],
    });
  }
}
