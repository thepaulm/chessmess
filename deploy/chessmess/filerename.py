#!/usr/bin/env python
import sys
import os

def rename_to_hex(directory, filename):
    original_path = os.path.join(directory, filename)
    # Encode the filename as bytes, then convert to hex
    hex_name = filename.encode('utf-8').hex()
    new_path = os.path.join(directory, hex_name)
    
    # Rename the file
    os.rename(original_path, new_path)
    return hex_name

def main(file):
    rename_to_hex(".", file)

if __name__ == '__main__':
    main(sys.argv[1])
