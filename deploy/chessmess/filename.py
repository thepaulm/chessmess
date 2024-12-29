#!/usr/bin/env python

import sys
import os

def main(filename):
	try:
		# Convert the hex string back to the original filename
		print(bytes.fromhex(filename).decode('utf-8'))
	except ValueError:
		print(f"Skipping non-hex file: {filename}")

if __name__ == '__main__':
    main(sys.argv[1])
