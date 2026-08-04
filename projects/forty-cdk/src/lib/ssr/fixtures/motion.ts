import { Component, computed, type ElementRef, signal, viewChild } from '@angular/core';
import {
  ForCarousel,
  ForCarouselDrag,
  ForCarouselIndicator,
  ForCarouselIndicators,
  ForCarouselNext,
  ForCarouselPrevious,
  ForCarouselRotationControl,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk/carousel';
import {
  ForDraggable,
  ForDragHandle,
  ForDragPlaceholder,
  ForDragPreview,
  ForDropList,
  ForDropListGroup,
  ForFreeDrag,
} from 'forty-cdk/drag-drop';
import { ForVirtualReorder } from 'forty-cdk/virtual-reorder';
import { ForVirtualFor, ForVirtualViewport, injectVirtualizer } from 'forty-cdk/virtualization';

@Component({
  imports: [
    ForCarousel,
    ForCarouselDrag,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselPrevious,
    ForCarouselNext,
    ForCarouselIndicators,
    ForCarouselIndicator,
    ForCarouselRotationControl,
  ],
  template: `
    <div forCarousel ariaLabel="Examples">
      <button forCarouselRotationControl></button>
      <button forCarouselPrevious aria-label="Previous">&#x2039;</button>
      <div forCarouselViewport forCarouselDrag>
        <div forCarouselTrack>
          <div forCarouselSlide>One</div>
          <div forCarouselSlide>Two</div>
        </div>
      </div>
      <button forCarouselNext aria-label="Next">&#x203a;</button>
      <div forCarouselIndicators ariaLabel="Choose slide">
        <button forCarouselIndicator></button>
        <button forCarouselIndicator></button>
      </div>
    </div>
  `,
})
export class CarouselFixture {}

@Component({
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselRotationControl,
  ],
  template: `
    <div forCarousel ariaLabel="Examples" autoplay [autoplayInterval]="1000">
      <button forCarouselRotationControl></button>
      <div forCarouselViewport>
        <div forCarouselTrack>
          <div forCarouselSlide>One</div>
          <div forCarouselSlide>Two</div>
        </div>
      </div>
    </div>
  `,
})
export class CarouselAutoplayFixture {}

@Component({
  imports: [
    ForDropListGroup,
    ForDropList,
    ForDraggable,
    ForDragHandle,
    ForDragPreview,
    ForDragPlaceholder,
  ],
  template: `
    <div forDropListGroup>
      <ul forDropList>
        <li forDraggable [dragData]="'a'">
          <span forDragHandle aria-hidden="true">::</span>
          Alpha
        </li>
        <li forDraggable [dragData]="'b'">
          Beta
          <ng-template forDragPreview>preview</ng-template>
          <ng-template forDragPlaceholder>gap</ng-template>
        </li>
      </ul>
      <ul forDropList>
        <li forDraggable [dragData]="'c'">Gamma</li>
      </ul>
    </div>
  `,
})
export class DragDropFixture {}

@Component({
  imports: [ForFreeDrag, ForDragHandle],
  template: `
    <div class="dialog" style="position: relative">
      <header forFreeDrag rootElement=".dialog" boundary=".dialog">
        <span forDragHandle>::</span>
        Drag me
      </header>
    </div>
  `,
})
export class FreeDragFixture {}

@Component({
  template: `
    <div #scroll style="overflow:auto; height:200px">
      <div [style.height.px]="v.totalSize()" style="position:relative">
        @for (item of v.virtualItems(); track item.key) {
          <div
            [attr.data-index]="item.index"
            [attr.aria-setsize]="count()"
            [attr.aria-posinset]="item.index + 1"
            [style.height.px]="item.size"
          >
            Row {{ item.index }}
          </div>
        }
      </div>
    </div>
  `,
})
export class VirtualizerFixture {
  readonly count = signal(1000);
  readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
  readonly v = injectVirtualizer({
    count: this.count,
    estimateSize: () => 40,
    scrollElement: this.scrollElement,
  });
}

@Component({
  imports: [ForVirtualViewport, ForVirtualFor],
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      style="height: 200px"
    >
      <div *forVirtualFor="let row of rows()">{{ row }}</div>
    </div>
  `,
})
export class VirtualViewportFixture {
  readonly rows = signal(Array.from({ length: 1000 }, (_, i) => `Row ${i}`));
}

@Component({
  imports: [ForVirtualViewport, ForVirtualFor, ForVirtualReorder, ForDraggable],
  template: `
    <div
      forVirtualViewport
      [virtualCount]="rows().length"
      [estimateSize]="40"
      forVirtualReorder
      style="height: 200px"
    >
      <div *forVirtualFor="let row of rows()" forDraggable [dragData]="row">{{ row }}</div>
    </div>
  `,
})
export class VirtualReorderFixture {
  readonly rows = signal(Array.from({ length: 1000 }, (_, i) => `Row ${i}`));
}
