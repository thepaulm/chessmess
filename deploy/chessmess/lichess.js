async function fetch_lichess_games() {
    const username = document.getElementById('lichess-username').value.trim();
    const token = document.getElementById('lichess-token').value.trim();
    const count = parseInt(document.getElementById('lichess-count').value) || 10;
    const status = document.getElementById('lichess-status');

    if (!username) {
        status.textContent = 'Enter a username.';
        return;
    }

    status.textContent = 'Fetching...';
    document.getElementById('lichess-game-list').innerHTML = '';

    const headers = { 'Accept': 'application/x-chess-pgn' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(
            `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${count}&opening=true`,
            { headers }
        );

        if (!response.ok) {
            status.textContent = `Error ${response.status}: ${response.statusText}`;
            return;
        }

        const text = await response.text();
        const games = split_pgn_games(text);

        if (games.length === 0) {
            status.textContent = 'No games found.';
            return;
        }

        status.textContent = `${games.length} game${games.length === 1 ? '' : 's'} loaded.`;
        render_lichess_game_list(games, username);
    } catch (e) {
        status.textContent = `Failed: ${e.message}`;
    }
}

function split_pgn_games(text) {
    // Each game starts with [Event; split on blank lines before [Event
    const parts = text.trim().split(/\n\n+(?=\[Event)/);
    const games = [];
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
            games.push({ pgn: trimmed, headers: parse_pgn_headers(trimmed) });
        }
    }
    return games;
}

function parse_pgn_headers(pgn) {
    const headers = {};
    for (const m of pgn.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) {
        headers[m[1]] = m[2];
    }
    return headers;
}

function render_lichess_game_list(games, username) {
    const list = document.getElementById('lichess-game-list');

    for (const game of games) {
        const h = game.headers;
        const is_white = (h.White || '').toLowerCase() === username.toLowerCase();
        const color = is_white ? 'W' : 'B';
        const opponent = is_white ? (h.Black || '?') : (h.White || '?');
        const result = format_result(h.Result, is_white);
        const date = (h.Date || '?').replace(/\./g, '-');
        const opening = h.Opening || '';

        const dot = document.createElement('span');
        dot.textContent = '● ';
        dot.style.color = result === 'Win' ? '#22aa22' : result === 'Loss' ? '#cc2222' : '#aaaaaa';

        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.padding = '2px 0';
        li.appendChild(dot);
        li.appendChild(document.createTextNode(`${date} · ${color} vs ${opponent}${opening ? ' · ' + opening : ''}`));
        li.addEventListener('mouseover', () => { li.style.backgroundColor = '#a0a8aa'; });
        li.addEventListener('mouseout',  () => { li.style.backgroundColor = ''; });
        li.addEventListener('mousedown', () => { load_new_pgn(game.pgn); });
        li.addEventListener('touchstart', () => { load_new_pgn(game.pgn); });
        list.appendChild(li);
    }
}

function format_result(result, is_white) {
    if (result === '1/2-1/2') return 'Draw';
    if (result === '1-0')     return is_white ? 'Win' : 'Loss';
    if (result === '0-1')     return is_white ? 'Loss' : 'Win';
    return result || '?';
}
