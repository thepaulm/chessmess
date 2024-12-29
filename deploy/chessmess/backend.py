#!/usr/bin/env python

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from google.oauth2 import id_token
from google.auth.transport import requests

# Replace with your Google Client ID
GOOGLE_CLIENT_ID = "1088260192283-c62v3ctm2lj1jjtlml2pkmuvl0hpjron.apps.googleusercontent.com"

def verify_google_token(token):
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)

        # ID token is valid; extract the user information
        user_id = idinfo['sub']  # Unique user ID
        email = idinfo['email']  # User's email
        name = idinfo.get('name')  # User's name (optional)

        return {
            "success": True,
            "user_id": user_id,
            "email": email,
            "name": name
        }
    except ValueError as e:
        # Token is invalid
        return {"success": False, "error": str(e)}

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/verify-token":
            # Read and parse the request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            # Extract the token
            token = data.get("token")
            if not token:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Token is missing"}).encode("utf-8"))
                return

            # Verify the token
            result = verify_google_token(token)
            if result['success']:
                # Respond with the verification result
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            else:
                self.send_response(401)

    def do_GET(self):
        if self.path == "/user-pgn-list":
            print("USER PGN LIST REQUEST")
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith("Bearer "):
                self.send_response(401)
            else:
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
        else:
            self.send_response(404)

# Set up and run the server
def run_server():
    server_address = ("127.0.0.1", 8000)  # Host on all interfaces, port 8000
    httpd = HTTPServer(server_address, RequestHandler)
    print("Server running on port 8000...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
