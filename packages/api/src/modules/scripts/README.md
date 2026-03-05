# Scripts Module

Script allowlist, CSP generation, and script injection for Replica Pages.

## Overview

- **Global scripts** (admin only): Header and footer code stored at workspace level, injected on every published page.
- **Page scripts**: Header and footer code per page, stored in `Page.scripts`.
- **Allowlist**: Admin-managed list of domains (and optional path constraints) that scripts can load from.
- **CSP**: Content-Security-Policy derived from allowlist; applied when serving pages.

## Files

- `scripts.types.ts` – Types for allowlist entries.
- `csp.ts` – CSP string generation from allowlist.
- `README.md` – This file.

## Usage

```ts
import { buildCspFromAllowlist } from './csp.js';

const allowlist = [{ domain: 'https://cdn.example.com' }, { domain: 'analytics.example.com', pathPrefix: '/track' }];
const csp = buildCspFromAllowlist(allowlist);
// script-src 'self' https://cdn.example.com https://analytics.example.com/track; ...
```

## Script Injection Order

When serving a page:

1. Before `</head>`: global header script, then page header script.
2. Before `</body>`: global footer script, then page footer script.
