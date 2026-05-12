import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk';

/**
 * Fixture for the keyboard / focus journey through an Accordion that jsdom
 * mis-models in the Vitest contract layer (`document.activeElement` ordering
 * + focus-event timing). Mounts five items, the third is disabled by default
 * so disabled-skip can be exercised without query flags.
 *
 * Query params:
 *  - `?multiple=1` — allow multiple panels open simultaneously.
 *  - `?disabled=1,3` — comma-separated 1-based indices of items to disable
 *    (overrides the default disabled item).
 *  - `?orientation=horizontal` — switch arrow keys to Left/Right.
 *  - `?dir=rtl` — flip Left/Right meaning under horizontal orientation.
 */
@Component({
  selector: 'app-accordion-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <input data-testid="before" placeholder="before-accordion" />
    <div
      data-testid="root"
      forAccordion
      [(value)]="value"
      [multiple]="multiple"
      [orientation]="orientation"
      [dir]="dir"
      collapsible
    >
      @for (id of items; track id; let i = $index) {
        <div forAccordionItem [value]="id" [disabled]="disabled.has(i + 1)">
          <h3>
            <button
              type="button"
              forAccordionTrigger
              [attr.data-testid]="'trigger-' + id"
            >
              {{ id }}
            </button>
          </h3>
          <section [attr.data-testid]="'content-' + id" forAccordionContent>Panel {{ id }}</section>
        </div>
      }
    </div>
    <input data-testid="after" placeholder="after-accordion" />
  `,
})
export class AccordionFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly items = ['a', 'b', 'c', 'd', 'e'] as const;

  protected readonly multiple = this.#route.snapshot.queryParamMap.get('multiple') === '1';

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'horizontal'
      ? 'horizontal'
      : 'vertical';

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly disabled: ReadonlySet<number> = parseDisabled(
    this.#route.snapshot.queryParamMap.get('disabled'),
  );

  protected readonly value = signal<readonly string[]>([]);
}

function parseDisabled(raw: string | null): ReadonlySet<number> {
  if (!raw) return new Set();
  const parts = raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1);
  return new Set(parts);
}
