# Prelegal Project

## Overview
 This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user canuse AI chat in order to establish what document they want and how to fill in the fields. The available documents are coveredin catalog.json file in the project root, included here:
 
 @catalog.json
 
 See "Implementation status" below for what's actually built today.

## Development process
When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any steps from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design
When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design
The entire project should be packaged into a Docker container. The backend should be in backend/ and be a uv project, using FastAPI. The frontend should be in frontend/ 
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.
The frontend is statically built (`next build` with `output: "export"`) and served by FastAPI via `StaticFiles`. There should be scripts in scripts/ for: 
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

- **Product features**: all 12 catalog templates are now wired up (the two Mutual NDA entries collapse into one selectable document, so 11 cards). After login the user lands on a document picker (`components/DocumentPicker.tsx`): a grid of cards for every supported type, plus a free-text box that calls `POST /api/documents/route` to match a description to a document or explain that it's unsupported and suggest the closest alternative. The Mutual NDA keeps its original hand-built flow (`NdaChat`/`NdaPreview`/`lib/nda.ts`) unchanged. The other 11 use a generic engine (`app/documents.py`) that extracts each template's own defined terms (`coverpage_link`/`orderform_link`/`keyterms_link` spans — 6 to 23 terms per document) and collects a value for each through chat; the rendered document is Cover Page/Order Form/Key Terms term tables followed by the (span-stripped) Standard Terms boilerplate, with no per-document hand authoring. Trade-off from that genericity: it's mechanical term substitution rather than the Mutual NDA's polished cover page, and nested numbered lists (1.1, 1.2 style) render as plain nested markdown numbering since the dotted section numbers came from Common Paper's own CSS, which we don't have.
  - Selecting a generic document immediately shows a live preview with no fields filled in, instead of waiting for the first chat reply (`POST /api/documents/{slug}/render`, a pure template render with no LLM call).
  - A term only appears in its Cover Page/Order Form/Key Terms table once chat has actually collected a value for it — no `[Term]` placeholder rows, and a table is omitted entirely while every term in it is still unanswered.
  - A `## Signatures` table is always rendered for the document's two contracting parties (Print Name/Signature/Date), independent of the rule above: every one of the 11 generic templates identifies its two parties using exactly two terms from a small closed vocabulary (`Customer`/`Provider`/`Partner`/`Company`, see `PARTY_TERMS` in `app/documents.py`), and a signature line is filled in by hand after printing rather than collected via chat, so it's never hidden for being "unanswered." Print Name fills in once that party's term is known; Signature and Date always stay blank.
