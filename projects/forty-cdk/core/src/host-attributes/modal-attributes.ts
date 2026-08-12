/**
 * Attribute that exempts a root-level child from the modal inert pass.
 * Carried by dialog / drawer backdrops (portaled alongside the modal)
 * and stamped by `injectOverlayShell` onto anchored-overlay hosts that were
 * opened from inside the protected root, so the initial sweep and the
 * late-sibling observer skip them instead of inerting them like background
 * siblings. The backdrops host-bind the literal; imperative callers use this
 * exported constant.
 *
 * Lives in `forty-cdk/core` rather than beside `InertSiblingsStack` in
 * `forty-cdk/core-overlay` because `LiveAnnouncer` stamps the exempt attribute
 * on its own regions, and the announcer is reached by primitives that compose
 * no overlay at all.
 */
export const MODAL_PEER_ATTRIBUTE = 'data-for-modal-peer';

/**
 * Marks a root-level child as an independent overlay surface that must stay usable while a modal is
 * open.
 *
 * Stronger than {@link MODAL_PEER_ATTRIBUTE}: like a peer it is skipped by the inert pass, and in
 * addition every active modal's dismissible layer treats interactions inside it as inside, so a
 * pointer-down or focus within it never dismisses the modal. A peer such as a backdrop
 * stays part of the dismiss-outside surface; an exempt overlay does not.
 *
 * Carried by `ForToastViewport` and by every `LiveAnnouncer` region. The viewport host-binds the
 * literal; imperative callers use this constant.
 */
export const MODAL_EXEMPT_ATTRIBUTE = 'data-for-modal-exempt';
