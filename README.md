# AI Model Timeline

An interactive release-history explorer for text-generating AI models, hosted on GitHub Pages.

**Live site:** https://cybird-d.github.io/AI-Model-LLM-Timeline/

## Features

- Company swimlanes with **separate Open and Closed subtracks**. Companies with only one matching status do not show an empty subtrack.
- Chronologically positioned release cards, with automatic **vertical collision avoidance** and dynamic track height.
- **Overview** aggregates nearby releases; **Releases** uses concise **Family** cards for compatible same-day variants (e.g. `GPT-4.1 Family`); **All models** displays individual models where appropriate **but preserves those same-day Family cards** (also when zoom is at maximum). Clicking a Family card shows its original model names and release date.
- Compact cards omit redundant prefixes such as GPT, Gemini and Claude while preserving distinguishing names such as gpt-oss, Gemma, QwQ, Next, Omni and VL. Hover text, search and Details retain full names. Vertical tracks still avoid collisions.
- Qwen and Gemma families are derived from actual model identifiers. Same-day parameter variants remain one Family card in every mode and at every zoom; Qwen Next / Omni / VL / Coder / Math and Gemma / Gemma 3n / PaliGemma / MedGemma stay distinct.
- Existing dataset labels that cannot be unambiguously split (for example a family label without specific model names) remain intact rather than fabricating IDs.
- Search across companies, titles, model names, dates and capabilities.
- Company, availability, capability, and precise **month-to-month** range controls. Click either date button to open a consistent year / 12-month picker with keyboard support; the selectable range extends to the current month, even if newer releases have not yet been added.
- **Collapsible filters** on the left, a taller timeline window, and optional **Expand** workspace mode.
- Scrollable timeline on desktop, responsive filters and list mode for mobile.
- Details drawer and shareable filter URLs.
- Light/dark themes and keyboard support (press `/` to search; `Escape` closes the drawer).

## Dataset and verification

The timeline "Named models" counter counts expanded display labels derived from explicitly specified variants. Because some legacy source labels are ambiguous, it is not a definitive count of all published models.

The site loads its release records from [`data/releases.json`](./data/releases.json). This file currently contains **332 release entries**. Four duplicate weight-publication events have been merged into their original model launches. Entries migrated from the previous HTML version are **not automatically validated**; newly added entries carry source URLs and verification status.

**Coverage:** The latest documented release in this dataset is **November 12, 2026** (Gemini 4 Hydrogen). The dataset update date is **November 13, 2026**. Coverage of releases before and after May 2026 is selective, **not an exhaustive census**. Historical entries without primary sources remain unverified; the page exposes missing references rather than inventing them.

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

## Release dates and availability

**Dates always use the original public model launch**, including an initial API or public preview release. Later weight publication is stored as `weight_release_date` and `weight_source` in that record, appears in Details, and does not create a second model launch. Distinct checkpoint revisions retain their own dates. The Grok-1 Base checkpoint is separate from the earlier dialogue-tuned Grok product, as xAI's [release announcement](https://x.ai/news/grok-os) explicitly distinguishes them.

**Open includes published models and models with an explicit, sourced commitment to publish weights within a few months.** An unspecified future intention alone is insufficient. `weight_status: "announced"` and `weight_release_window` retain the actual promise; they do not claim the weights were already published. `weight_status: "published"` and `weight_release_date` record confirmed publication. Classification does not move a launch to the weight publication date.

| Model | Timeline date | Weight information in Details |
| --- | --- | --- |
| MiniMax M3 | 2026-06-01 | Published 2026-06-12 |
| Kimi K3 | 2026-07-16 | Published 2026-07-27 |
| DeepSeek-V4-Flash-Vision-Exp | 2026-08-21 | Published 2026-08-31 |
| Mistral Large 4 Preview | 2026-10-06 | Publication announced by the end of October |
| MiniMax M3.1 Flash | 2026-10-19 | Published 2026-10-23 |
| Kimi K3.1 Pro | 2026-10-23 | Publication announced by November 4 |
| Tencent Hy4 | 2026-11-04 | Publication announced in the coming days |

