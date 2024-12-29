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
}