- **Backend**: `backend/` is a uv-managed FastAPI app. SQLite (`backend/data/app.db`) is recreated from scratch on every startup — a `users` table (`id`, `username`, `password_hash`, `created_at`) backs real accounts, and a `document_history` table (`id`, `username`, `slug`, `name`, `fields_json`, `markdown`, `updated_at`, `UNIQUE(username, slug)`) holds each user's latest saved snapshot per document type.
  - `POST /api/auth/signup` / `POST /api/auth/login` — bcrypt-hashed accounts (`app/auth.py`). There's still no server-side session/token: the frontend just carries the `username` string it got back and sends it along on every document-related request; the backend trusts whatever `username` a request supplies.
  - `POST /api/chat` — the Mutual NDA's dedicated chat flow (`app/chat.py`), unchanged aside from taking a `username` and autosaving: stateless per turn (full message history + known fields sent each turn), Structured Outputs via `gpt-oss-120b`/LiteLLM/OpenRouter/Cerebras, and the route (not the LLM's prose) deterministically decides completeness against a fixed required-field list. After merging fields each turn it upserts a `document_history` row (`db.save_document_history`) under slug `mutual-nda`.
  - `GET /api/documents` — lists the 11 selectable document types (slug/name/description) for the picker (`app/generic_chat.py`)
  - `GET /api/documents/history?username=...` — lists a user's saved documents (across both the NDA and generic flows, since they share one table), newest-updated first
  - `POST /api/documents/{slug}/chat` — generic per-document chat turn: fields are just `{term_key: value}`, built dynamically per document via `pydantic.create_model`; same deterministic-completeness pattern as the NDA route but with a `markdown` field carrying the fully rendered document each turn (the frontend doesn't merge fields itself here — the response's `fields` are already merged). Also autosaves the merged fields + rendered markdown to `document_history` after every turn.
  - `POST /api/documents/{slug}/render` — renders a document from a given `fields` dict with no LLM call; used to seed the preview the moment a document is selected. Does not autosave (so merely opening a document doesn't create a history entry).
  - `POST /api/documents/route` — Structured Outputs call that maps free text to a catalog slug or explains no match and suggests the closest one; the route clamps any slug the model returns to the real catalog before responding
  - `GET /api/health` — health check
  - Autosave is an upsert keyed on `(username, slug)`: starting a second document of the same type overwrites that type's history entry for that user rather than keeping both — there's no multi-instance history, matching the app's existing one-document-in-progress-per-type mental model.
- **Frontend**: `frontend/` is statically exported (`next.config.ts` `output: "export"`) and served by FastAPI's `StaticFiles` mount at `/`. A login screen (`components/LoginScreen.tsx`) toggles between "Log In" and "Create Account"; a successful login is remembered in `sessionStorage` (cleared on sign out or when the tab/browser closes) — no server-side session/token. After login, a persistent `AppHeader` (History/Change Document/Sign Out) and `DisclaimerBanner` ("not a law firm... have a lawyer review before signing") wrap every screen — the picker, the document chat+preview view, and History. `DocumentPicker` is shown until a document is selected; "Change Document" returns to it without signing out. `NdaChat.tsx` (unchanged aside from sending `username`) merges the AI's partial field extractions into the live form data via `mergeFields()` in `lib/nda.ts`. `DocumentChat.tsx` (also now sends `username`) drives every other document type and just stores whatever merged `fields`/`markdown` the backend returns; `DocumentPreview.tsx` renders that markdown with `react-markdown` + `remark-gfm`. Both chat components share `components/ChatBubble.tsx` and set an explicit dark text color on their message input (it otherwise inherited a light gray from `globals.css`'s dark-mode `prefers-color-scheme` rule, making typed text nearly invisible against the input's white background). Chat history is in-memory only (lost on refresh) for every document type — only the merged fields/markdown are durably saved, not the transcript.
  - "History" (`components/HistoryList.tsx`) fetches `GET /api/documents/history` and shows a card per saved document type; selecting one shows a **read-only** preview (`NdaPreview` for the `mutual-nda` slug, reusing its stored `fields`; `DocumentPreview` for everything else, using its stored `markdown`) — there's no "resume chatting" from history, by design.
  - The main app screen's buttons/focus rings were switched from default Tailwind `indigo-*` to the project's brand palette (`#753991` primary, `#209dd7` secondary) to match the picker/login screens, and `globals.css`'s `body` rule now actually uses the Geist Sans font already loaded in `layout.tsx` (a hardcoded `font-family: Arial` was silently overriding it).
- **Docker/scripts**: `Dockerfile` (multi-stage: Node build → uv/Python runtime) + `docker-compose.yml` package frontend and backend into one container; `scripts/{start,stop}-{mac,linux}.sh` and `*-windows.ps1` wrap `docker compose up`/`down`. The image also copies `catalog.json` and `templates/` to the image root (`app/documents.py` reads them at runtime for the generic document engine). The root `.env` is also loaded on backend startup via `python-dotenv` so `OPENROUTER_API_KEY` is available when running outside Docker.
- **Not yet implemented**: multiple saved instances of the same document type per user (history is one-latest-snapshot-per-type); resuming a document's live chat from history (history is read-only).