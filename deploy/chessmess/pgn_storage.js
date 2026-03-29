let pgn_cache = {};
let stored_pgn_names = [];

function add_pgn_filename(pgn) {
    stored_pgn_names.push(pgn);

    let pgnlist = document.getElementById("pgn_list");
    let li = document.createElement("li");
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';

    let label = document.createElement("span");
    label.textContent = pgn;
    label.style.flexGrow = '1';
    label.style.cursor = 'pointer';
    let lh = make_load_handler(pgn);
    label.addEventListener('mousedown', lh);
    label.addEventListener('touchstart', lh);

    let del = document.createElement("button");
    del.textContent = '✕';
    del.title = 'Delete';
    del.style.marginLeft = '6px';
    del.style.cursor = 'pointer';
    del.style.background = 'none';
    del.style.border = 'none';
    del.style.color = '#888';
    del.style.fontSize = '0.85em';
    del.style.padding = '0 2px';
    del.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${pgn}"?`)) return;
        const idToken = sessionStorage.getItem('google_id_token');
        const resp = await fetch('/delete-pgn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ pgn_name: pgn }),
        });
        if (resp.ok) {
            pgnlist.removeChild(li);
            stored_pgn_names = stored_pgn_names.filter(n => n !== pgn);
            delete pgn_cache[pgn];
        } else {
            alert('Delete failed.');
        }
    });

    li.addEventListener('mouseover', () => { li.style.backgroundColor = '#a0a8aa'; });
    li.addEventListener('mouseout', () => { li.style.backgroundColor = ''; });

    li.appendChild(label);
    li.appendChild(del);
    pgnlist.appendChild(li);
}

function read_file_as_base64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
    });
}

async function upload_one_pgn(file) {
    const fileData = await read_file_as_base64(file);
    const idToken = sessionStorage.getItem('google_id_token');
    const response = await fetch('/upload-pgn', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ filename: file.name, content: fileData }),
    });
    if (!response.ok) {
        throw new Error(`${file.name}: ${response.statusText}`);
    }
    add_pgn_filename(file.name);
}

async function upload_pgn(event) {
    event.preventDefault();

    const files = Array.from(document.getElementById('fileInput').files);
    if (files.length === 0) {
        alert('Please select a file!');
        return;
    }

    const status = document.getElementById('response');
    status.innerText = `Uploading ${files.length} file${files.length === 1 ? '' : 's'}...`;

    const errors = [];
    for (const file of files) {
        try {
            await upload_one_pgn(file);
        } catch (e) {
            errors.push(e.message);
        }
    }

    status.innerText = errors.length === 0
        ? `Uploaded ${files.length} file${files.length === 1 ? '' : 's'}.`
        : `Done with errors: ${errors.join('; ')}`;
}

function make_load_handler(pgn_name) {
    return async function(e) {
        let idToken = sessionStorage.getItem('google_id_token');
        fetch('/user-pgn', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pgn_name: pgn_name })
        })
        .then(res => res.json())
        .then(data => {
            pgn_cache[pgn_name] = data['pgn_data'];
            load_new_pgn(data['pgn_data']);
        }).catch(console.error);
    }
}

async function on_user_login() {
    let idToken = sessionStorage.getItem('google_id_token');
    var fresp = await fetch('/user-pgn-list', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        }
    });
    if (fresp.ok) {
        var data = await fresp.json();
        var pgnlist = document.getElementById("pgn_list");
        for (let i = 0; i < data['pgns'].length; i++) {
            let pgn = data['pgns'][i];
            add_pgn_filename(pgn);
        }
    }
}

async function fetch_all_pgns() {
    const idToken = sessionStorage.getItem('google_id_token');
    if (!idToken) return;
    for (const name of stored_pgn_names) {
        if (pgn_cache[name] !== undefined) continue;
        try {
            const response = await fetch('/user-pgn', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pgn_name: name })
            });
            if (response.ok) {
                const data = await response.json();
                pgn_cache[name] = data['pgn_data'] || '';
            }
        } catch (e) {
            // skip file on error
        }
    }
}

function extract_pgn_moves(pgn_text) {
    try {
        const mt = parse_move_tree(pgn_text);
        const moves = [];
        let at = mt.top;
        while (at.moves.length > 0) {
            moves.push(at.moves[0].move);
            at = at.moves[0].next;
        }
        return moves;
    } catch (e) {
        return [];
    }
}

function extract_pgn_moves_with_positions(pgn_text) {
    try {
        const mt = parse_move_tree(pgn_text);
        const moves = [];
        let at = mt.top;
        while (at.moves.length > 0) {
            const m = at.moves[0];
            moves.push({ move: m.move, start: m.move_start, end: m.move_end, color: m.color });
            at = m.next;
        }
        return moves;
    } catch (e) {
        return [];
    }
}

function count_matching_moves_tree(current_moves, pgn_content) {
    try {
        const mt = parse_move_tree(pgn_content);
        let at = mt.top;
        let count = 0;
        for (const m of current_moves) {
            const match = at.moves.find(opt => opt.move === m.move);
            if (!match) break;
            at = match.next;
            count++;
        }
        return count;
    } catch (e) {
        return 0;
    }
}

async function find_best_pgn_match(pgn_text, user_color = null) {
    await fetch_all_pgns();

    const current_moves = extract_pgn_moves_with_positions(pgn_text);
    if (current_moves.length === 0) return { name: null, diff_ranges: [] };

    let best_name = null;
    let best_count = 0;

    for (const [name, content] of Object.entries(pgn_cache)) {
        if (!content) continue;
        const count = count_matching_moves_tree(current_moves, content);
        if (count > best_count) {
            best_count = count;
            best_name = name;
        }
    }

    if (!best_name) return { name: null, diff_ranges: [] };

    if (best_count >= current_moves.length) return { name: best_name, diff_ranges: [] };

    const first_diff = current_moves[best_count];
    const is_my_move = user_color === null || first_diff.color === user_color;
    const diff_ranges = [{ start: first_diff.start, end: first_diff.end, color: is_my_move ? 'red' : 'blue' }];
    return { name: best_name, diff_ranges };
}
