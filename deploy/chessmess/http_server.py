#!/usr/bin/env python

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import uuid

max_length = 1024 * 30
basedir = "feedback_out"

class FeedbackHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
            # Handle preflight CORS request
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

    def save_feedback(self, data):
        filename = f"{uuid.uuid4()}.txt"
        with open(basedir + "/" + filename, "w") as file:
            file.write(data)
            file.write("\n")

    def do_POST(self):
        # Get the content length to know how much data to read
        content_length = int(self.headers.get('Content-Length', 0))
        
        # Read the POST data
        post_data = self.rfile.read(content_length)

        if len(post_data) > max_length:
            post_data = post_data[:max_length]

        self.save_feedback(post_data.decode('utf-8'))

        # Send response headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # Allow CORS for POST
        self.end_headers()

if __name__ == "__main__":
    host = "0.0.0.0"
    port = 8245
    server = HTTPServer((host, port), FeedbackHTTPRequestHandler)
    print(f"Starting server on {host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

