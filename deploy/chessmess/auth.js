function handleCredentialResponse(response) {
console.log("Encoded JWT ID token: " + response.credential);

// Send the ID token to your backend server for verification
fetch('/verify-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: response.credential })
})
.then(res => res.json())
.then(data => {
  console.log(data);
  if (data.success) {
	// Proceed with the authenticated user
	alert('Login Successful!');
  } else {
	alert('Login failed!');
  }
})
.catch(console.error);
}
