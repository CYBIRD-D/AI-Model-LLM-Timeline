# AI Model Timeline

An interactive release-history explorer for text-generating AI models, hosted on GitHub Pages.

**Live site:** https://cybird-d.github.io/AI-Model-LLM-Timeline/

## Features

- Company swimlanes with **separate Open and Closed subtracks**. Companies with only one matching status do not show an empty subtrack.
- Chronologically positioned release cards, with automatic **vertical collision avoidance** and dynamic track height.
- **Overview** aggregates nearby releases; **Releases** shows original dated events; **All models** expands explicitly named variants into individual cards (automatically selected when zoom reaches maximum). Cards remain in their original date positions.
- Existing dataset labels that cannot be unambiguously split (for example a family label without specific model names) remain intact rather than fabricating IDs.
- Search across companies, titles, model names, dates and capabilities.
- Company, availability, capability, precise **month-to-month** range and zoom controls.
- **Collapsible filters** on the left, a taller timeline window, and optional **Expand** workspace mode.
- Scrollable timeline on desktop, responsive filters and list mode for mobile.
- Details drawer and shareable filter URLs.
- Light/dark themes and keyboard support (press `/` to search; `Escape` closes the drawer).

## Dataset and verification

The timeline "Named models" counter counts expanded display labels derived from explicitly specified variants. Because some legacy source labels are ambiguous, it is not a definitive count of all published models.

The site loads its release records from [`data/releases.json`](./data/releases.json). This file contains **275 release entries** migrated from the previous version's embedded release history. Migration is **not** independent historical validation.

**Important:** The source dataset ends **May 7, 2026**, even though it was migrated on October 14, 2026. The site distinguishes **migration date** from **release-history coverage**. Release sources and availability classifications are provisional until each record is checked. Missing references are explicitly shown rather than fabricated.

A data entry has the following structure:

```json
{
  "id": "unique-event-id",
  "company": "goog",
  "date": "2026-05-07",
  "title": "Gemini 3.1 Flash-Lite",
  "models": ["Gemini 3.1 Flash-Lite"],
  "availability": "closed",
  "capabilities": ["Multimodal"],
  "source": null,
  "verification": "unverified"
}
```

**Availability refers to the recorded release event.** A model that was closed at launch but later made open should have an additional dated event representing that later change, rather than rewriting its historical status.

Do not assign availability on a company-wide basis: Google, Mistral, Qwen, GLM, MiniMax and Moonshot may have both kinds of releases. The new code no longer automatically forces every release from certain companies to `open`.

Please supply authoritative announcement/model-card references when updating entries and set `verification` only after the event has been checked against the stated source. The `datasetUpdated` field indicates when dataset contents were edited, not how current the covered releases are; use `coverageThrough` for the most recent actual release date.

## Local development

No build step or dependencies are necessary. Serve the repository through a local HTTP server (because `fetch()` does not work reliably from `file://`):

```sh
python -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html` — semantic page structure.
- `styles.css` — responsive themes, swimlanes, cards, and drawer.
- `app.js` — loading, layout, filtering, grouping, navigation, CSV export.
- `data/releases.json` — editable release-history database.

The repository uses a static site so the current GitHub Pages publishing configuration can serve it without a build pipeline.

## Contributing

Please [open an issue](https://github.com/CYBIRD-D/AI-Model-LLM-Timeline/issues/new) with the model name, exact date, initial availability, official release announcement, and any follow-up model-weight release date.

Related project: [Official LLM API Pricing Tracker](https://github.com/CYBIRD-D/LLM-API-Official-Pricing-Tracker).
