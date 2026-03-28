function add_pgn_filename(pgn) {
    let pgnlist = document.getElementById("pgn_list");
    let li = document.createElement("li");
    li.textContent = pgn;
    li.addEventListener('mouseover', () => {
        li.style.backgroundColor = '#a0a8aa';
    });
    li.addEventListener('mouseout', () => {
        li.style.backgroundColor = '';
    });
    let lh = make_load_handler(pgn);
    li.addEventListener('mousedown', lh);
    li.addEventListener('touchstart', lh);
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
