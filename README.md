# AI Model Timeline

An interactive release-history explorer for text-generating AI models, hosted on GitHub Pages.

**Live site:** https://cybird-d.github.io/AI-Model-LLM-Timeline/

## Features

- Company swimlanes with **separate Open and Closed subtracks**. Companies with only one matching status do not show an empty subtrack.
- Chronologically positioned release cards, with automatic **vertical collision avoidance** and dynamic track height.
- **Overview** aggregates nearby releases; **Releases** uses concise **Family** cards for compatible same-day variants (e.g. `GPT-4.1 Family`); **All models** displays individual models where appropriate **but preserves those same-day Family cards** (also when zoom is at maximum). Clicking a Family card shows its original model names and release date.
- Compact cards use content-based widths and wrapped, non-ellipsized model names. Vertical tracks still avoid collisions.
- Existing dataset labels that cannot be unambiguously split (for example a family label without specific model names) remain intact rather than fabricating IDs.
- Search across companies, titles, model names, dates and capabilities.
- Company, availability, capability, and precise **month-to-month** range controls. Click either date button to open a consistent year / 12-month picker with keyboard support; the selectable range extends to the current month, even if newer releases have not yet been added.
- **Collapsible filters** on the left, a taller timeline window, and optional **Expand** workspace mode.
- Scrollable timeline on desktop, responsive filters and list mode for mobile.
- Details drawer and shareable filter URLs.
- Light/dark themes and keyboard support (press `/` to search; `Escape` closes the drawer).

## Dataset and verification

The timeline "Named models" counter counts expanded display labels derived from explicitly specified variants. Because some legacy source labels are ambiguous, it is not a definitive count of all published models.

The site loads its release records from [`data/releases.json`](./data/releases.json). This file currently contains **322 release entries**, including **47 newly added release events** from May–October 2026. Entries migrated from the previous HTML version are **not automatically validated**; newly added entries carry source URLs and date-specific release status.

**Coverage:** The latest documented text-producing LLM release in this dataset is **October 13, 2026** (Gemini 4 Argon). The dataset update date is **October 14, 2026**. Coverage of releases before and after May 2026 is selective, **not an exhaustive census**. Historical entries without primary sources remain unverified; the page exposes missing references rather than inventing them.

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

## 2026 source-backed update

This refresh uses the [companion API pricing repository](https://github.com/CYBIRD-D/LLM-API-Official-Pricing-Tracker) **as a discovery aid**, not as a publication-date authority. Final dates and Open / Closed labels are checked against first-party announcements, model cards, API release notes and officially linked downloadable model weights. Providers with no pricing record are covered separately.

| Company | Newly added events | Primary sources |
| --- | ---: | --- |
| OpenAI | 5 | OpenAI product announcement pages |
| Anthropic | 8 | Anthropic newsroom |
| Google | 6 | Gemini API changelog |
| Meta | 5 | Meta AI Research and Meta Newsroom |
| Mistral | 3 | Mistral release posts and model documentation |
| DeepSeek | 1 | DeepSeek API update / official model files |
| Qwen | 6 | Alibaba Model Studio release list and Qwen GitHub |
| xAI | 4 | xAI release posts and API changelog |
| GLM / Z.AI | 3 | Z.AI model launch blog |
| Moonshot / Kimi | 4 | Kimi announcements and Kimi Code changelog |
| MiniMax | 2 | MiniMax's model announcement and June 12 downloadable weights |

**Launch and weights can be different events.** A closed API launch followed by an open checkpoint release gets two dated entries, for example Kimi K3 (July 16 / July 27, 2026) and MiniMax M3 (June 1 / June 12, 2026). A future promise of open weights does **not** make the initial API release Open; for example the Mistral Large 4 preview is Closed as of October 14.

We retain provider-specific dates, avoid fake release dates inferred from prices or marketing names, and do not create separate model entries for API service-speed tiers (such as HighSpeed). Embeddings-only, speech-only, image-generation-only and video-generation-only systems are out of scope for the text-producing LLM timeline. The original April 29 Mistral Medium 3.5 entry was also corrected to Open based on Mistral's first-party model lifecycle and licensing documentation.

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
- `app.js` — loading, layout, filtering, grouping, navigation and interactive month selection.
- `data/releases.json` — editable release-history database with per-event source, verification status and optional event type / notes.

The repository uses a static site so the current GitHub Pages publishing configuration can serve it without a build pipeline.

## Contributing

Please [open an issue](https://github.com/CYBIRD-D/AI-Model-LLM-Timeline/issues/new) with the model name, exact date, initial availability, official release announcement, and any follow-up model-weight release date.

Related project: [Official LLM API Pricing Tracker](https://github.com/CYBIRD-D/LLM-API-Official-Pricing-Tracker).
