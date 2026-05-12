# forty-cdk-docs

Public documentation site for [`forty-cdk`](../forty-cdk). Built with [Analog](https://analogjs.org)
in pure SSG mode (no runtime server), prerendered to static HTML and deployed to Cloudflare Pages.

This is a workspace-internal project — it is not published to npm. The library project
(`projects/forty-cdk/`) is independent and unaffected by anything here.

## Local development

```bash
pnpm install
pnpm docs:dev     # vite dev server, http://localhost:5173
pnpm docs:build   # static build → dist/forty-cdk-docs/
pnpm docs:preview # serve the production build locally
```

The library is imported by source via a tsconfig `paths` mapping in
[`tsconfig.app.json`](./tsconfig.app.json), so changes to library code show up in the docs without a
rebuild — same pattern as `projects/forty-cdk-harness`.

## Content sources

- `src/content/docs/` — conceptual pages (Getting started, Philosophy, A11y patterns, …).
- `projects/forty-cdk/src/lib/<primitive>/README.md` — per-primitive "Usage" sections. The docs
  reads these directly so the README on npm / GitHub stays the single source of truth.

## Routing

Analog file-based router under `src/app/pages/`. Each `*.page.ts` is a route; dynamic segments are
`[slug].page.ts`. The `(group).ts` form declares layout routes that wrap their siblings.
