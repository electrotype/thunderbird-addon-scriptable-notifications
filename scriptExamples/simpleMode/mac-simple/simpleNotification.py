#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# This is a basic example of a macOS script implementation for
# the "Scriptable Notifications" Thunderbird add-on.
#
# it provides the utility functions required to properly get the
# "hasUnreadMessages" parameter from the add-on, and
# to close the connection properly.
#
# All you have to do to change the "main()" function.
#
# Make sure it is executable and that the shebang at the top
# points to your copy of Python.
#
import sys
import json
import struct
import subprocess
import shlex

#==========================================
# Main function
#==========================================
def main(hasUnreadMessages):
    if hasUnreadMessages:
        msg = "✮✮✮ New mails to read! ✮✮✮"
    else:
        msg = "All mail read."

    showAlert(msg)

#==========================================
# Utility functions.
# Work with Python 3.
#
# From:
# - https://github.com/mdn/webextensions-examples/blob/master/native-messaging/app/ping_pong.py
#==========================================
# Show the message using AppleScript
def showAlert(msg):
    subprocess.run(shlex.split('''
        osascript -e 'display notification \"{}\" with title \"Scriptable Notifications\"'
    '''.format(msg)))

# Read a message from stdin and decode it.
def getMessage():
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        sys.exit(0)
    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode('utf-8')
    return json.loads(message)

# Encode a message for transmission,
# given its content.
def encodeMessage(messageContent):
    encodedContent = json.dumps(messageContent).encode('utf-8')
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}

# Send an encoded message to stdout
def sendMessage(encodedMessage):
    sys.stdout.buffer.write(encodedMessage['length'])
    sys.stdout.buffer.write(encodedMessage['content'])
    sys.stdout.buffer.flush()


#==========================================
# Get the "true" or "false" parameter from the add-on, call the
# "main()" function and close the connection properly.
#==========================================
hasUnreadMessages = getMessage()
main(hasUnreadMessages)
sendMessage(encodeMessage("{}"))
