# Replica Pages Documentation

Index of documentation for the Replica Pages landing page platform.

## Core Architecture

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, module boundaries, data model, API conventions |

## Feature Documentation

| Document | Description |
|----------|-------------|
| [HTML_IMPORT.md](./HTML_IMPORT.md) | HTML/MHTML import, block conversion, form detection |
| [UTM_FLOW.md](./UTM_FLOW.md) | UTM capture, form submit handler, countdown script |
| [BLOCK_LIBRARY.md](./BLOCK_LIBRARY.md) | Block library (folders, items, import from page) |

## Module READMEs

Module-level docs live in the source tree:

- `packages/api/src/modules/*/README.md` — Auth, workspace, domains, pages, forms, submissions, integrations, publishing, scripts
- `packages/web/src/features/scripts/README.md` — Scripts feature
- `packages/api/README.md`, `packages/web/README.md`, `packages/blocks/README.md` — Package overviews
