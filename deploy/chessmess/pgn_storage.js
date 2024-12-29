function add_pgn_filename(pgn) {
    let pgnlist = document.getElementById("pgn_list");
    let li = document.createElement("li");
    li.innerHTML = pgn;
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

async function upload_pgn(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0]; // Get the selected file

    if (!file) {
        alert('Please select a file!');
        return;
    }

    // Read the file content as Base64
    const reader = new FileReader();
    reader.onload = async function () {
        const fileData = reader.result.split(',')[1]; // Get Base64 data (remove data URL prefix)
        const jsonBlob = {
            filename: file.name,
            content: fileData, // Base64 encoded content
        };

        try {
			let idToken = sessionStorage.getItem('google_id_token');
            const response = await fetch('/upload-pgn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`, // Add the token in the Authorization header
                },
                body: JSON.stringify(jsonBlob), // Send the JSON blob
            });

            if (response.ok) {
                const result = await response.json();
                document.getElementById('response').innerText = `File uploaded successfully: ${result.message}`;
                add_pgn_filename(file.name);
            } else {
                throw new Error(`Error: ${response.statusText}`);
            }
        } catch (error) {
            document.getElementById('response').innerText = `Upload failed: ${error.message}`;
        }
    };

    reader.onerror = function () {
        alert('Failed to read the file.');
    };

    reader.readAsDataURL(file); // Read file as a Base64 data URL
}

function make_load_handler(pgn_name) {
    return async function(e) {
        let idToken = sessionStorage.getItem('google_id_token');
        fetch('/user-pgn', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`, // Add the token in the Authorization header
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
    /* Get user pgn list */
    var fresp = await fetch('/user-pgn-list', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${idToken}`, // Add the token in the Authorization header
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

