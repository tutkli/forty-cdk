/**
 * Tracks a table root's offset inside an ancestor scroll container, reading layout only
 * after something that can move the root has changed: a DOM mutation inside the container
 * that is not inside the root's own subtree, a resize of the root or of any element between
 * it and the container, or a resource or web font finishing loading. A render that changed
 * none of those reads nothing. A scroll alone needs no new reading, since `scrollTop` is
 * added back into the offset.
 *
 * Where `MutationObserver` or `ResizeObserver` is missing, every {@link sync} measures.
 */
export class ScrollMarginWatch {
  readonly #root: HTMLElement;
  readonly #report: (margin: number) => void;
  #scroller: HTMLElement | null = null;
  #mutations: MutationObserver | null = null;
  #resizes: ResizeObserver | null = null;
  #fonts: FontFaceSet | null = null;
  /** Set until the offset is read for the current container, and on every sync an observer is missing for. */
  #stale = true;

  constructor(root: HTMLElement, report: (margin: number) => void) {
    this.#root = root;
    this.#report = report;
  }

  /**
   * Bring the reported offset up to date for `scroller`. Meant for the read phase of every
   * render: the mutations that render made are taken synchronously, before their observer
   * callback would run.
   */
  sync(scroller: HTMLElement): void {
    if (scroller === this.#root) {
      this.disconnect();
      this.#report(0);
      return;
    }
    if (scroller !== this.#scroller) {
      this.#connect(scroller);
    }
    if (
      this.#mutations === null ||
      this.#resizes === null ||
      this.#movesRoot(this.#mutations.takeRecords())
    ) {
      this.#stale = true;
    }
    if (this.#stale) {
      this.#measure();
    }
  }

  /** Stop observing the current container. */
  disconnect(): void {
    this.#mutations?.disconnect();
    this.#mutations = null;
    this.#resizes?.disconnect();
    this.#resizes = null;
    this.#scroller?.removeEventListener('load', this.#onLoad, true);
    this.#fonts?.removeEventListener('loadingdone', this.#onLoad);
    this.#fonts = null;
    this.#scroller = null;
    this.#stale = true;
  }

  #connect(scroller: HTMLElement): void {
    this.disconnect();
    this.#scroller = scroller;
    if (typeof MutationObserver !== 'undefined') {
      this.#mutations = new MutationObserver((records) => {
        if (this.#movesRoot(records)) {
          this.#measure();
        }
      });
      this.#mutations.observe(scroller, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizes = new ResizeObserver(() => this.#measure());
      for (let el: HTMLElement | null = this.#root; el !== null; el = el.parentElement) {
        this.#resizes.observe(el);
        if (el === scroller) {
          break;
        }
      }
    }
    scroller.addEventListener('load', this.#onLoad, true);
    const fonts: FontFaceSet | undefined = scroller.ownerDocument.fonts;
    this.#fonts = fonts ?? null;
    this.#fonts?.addEventListener('loadingdone', this.#onLoad);
  }

  readonly #onLoad = (): void => {
    this.#measure();
  };

  #movesRoot(records: readonly MutationRecord[]): boolean {
    return records.some(
      (record) => record.target === this.#root || !this.#root.contains(record.target),
    );
  }

  #measure(): void {
    const scroller = this.#scroller;
    if (scroller === null) {
      return;
    }
    this.#stale = false;
    const offset =
      this.#root.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top -
      scroller.clientTop +
      scroller.scrollTop;
    this.#report(Math.round(offset));
  }
}
