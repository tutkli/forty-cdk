import { Component, signal } from '@angular/core';
import { ForAspectRatio } from 'forty-cdk/aspect-ratio';
import { ForAvatar, ForAvatarFallback, ForAvatarImage } from 'forty-cdk/avatar';
import { ForBreadcrumbItem, ForBreadcrumbs, ForBreadcrumbSeparator } from 'forty-cdk/breadcrumbs';
import { injectBreakpoints } from 'forty-cdk/breakpoints';
import { ForVisuallyHidden } from 'forty-cdk/core';
import { ForMeter, ForMeterIndicator } from 'forty-cdk/meter';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';
import {
  ForScrollArea,
  ForScrollAreaContent,
  ForScrollAreaCorner,
  ForScrollAreaScrollbar,
  ForScrollAreaThumb,
  ForScrollAreaViewport,
} from 'forty-cdk/scroll-area';
import { ForSeparator } from 'forty-cdk/separator';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
} from 'forty-cdk/toolbar';

@Component({
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #a="forAvatar">
      <img forAvatarImage src="https://example.test/avatar.png" alt="user" />
      @if (a.shouldShowFallback()) {
        <span forAvatarFallback>AB</span>
      }
    </span>
  `,
})
export class AvatarFixture {}

@Component({
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs>
      <ol>
        <li><a forBreadcrumbItem href="/">Home</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li><a forBreadcrumbItem href="/library">Library</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li><a forBreadcrumbItem href="/library/data" current>Data</a></li>
      </ol>
    </nav>
  `,
})
export class BreadcrumbsFixture {}

@Component({
  imports: [ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <nav forPagination [count]="11" ariaLabel="Pagination" #pg="forPagination">
      <button forPaginationPrevious aria-label="Previous">‹</button>
      @for (item of pg.items(); track $index) {
        @if (item.type === 'page') {
          <button forPaginationItem [page]="item.value!">{{ item.value }}</button>
        } @else {
          <span aria-hidden="true">…</span>
        }
      }
      <button forPaginationNext aria-label="Next">›</button>
    </nav>
  `,
})
export class PaginationFixture {}

@Component({
  imports: [ForToolbar, ForToolbarButton, ForToolbarSeparator, ForToolbarLink],
  template: `
    <div forToolbar ariaLabel="Formatting">
      <button forToolbarButton>Undo</button>
      <span forToolbarSeparator></span>
      <a forToolbarLink href="/help">Help</a>
    </div>
  `,
})
export class ToolbarFixture {}

@Component({
  imports: [ForMeter, ForMeterIndicator],
  template: `
    <div forMeter [value]="40" [min]="0" [max]="100">
      <div forMeterIndicator></div>
    </div>
  `,
})
export class MeterFixture {}

@Component({
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div forProgress [value]="40">
      <div forProgressIndicator></div>
    </div>
  `,
})
export class ProgressFixture {}

@Component({
  imports: [ForSeparator],
  template: `<hr forSeparator />`,
})
export class SeparatorFixture {}

@Component({
  imports: [ForAspectRatio],
  template: `<div forAspectRatio [ratio]="16 / 9"></div>`,
})
export class AspectRatioFixture {}

@Component({
  imports: [ForVisuallyHidden],
  template: `
    <span forVisuallyHidden>Loading complete</span>
    <a href="#main" forVisuallyHidden focusable>Skip to content</a>
  `,
})
export class VisuallyHiddenFixture {}

@Component({
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport>
        <div forScrollAreaContent>content</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical">
        <div forScrollAreaThumb></div>
      </div>
      <div forScrollAreaScrollbar orientation="horizontal">
        <div forScrollAreaThumb></div>
      </div>
      <div forScrollAreaCorner></div>
    </div>
  `,
})
export class ScrollAreaFixture {}

@Component({
  imports: [ForPaneResizer],
  template: `
    <div forPaneResizer orientation="vertical" [(value)]="size" [min]="0" [max]="100"></div>
  `,
})
export class PaneResizerFixture {
  readonly size = signal(50);
}

@Component({
  template: `
    <p>{{ active() ?? 'base' }}</p>
    @if (wide()) {
      <span>wide</span>
    }
  `,
})
export class BreakpointsFixture {
  private readonly bp = injectBreakpoints();
  readonly active = this.bp.active;
  readonly wide = this.bp.up('lg');
}
