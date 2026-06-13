# forty-cdk

Headless / styleless UI primitives for Angular with WAI-ARIA accessibility built in.
Inspired by Radix UI and Base UI but reinterpreted idiomatically for modern Angular.

The library exposes state, behavior, focus management, and keyboard interaction; you apply
your own styles. Every primitive is standalone, `OnPush`, signal-based, and works under
`provideZonelessChangeDetection()`.

## Installation

```bash
npm install forty-cdk
```

## Documentation

- [Library README](projects/forty-cdk/README.md) — installation, peer dependencies, the full
  primitive list, and the directive → host element matrix.
- [Your first overlay](docs/your-first-overlay.md) — one Popover from empty markup to
  styled-and-animated, explaining the `@if` / open-state model and the portal → global CSS
  requirement every overlay shares.
- [Styling forty-cdk](docs/styling.md) — the three hooks you style against: your own class,
  `data-*` state attributes, and `--for-*` custom properties.
- [`docs/`](docs) — the remaining guides (styling floating content, the selected-indicator
  pattern, wrapping form primitives).
- [CHANGELOG](CHANGELOG.md) — release notes.

## Development

This is an Angular CLI workspace with the `forty-cdk` library and a dev-only
`forty-cdk-harness` app used by the Playwright E2E suite. The repo uses
[pnpm](https://pnpm.io/) (pinned via Corepack).

```bash
pnpm test        # unit tests (Vitest + jsdom), pinned to the library project
pnpm lint        # eslint (flat config)
pnpm build       # ng build forty-cdk (production, ng-packagr → dist/forty-cdk)
pnpm watch       # ng build forty-cdk --watch --configuration development
pnpm test:e2e    # playwright test (Chromium + WebKit; spins up the harness)
```

## License

See [LICENSE](LICENSE).
