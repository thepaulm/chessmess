#!/usr/bin/env python

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import argparse
import os
import sys
from google.oauth2 import id_token
from google.auth.transport import requests

# Replace with your Google Client ID
GOOGLE_CLIENT_ID = "1088260192283-c62v3ctm2lj1jjtlml2pkmuvl0hpjron.apps.googleusercontent.com"

class Context:
    def __init__(self):
        self.user_dir = None

globalc = Context()

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

def user_dir_name(user_id):
    return os.path.join(globalc.user_dir, user_id)

def make_user_dir(user_id):
    dirname = user_dir_name(user_id)
    try:
        os.mkdir(dirname)
        print("New User %s logged in." % user_id)
    except FileExistsError:
        print("User %s welcome home." % user_id)
    except Exception as e:
        print(f"User dir creation fail: {e}")

def ensure_user_dir(user_dir):
    return os.path.isdir(user_dir)

def get_pgn_listing(user_id):
    dirname = user_dir_name(user_id)
    return [f for f in os.listdir(dirname) if os.path.isfile(os.path.join(dirname, f))]

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
                make_user_dir(result['user_id'])
                # Respond with the verification result
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            else:
                self.send_response(401)

    def do_GET(self):
        if self.path == "/user-pgn-list":
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith("Bearer "):
                self.send_response(401)
            else:
                token = auth_header.split(" ")[1]
                result = verify_google_token(token)
                listing = get_pgn_listing(result['user_id'])
                output = json.dumps({"pgns": listing}, indent=4)
                print("Sending:" + output)
                self.send_response(200)
                self.send_header("Content-Type", "text/json")
                self.end_headers()
                self.wfile.write(output.encode('utf-8'))
        else:
            self.send_response(404)

# Set up and run the server
def run_server():
    parser = argparse.ArgumentParser()
    parser.add_argument('-u', '--user-dir', required=True, default=None, type=str, help="User directory location")
    args = parser.parse_args()
    globalc.user_dir = args.user_dir
    if not ensure_user_dir(globalc.user_dir):
        print("User dir %s not found." % globalc.user_dir)
        sys.exit(-1)

    server_address = ("127.0.0.1", 8000)  # Host on all interfaces, port 8000
    httpd = HTTPServer(server_address, RequestHandler)
    print("Server running on port 8000...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