Sources for announced schedules: [Mistral](https://mistral.ai/news/mistral-large-4/), [Kimi](https://www.kimi.com/en/blog/kimi-k3-1-pro), [Tencent](https://www.tencent.com/tencent-launches-hy4-joining-the-ranks-of-the-worlds-leading-open-source-ai-models/) and [Z.ai](https://z.ai/blog/glm-5.3) (GLM-5.3: within two weeks of its August 14 launch).

## November 13, 2026: Carbon, Hydrogen, Ember, and Qwen4-Max Preview

Five official, dated releases have been added to the timeline (four November 13 additions plus the formal Hy4 correction):

| Release date | Model | Availability at release | Official source |
| --- | --- | --- | --- |
| 2026-11-04 | Tencent Hy4 (formal launch) | Open (announced weight schedule) | [Tencent](https://www.tencent.com/tencent-launches-hy4-joining-the-ranks-of-the-worlds-leading-open-source-ai-models/) |
| 2026-11-09 | Muse Ember 1.0 (API model ID: `muse-ember-1.0`) | Closed | [Meta AI Research](https://research.meta.ai/blog/muse-ember) |
| 2026-11-10 | Gemini 4 Carbon | Closed | [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/) |
| 2026-11-11 | Qwen4-Max-Preview (`qwen4-max-preview`) | Closed | [Alibaba Cloud](https://www.alibabacloud.com/help/en/model-studio/qwen4-max-preview) |
| 2026-11-12 | Gemini 4 Hydrogen | Closed | [Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen/) |

**Important classification details:** The Qwen4 model is a **Token Plan-only preview** dated November 11–25, not a full general-availability release of Qwen4-Max. Google's general Carbon release was November 10, after earlier restricted cybersecurity access whose exact start date is not stated in the main announcement. Qwen4-Max Preview, Carbon, Hydrogen and Ember remain Closed.

**Tencent Hy4 (formal release) added:** Tencent announced Hy4 on **November 4, 2026**, distinct from the earlier Hy4 Preview. The formal model appears under its own **Tencent Hunyuan** lane as Open under the announced near-term publication policy. Its timeline date remains November 4. The separately released Preview's weights must not be conflated with the formal release. **HY5** remains outside the timeline until a verifiable public release. [Official Tencent announcement](https://www.tencent.com/tencent-launches-hy4-joining-the-ranks-of-the-worlds-leading-open-source-ai-models/).

## October 24, 2026: checkpoint revisions and launches

**Dated DeepSeek variants are separate release events**, even if the model family or stable API alias remains the same. For example `DeepSeek-V4.1-Flash` on **Sep 10** and `DeepSeek-V4.1-Flash-1017` on **Oct 17** are different checkpoints. The suffix `-1017` identifies the checkpoint revision date (MMDD), **not** a price tier, separate model family, or independent API alias. The API name `deepseek-flash` automatically serves the current revision. Other versions added are:

| Date | Checkpoint / event | Availability at event |
| --- | --- | --- |
| 2024-06-28 | DeepSeek-V2-Chat-0628 | Open |
| 2024-07-24 | DeepSeek-Coder-V2-Instruct-0724 | Open |
| 2026-07-31 | DeepSeek-V4-Flash-0731 | Open |
| 2026-08-13 | DeepSeek-V4-Pro-0813 | Open |
| 2026-08-21 | DeepSeek-V4-Flash-Vision-Exp | Open; August 31 weight publication is metadata |
| 2026-10-17 | DeepSeek-V4.1-Flash-1017 | Open |

Also corrected the existing `DeepSeek-V3-0324` release date from March 25 to **March 24, 2025** using DeepSeek's official changelog. The original DeepSeek V4 Preview release on April 24 remains separately recorded.

**Newly released model events:**
- **October 19:** `MiniMax-M3.1-Flash` launched via API. Its Open record keeps this date; the October 23 weight publication under the **MiniMax Community License** appears in Details.
- **October 23:** `Kimi K3.1 Pro` became available via Kimi apps, Code, Work and API. It is Open under the announced near-term publication policy, with Moonshot's **November 4, 2026** weight commitment recorded separately from the launch date. The faster Highspeed serving tier uses the same model and is not given its own release card.

Use DeepSeek's [API changelog](https://api-docs.deepseek.com/updates/) and [1017 release announcement](https://api-docs.deepseek.com/news/news261017/), [Moonshot's Kimi Code release history](https://www.kimi.com/code/docs/en/kimi-code/whats-new.html), MiniMax's [October 19 announcement](https://www.minimax.io/blog/minimax-m31f), and the [official October 23 weights](https://huggingface.co/MiniMaxAI/MiniMax-M3.1-Flash) to audit these dates. The model drawer links to first-party weight repositories where applicable.

## 2026 source-backed update

This refresh uses the [companion API pricing repository](https://github.com/CYBIRD-D/LLM-API-Official-Pricing-Tracker) **as a discovery aid**, not as a publication-date authority. Release dates and Open / Closed labels are checked against first-party announcements, model cards, API release notes and officially linked downloadable model weights where possible. If only a dated API snapshot identifier is known (for example Qwen3.7 Flash's July 15 version), the record is explicitly marked `provisional`, not a verified first-public release date. Providers with no pricing record are covered separately.

| Company | Newly added events | Primary sources |
| --- | ---: | --- |
| OpenAI | 5 | OpenAI product announcement pages |
| Anthropic | 8 | Anthropic newsroom |
| Google | 6 | Gemini API changelog |
| Meta | 5 | Meta AI Research and Meta Newsroom |
| Mistral | 2 | Mistral release posts and model documentation |
| DeepSeek | 1 | DeepSeek API update / official model files |
| Qwen | 6 | Alibaba Model Studio release list and Qwen GitHub |
| xAI | 4 | xAI release posts and API changelog |
| GLM / Z.AI | 3 | Z.AI model launch blog |
| Moonshot / Kimi | 4 | Kimi announcements and Kimi Code changelog |
| MiniMax | 2 | MiniMax's model announcement and June 12 downloadable weights |

**One model launch, with separate weight metadata.** Kimi K3 stays on July 16 and MiniMax M3 on June 1, 2026. Their July 27 and June 12 weight publications appear in Details. Mistral Large 4 Preview stays on October 6 and is Open under the sourced near-term publication policy.

We retain provider-specific dates, avoid fake release dates inferred from prices or marketing names, and do not create separate model entries for API service-speed tiers (such as HighSpeed). OCR-only, embeddings-only, speech-only, image-generation-only and video-generation-only systems are out of scope for the text-producing LLM timeline. The original April 29 Mistral Medium 3.5 entry was also corrected to Open based on Mistral's first-party model lifecycle and licensing documentation.

**Availability is the model's category under this project's policy.** The original launch date stays fixed when weight information is updated. Do not add duplicate model launches for weight publication.

Do not assign availability on a company-wide basis: Google, Mistral, Qwen, GLM, MiniMax and Moonshot may have both kinds of releases. The new code no longer automatically forces every release from certain companies to `open`.

Please supply authoritative announcement/model-card references when updating entries and set `verification` only after the event has been checked against the stated source. The `datasetUpdated` field indicates when dataset contents were edited, not how current the covered releases are; use `coverageThrough` for the most recent actual release date.

## Local development

No build step or dependencies are necessary. Serve the repository through a local HTTP server (because `fetch()` does not work reliably from `file://`):

```sh
python -m http.server 8000
```

Then open http://localhost:8000.

Run the grouping, label and release-date regression checks with Node.js:

```sh
node --test tests/grouping.test.cjs
```

## Files

- `index.html` — semantic page structure.
- `styles.css` — responsive themes, swimlanes, cards, and drawer.
- `app.js` — loading, layout, filtering, grouping, navigation and interactive month selection.
- `data/releases.json` — editable release-history database with per-event source, verification status and optional event type / notes.

The repository uses a static site so the current GitHub Pages publishing configuration can serve it without a build pipeline.

## Contributing

Please [open an issue](https://github.com/CYBIRD-D/AI-Model-LLM-Timeline/issues/new) with the model name, exact date, initial availability, official release announcement, and any follow-up model-weight release date.

Related project: [Official LLM API Pricing Tracker](https://github.com/CYBIRD-D/LLM-API-Official-Pricing-Tracker).

