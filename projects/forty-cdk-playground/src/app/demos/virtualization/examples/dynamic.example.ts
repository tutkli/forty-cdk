import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterEveryRender,
  computed,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { injectVirtualizer } from 'forty-cdk/virtualization';

import { DemoLayout } from '../../../ui/demo-layout';

const WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud'
).split(' ');

interface Message {
  readonly id: number;
  readonly author: string;
  readonly body: string;
}

@Component({
  selector: 'app-virtualization-dynamic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout],
  template: `
    <playground-demo
      title="Dynamic heights (measured)"
      subtitle="When rows vary in height, drop to the headless injectVirtualizer core: it owns no DOM, so the consumer renders the spacer and the absolutely-positioned window themselves. Each rendered row carries [attr.data-index] and is fed to measureElement() in afterEveryRender, so the virtualizer refines its estimates and the scroll range stays accurate as tall and short rows scroll past."
      sourcePath="projects/forty-cdk-playground/src/app/demos/virtualization/examples/dynamic.example.ts"
    >
      <div demo class="vz-demo">
        <div #scroll class="vz-scroll">
          <div class="vz-track" [style.height.px]="v.totalSize()">
            @for (item of v.virtualItems(); track item.key) {
              <article
                #row
                class="vz-msg"
                [attr.data-index]="item.index"
                [attr.aria-setsize]="messages.length"
                [attr.aria-posinset]="item.index + 1"
                [style.transform]="'translateY(' + item.start + 'px)'"
              >
                <header class="vz-msg-head">
                  <span class="vz-msg-author">{{ messages[item.index]!.author }}</span>
                  <span class="vz-msg-id">#{{ item.index + 1 }}</span>
                </header>
                <p class="vz-msg-body">{{ messages[item.index]!.body }}</p>
              </article>
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="v.scrollToIndex(0, { align: 'start' })">
            Top
          </button>
          <button
            type="button"
            class="pg-btn"
            (click)="v.scrollToIndex(messages.length - 1, { align: 'end' })"
          >
            Bottom
          </button>
        </div>
        <p class="pg-hint">
          Every message has a different height. The virtualizer starts from a 64px estimate, then
          measureElement corrects each rendered row, so jumping to the bottom lands precisely.
        </p>
        <p class="pg-state">
          messages: <b>{{ messages.length.toLocaleString() }}</b
          ><br />
          rendered: <b>{{ v.virtualItems().length }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .vz-demo {
      width: min(460px, 100%);
    }

    .vz-scroll {
      height: 380px;
      overflow: auto;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .vz-track {
      position: relative;
      width: 100%;
    }

    .vz-msg {
      position: absolute;
      left: 0;
      width: 100%;
      padding: 0.7rem 0.95rem;
      border-bottom: 1px solid var(--pg-border);
      box-sizing: border-box;
    }

    .vz-msg-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .vz-msg-author {
      font-size: 0.85rem;
      font-weight: 700;
    }

    .vz-msg-id {
      font-family: var(--pg-font-mono);
      font-size: 0.72rem;
      color: var(--pg-text-muted);
    }

    .vz-msg-body {
      margin: 0;
      font-size: 0.86rem;
      line-height: 1.5;
      color: var(--pg-text-muted);
    }
  `,
})
export class VirtualizationDynamicExample {
  protected readonly messages: readonly Message[] = Array.from({ length: 2000 }, (_, i) => {
    const length = 6 + ((i * 7) % 44);
    const body = Array.from({ length }, (_unused, w) => WORDS[(i + w) % WORDS.length]).join(' ');
    return { id: i, author: `User ${(i % 24) + 1}`, body: `${body}.` };
  });

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
  private readonly rowEls = viewChildren<ElementRef<HTMLElement>>('row');

  protected readonly v = injectVirtualizer({
    count: signal(this.messages.length),
    estimateSize: () => 64,
    scrollElement: this.scrollElement,
  });

  constructor() {
    afterEveryRender(() => {
      for (const row of this.rowEls()) {
        this.v.measureElement(row.nativeElement);
      }
    });
  }
}
