# Prelegal Project

## Overview
 This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user canuse AI chat in order to establish what document they want and how to fill in the fields. The available documents are coveredin catalog.json file in the project root, included here:
 
 @catalog.json
 
 Before we start: the initial implementation is a frontend-only prototype that only supports the Mutual NDA document with no AI chat.

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

- **Product features**: only the Mutual NDA document is implemented (form + live preview + PDF/Markdown download). No AI chat yet; catalog documents beyond the Mutual NDA are not wired up.
- **Backend**: `backend/` is a uv-managed FastAPI app (`app/main.py`, `app/db.py`, `app/auth.py`). SQLite (`backend/data/app.db`) is recreated from scratch on every startup — a `users` table (`id`, `username`, `password_hash`, `created_at`) backs real accounts.
  - `POST /api/auth/signup` — creates an account (bcrypt-hashed password), 409 on duplicate username
  - `POST /api/auth/login` — 200 on valid username/password, 401 otherwise (unknown user or wrong password)
  - `GET /api/health` — health check
- **Frontend**: `frontend/` is statically exported (`next.config.ts` `output: "export"`) and served by FastAPI's `StaticFiles` mount at `/`. A login screen (`components/LoginScreen.tsx`) toggles between "Log In" and "Create Account" and calls the endpoints above; a successful login is remembered in `sessionStorage` (cleared on sign out or when the tab/browser closes) — no server-side session/token.
- **Docker/scripts**: `Dockerfile` (multi-stage: Node build → uv/Python runtime) + `docker-compose.yml` package frontend and backend into one container; `scripts/{start,stop}-{mac,linux}.sh` and `*-windows.ps1` wrap `docker compose up`/`down`.
- **Not yet implemented**: AI chat / LLM integration (Cerebras via LiteLLM/OpenRouter), the remaining catalog document types, and persistent (non-ephemeral) storage.