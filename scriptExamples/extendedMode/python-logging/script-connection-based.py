#!/usr/bin/env python3
"""
Script to debug the connection based mode of the "Scriptable Notifications"
add-on for Thunderbird.

This script receives the extended message from the add-on and writes it to a
log file in the user's home directory. The file has the same basename as this
script, but the suffix ".log".

MIT License
Copyright (C) 2022  Stephan Helma

"""

import json
import pathlib
import pprint
import signal
import struct
import sys
import time
import traceback


LOGFILE = pathlib.Path(
    '~', pathlib.Path(__file__).with_suffix('.log').name
    ).expanduser()


#
# Helper functions
#

def get_message():
    """Get message from the standard input."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return {}
    length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(length).decode('utf-8')
    return message


def send_message(msg):
    """Send message to the standard output."""
    content = f'"{msg}"'.encode('utf-8')
    length = struct.pack('@I', len(content))
    sys.stdout.buffer.write(length)
    sys.stdout.buffer.write(content)
    sys.stdout.buffer.flush()


def on_sigterm(signum, frame):
    with open(LOGFILE, 'a') as log:
        print(f'\n====== {time.asctime()} ======', file=log, flush=True)
        print(f'****** stdin closed ******', file=log, flush=True)
        exit(0)


#
# Main function
#

def main():
    signal.signal(signal.SIGTERM, on_sigterm)

    with open(LOGFILE, 'a') as log:
        print(f'****** stdin opened ******', file=log, flush=True)
        while True:
            try:
                # Get message sent
                message = get_message()
                if not message:
                    print(file=log, flush=True, end='.')
                    time.sleep(1)
                    continue

                # Parse the message
                payload = json.loads(message)

                # (Pretty) print to logfile
                print(f'\n====== {time.asctime()} ======', file=log, flush=True)
                pp = pprint.PrettyPrinter(stream=log)
                pp.pprint(payload)
                print('======', file=log, flush=True)

                # Send back required message
                send_message({})

            except Exception as e:
                # If anything goes wrong, write the traceback to the logfile
                print(
                    f'EXCEPTION: '
                    f'{"".join(traceback.format_exception(type(e), e, e.__traceback__))}',
                    file=log, flush=True)


if __name__ == '__main__':
    main()
