async function on_user_login() {

    var idToken = sessionStorage.getItem('google_id_token');
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
            var pgn = data['pgns'][i];
            var li = document.createElement("li");
            li.innerHTML = pgn;
            pgnlist.appendChild(li);
        }
    }
}

