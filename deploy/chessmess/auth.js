window.addEventListener('load', function() {
    google.accounts.id.initialize({
        client_id: '1088260192283-c62v3ctm2lj1jjtlml2pkmuvl0hpjron.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.querySelector('.g_id_signin'),
        { type: 'standard' }
    );
});

function handleCredentialResponse(response) {

    // Send the ID token to your backend server for verification
    fetch('/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            var idToken = response.credential;
            /* Store this token for the session */
            sessionStorage.setItem('google_id_token', idToken);

            // Update the UI with the user's name
            const userNameElement = document.getElementById('user-name');
            userNameElement.textContent = `Hello user: ${data.name || 'User'}!`;

            // Hide the login button and show the user's name
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('user-info').style.display = 'block';

            on_user_login();

        } else {
            alert('Login failed!');
          }
    }).catch(console.error);
}
