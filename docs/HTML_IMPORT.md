# HTML Import

Replica Pages supports importing existing HTML landing pages and converting them into editable blocks. This document describes supported patterns, conversion heuristics, and limitations.

## Overview

- **Input**: Any HTML. Accepts:
  - **Chrome save formats**: HTML Only (`.html`), Single File (`.mhtml`), Complete (folder)
  - **Other sources**: Chatbots, Figma exports, `.txt` files, or any file containing HTML
- **Output**: Block tree (`PageContentJson`) with detected forms; blocks are also imported into the block library
- **Form mapping**: When forms are detected, the user is always prompted to map fields to canonical fields (first_name, last_name, email, phone, etc.)
- **Parsing**: Client-side using `DOMParser` (no server round-trip for large files)

## Import Flow

1. User uploads HTML or MHTML file from the Pages list or create-page flow via `UploadPageModal`
2. For MHTML: `extractHtmlFromMhtml()` extracts the main HTML part from the multipart document
3. HTML is parsed in the browser
4. DOM is traversed and mapped to block types
5. Forms are detected and extracted for mapping
6. User creates a new page or replaces existing page content
7. On create, blocks are imported into the block library via `POST /api/v1/library/import`
8. If forms were detected, form mapping dialog opens

## Supported Block Mappings

| HTML Element | Block Type | Notes |
|--------------|------------|-------|
| `<section>` | Section | Layout container |
| `<div class="section">`, `div.section`, `div.block`, `div.hero` | Section | Class-based detection |
| `<h1>`–`<h6>` | Text (heading) | Preserves level |
| `<p>` | Text (paragraph) | |
| `<img>` | Image | `src`, `alt`; relative URLs optionally resolved with `baseUrl` |
| `<a>` (button-like) | Button | Classes: `btn`, `button`, `cta`, `primary`, `secondary`; or `role="button"` |
| `<hr>` | Divider | |
| `<form>` | Custom HTML | Form kept intact; metadata extracted for detection |
| `<table>`, `<iframe>`, `<video>`, `<audio>` | Custom HTML | Complex layouts preserved as-is |
| Generic `<div>`, `<article>`, `<aside>`, `<header>`, `<footer>` | Section or Custom HTML | Section if children are mappable; else Custom HTML |
| Other unmappable elements | Custom HTML | `innerHTML` preserved |

## Form Detection

- **Scope**: All `<form>` elements in the document
- **Extracted per form**:
  - `selector`: `#id`, `form[name="x"]`, or `form:nth-of-type(n)`
  - `fields`: `name`, `id`, `type`, `label`, `placeholder` for each input/textarea/select
- **Excluded**: `submit`, `button`, `image` input types
- **Usage**: After import, detected forms always open the form mapping dialog. User maps each form field to canonical fields (first_name, last_name, email, phone, company, title) or skips. Submit interception routes through the canonical pipeline.

## Structure Preservation

- Nested divs are converted to Section blocks with children
- Block tree mirrors DOM hierarchy where possible
- Single child sections may be flattened when appropriate

## Limitations

1. **Scripts and styles**: `<script>` and `<style>` elements are stripped during conversion. Page-level scripts can be configured separately in the builder.
2. **Complex layouts**: Tables, iframes, and custom components become Custom HTML blocks. They remain editable as raw HTML.
3. **Relative asset URLs**: Image `src` values are kept as-is unless a `baseUrl` is provided. For zip imports with assets, future support may resolve paths to `/assets/...`.
4. **Zip with assets**: Zip extraction is not yet implemented. The UI mentions zip; the implementation only accepts `.html`/`.htm`/`.mhtml`/`.mht` files directly. Zip support is planned.
5. **Perfect fidelity**: Conversion is heuristic-based. Some layouts may not map 1:1; Custom HTML fallback ensures no content is lost.

## File Structure

```
packages/web/src/lib/html-import/
  htmlParser.ts    - Parse HTML, DOM helpers
  blockConverter.ts - DOM → block tree
  formDetector.ts  - Extract form metadata
  mhtmlParser.ts   - Parse MHTML (Chrome "Save as Single File"), extract HTML part
  index.ts         - Public exports
```

## API

- `parseHtml(html: string): Document`
- `htmlToBlocks(html: string, baseUrl?: string): PageContentJson`
- `detectFormsFromHtml(html: string): DetectedForm[]`
- `extractHtmlFromMhtml(mhtmlText: string): string | null` — Extracts HTML from MHTML multipart document; returns `null` if no HTML part found
