# ChessMess (PGN Train)

A browser-based chess opening trainer. Users paste or upload PGN files, then drill the lines interactively — the app quizzes them on the correct moves through the game tree.

## Project Layout

```
deploy/chessmess/   # All frontend + backend files (served together)
pieces_notebook/    # Jupyter notebook used to generate piece images
```

All deployable code lives in `deploy/chessmess/`. There is no build step.

## Running Locally

Two Python servers need to be running:

```bash
# Main server (auth + PGN storage) on port 8000
python deploy/chessmess/backend.py -u /path/to/user/pgn/directory

# Feedback collection server on port 8245
python deploy/chessmess/http_server.py
```

Then serve the static files (e.g. `python -m http.server` from `deploy/chessmess/`).

For offline/airplane testing, open `fakeuser.html` instead of `index.html` — it bypasses Google OAuth using the hardcoded `TESTUSER` token that the backend accepts.

## Key Files

| File | Purpose |
|------|---------|
| `mainchess.js` | Board rendering, drag-and-drop, move validation, learn mode quiz logic |
| `move_tree.js` | Game tree data structure (`Move`, `MoveOptionNode`); random path selection |
| `effects.js` | Audio playback and visual animations (success/fail markers) |
| `pgn_storage.js` | PGN upload/download UI; list of stored PGNs |
| `auth.js` | Google OAuth sign-in flow |
| `common.js` | Low-level string/character utilities (chess coordinate helpers) |
| `backend.py` | HTTP server: token verification, PGN upload/download, user directories |
| `http_server.py` | Separate feedback collection server (port 8245) |

## Tech Stack

- **Frontend**: Vanilla JS (ES6+), HTML5, no framework, no build tools
- **Backend**: Python 3 `BaseHTTPRequestHandler`; `google-auth` for OAuth verification
- **Auth**: Google OAuth 2.0 (Client ID hardcoded in both `auth.js` and `backend.py`)
- **Storage**: PGN files stored per-user in a server-side directory; filenames are hex-encoded for filesystem safety

## Audio

Audio files (`MovePiece.mp3`, two `.wav` files) live in `deploy/chessmess/`. They are loaded once at startup with `preload = 'auto'` and replayed by resetting `currentTime = 0` before each `.play()` call. Don't remove the reset or the preload — both are needed to avoid playback delay.

## No Build / No Tests

There is no test suite, linter, or bundler. Changes to JS/Python files take effect immediately on reload.
