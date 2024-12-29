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
    }
}

