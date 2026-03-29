# ChessMess (PGN Train)

A browser-based chess opening trainer. Users paste or upload PGN files, then drill the lines interactively — the app quizzes them on the correct moves through the game tree. Users can also pull in recent games from Lichess and study them against their stored opening PGNs.

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

In production, nginx proxies the backend endpoints (`/upload-pgn`, `/user-pgn`, `/user-pgn-list`, `/delete-pgn`, `/verify-token`) to port 8000. These `location` blocks must be in the **HTTPS (443) server block** — the HTTP (80) block typically just redirects and proxy rules there are never reached.

For offline/airplane testing, open `fakeuser.html` instead of `index.html` — it bypasses Google OAuth using the hardcoded `TESTUSER` token that the backend accepts.

## Key Files

| File | Purpose |
|------|---------|
| `mainchess.js` | Board rendering, drag-and-drop, move validation, learn mode quiz logic |
| `move_tree.js` | Game tree data structure (`Move`, `MoveOptionNode`); random path selection |
| `effects.js` | Audio playback and visual animations (success/fail markers) |
| `pgn_storage.js` | PGN upload/download/delete UI; stored PGN list (sorted alphabetically); PGN cache; best-match and diff logic |
| `lichess.js` | Lichess game fetcher — calls the Lichess API directly from the browser, parses returned PGN, renders game list |
| `auth.js` | Google OAuth sign-in flow |
| `common.js` | Low-level string/character utilities (chess coordinate helpers) |
| `backend.py` | HTTP server: token verification, PGN upload/download/delete, user directories |
| `http_server.py` | Separate feedback collection server (port 8245) |

## Tech Stack

- **Frontend**: Vanilla JS (ES6+), HTML5, no framework, no build tools
- **Backend**: Python 3 `BaseHTTPRequestHandler`; `google-auth` for OAuth verification
- **Auth**: Google OAuth 2.0 (Client ID hardcoded in both `auth.js` and `backend.py`)
- **Storage**: PGN files stored per-user in a server-side directory; filenames are hex-encoded for filesystem safety. The listing is returned sorted case-insensitively by the decoded filename.
- **Lichess**: Games are fetched client-side via `https://lichess.org/api/games/user/{username}` (Lichess allows CORS). No backend involvement. A personal API token is optional (needed only for private games). The response is raw PGN, split on blank lines before `[Event` tags.

## Audio

Audio files (`MovePiece.mp3`, two `.wav` files) live in `deploy/chessmess/`. They are loaded once at startup with `preload = 'auto'` and replayed by resetting `currentTime = 0` before each `.play()` call. The move sound uses the Web Audio API with a randomised `playbackRate` (0.85–1.15×) for pitch variation. Don't remove the reset or the preload — both are needed to avoid playback delay.

## PGN Diff Highlighting

When Learn is clicked on a Lichess game, `pgn_storage.js` compares the game against all stored PGNs to find the best match (most moves in common from move 1). The comparison walks the stored PGN's full tree at each step — all branches are checked, not just the main line — so a move is only flagged if it falls outside every variation. The first diverging move is highlighted in the PGN textarea backdrop:

- **Dark red** — user's move that isn't in the stored PGN
- **Dark blue** — opponent's move that isn't in the stored PGN
- Only the first diverging move is marked; nothing after it

The user's color is determined from the Lichess PGN headers (`[White]`/`[Black]`) and stored in `current_user_color` in `mainchess.js`. It is also used to orient the board correctly (black-at-bottom when user played black).

## PGN Textarea Highlight System

The textarea uses a transparent-overlay backdrop (`#pgn_paste_backdrop`) that sits behind the `<textarea>`. `window.highlightPgnCharacters(start, end)` rebuilds the backdrop HTML on every call, applying CSS classes:

- `.highlight` — yellow, current move (right/left arrow navigation)
- `.highlight-diff-red` — dark red, first diverging user move vs stored PGN
- `.highlight-diff-blue` — dark blue, first diverging opponent move vs stored PGN

`window.setPgnDiffRanges(ranges)` pre-builds a `Map<position, class>` so rendering stays O(n) in PGN length.

## No Build / No Tests

There is no test suite, linter, or bundler. Changes to JS/Python files take effect immediately on reload.
