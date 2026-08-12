# Ischca Portfolio

A bilingual portfolio for Ischca, built as five working interactive design directions in one site.

## Stack

- Astro for static pages and bilingual routing
- React islands for the interactive design lab
- Motion for interface animation
- React Three Fiber for the spatial product scene
- Plain CSS for the complete visual system

## Local development

```sh
pnpm install
pnpm dev
```

Open `/ja/` or `/en/`. The root page chooses a language from the browser locale.

## Checks

```sh
pnpm check
pnpm build
```

The production output is written to `dist/` and can be served by any static host.
