# prelegal
A platform for drafting common legal agreements - Following Ed Donner's AI Coding Agents Course

## Status

🚧 This project is a work in progress and is expected to be completed within a week. 🚧

## Running locally

Requires Docker.

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

The app is served at http://localhost:8000. The SQLite database is recreated from scratch on every start, and the login screen is a placeholder that accepts any input (no real authentication yet).

## Development

- `backend/` — FastAPI app (uv-managed). Run tests with `uv run pytest` from `backend/`.
- `frontend/` — Next.js app, statically exported and served by the backend. Run tests with `npm test` from `frontend/`.
