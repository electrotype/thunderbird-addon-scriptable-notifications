#!/usr/bin/env python3
"""
Script to work with the "Scriptable Notifications" add-on for Thunderbird.

This is implementing my very personal view, how a system tray indicator for new
mails should work:
    1. It displays only newly arrived mail - the unseen mails (compared to all
       unread mail)
    2. If any (unread) mail is read, all mails in the same folder are considered
       as seen.
    3. The icon should still mark unseen mails in other folders.
    4. If all mail has been seen (that is at least one mail message per folder
       has been read), the icon should hide (configurable)/


Installation
============

This script
...........

1. Install the following Python packages on your system:
    1. `[pystray](https://pypi.org/project/pystray/)` – for the icon in the
       system tray
    2. `[Pillow](https://pypi.org/project/Pillow/)` – to generate the icons
       used
2. Copy this script to a place, where Thunderbird (next step) can find it.
3. Make it executable.
4. Configure it with the help of the `CONFIG` dictionary (see below).

Thunderbird
...........

1. Install the Thunderbird add-on [Scriptable Notifications]
  (https://addons.thunderbird.net/en-US/thunderbird/addon/scriptable-notifications)
  (ScriN).
2. Configure it:
    1. Follow the instructions in the section "Native script and manifest".
    2. Select "Extended" in the section "Type of data sent to the native script".
    3. Select "Connection based" in the section "Type of data connection".
    4. Select the mail folders to monitor.


Usage
=====

If properly configurred, the script is automatically started by Thunderbird.
The user can interact with the status icon with the help of the menu and a
default action, if clicked on the icon (not available on all platforms or
desktop environments).


Configuration
=============

The server can be configured with the help of the `CONFIG` dictionary. The
following options are available:
    'notify' : True|False
        If `True`, a notification is shown for unread mails.
    'show_read_icon' : True|False
        If `True`, the icon stays visible, when all messages are read, otherwise
        the icon will be hidden, if there are no new messages.
    'mail' : str, e.g. 'thunderbird --mail'
        The program to execute as default action, when the icon is clicked (not
        supported on every operating system) and when the menu item "Show
        Thunderbird" is clicked. If this is empty, there will be no default
        action and no menu item will be displayed.
    'mail_reset' : str, e.g. 'thunderbird --mail'
        The program to execute when the menu item "Show Thunderbird/Reset
        counter" is clicked. If this is empty, no menu item will be displayed.
    'reset_menu' : True|False
        If `True`, a menu item to reset all counters will be displayed.
    'quit_menu': True|False
        If `True`, a menu item to quit the system tray icon will be displayed
        (useful for debugging, because this results in the program to be
        restarted with the next new message.
    'logging' : 'WARNING'|'INFO'|'DEBUG'|None
        Set the logging level. Set to `None` to disable all logging. The log
        messages are written into a file. The file has the same name as this
        script, but with the suffix of ".log". It can be found in the user's
        home directory.
    'color' : dictionary with keys 'new mail', 'some mail', 'no mail', 'indifferent'
        This information is used to adapt the icon to one of the four states,
        the icon can be in:
            'new mail':
                There is some new mail, which has not be seen.
            'some mail':
                If there is more than one folder with new mail, this icon wil
                be shown, if any mail in one folder has been read.
            'no mail':
                There is no unseen mail message (only shown, if the
                configuration 'show_read_icon' is set to `True`).
            'indifferent':
                Shown, if it can not be determined, if there are unseen
                messages.
        Each key contains another dictionary with the keys 'fill' and 'outline'.
        The values is a tuple with the RGBA color definition, e.g.
        "(255, 0, 0, 127)" for a semi-transparent red. These colors are used to
        replace the fill color (`PostHorn._fill`) and the outline color
        (`PostHorn._outline`).

Icon
====

The icon included is a post horn. This can be changed by adapting the `_b64`
data property in the `PostHorn` class:
    1. Make a .png image and save it into a `pngfile`.
    2. Encode it:
          >>> base64.encodestring(open(pngfile,"rb").read())
    3. Copy it and paste it into an editor.
    4. Replace all "\n" with a newline.
    5. Copy the string and paste it into `_b64 = '''<png-data>'''`

The included post horn has a transparent background, a black outline and a
white foreground. This is replaced with different shades of yellow, which are
configured in the `CONFIG['color']` dictionary. You might want to keep the same
scheme (transparent background, black outline, white foreground).


TODO
====

- Add menu items, so that Thunderbird opens with the correct mail folder.
- Add action(s) to the notification.


Created on Thu Oct  6 19:49:17 2022

Copyright (C) 2022  Stephan Helma

"""

import base64
import io
import json
import os
import pathlib
import signal
import struct
import sys
import time

from PIL import Image
import pystray


__version_info__ = (0, 1, 0)
__version__ = '.'.join([str(n) for n in __version_info__])
__pyversion__ = '>=3.6'             # We use f-strings!


# The configuration
CONFIG = {
    'notify': False,                # Show notifications
    'show_read_icon': False,        # Show icon, when all messages are read
    'mail': 'thunderbird --mail',   # The program to execute
    'mail_reset': 'thunderbird --mail',     # Reset the counter, when mail program is started
    'reset_menu': True,             # Add menu item to reset the counter for all folders
    'quit_menu': False,             # Add a quit item to the menu
    'color': {
        'new mail': {
            'fill': (238, 210, 2, 255),         # safety yellow
            'outline': (255, 170, 29, 255)      # bright yellow
        },
        'some mail': {
            'fill': (0, 0, 0, 0),               # transparent
            'outline': (255, 170, 29, 255)      # bright yellow
        },
        'no mail': {
            'fill': (255, 255, 255, 255),       # white
            'outline': (127, 127, 127, 255)     # gray
        },
        'indifferent': {
            'fill': (0, 0, 0, 0),               # transparent
            'outline': (255, 255, 255, 191)     # white
        }
    },
#    'logging': 'WARNING'            # Logging level, set to `None` to disable it
#    'logging': 'INFO'
#    'logging': 'DEBUG'
    'logging': None
}


# The logging system
if CONFIG['logging']:
    import logging
    logging.basicConfig(
        level=getattr(logging, CONFIG['logging']),
        format='%(levelname)8s %(funcName)s%(message)s',
        filename=f'/home/sph/{pathlib.Path(__file__).with_suffix(".log").name}')
else:
    # Make a `logging` object, which does nothing
    # https://stackoverflow.com/questions/13521981/implementing-an-optional-logger-in-code#answer-13525899
    class DummyObject(object):
        def __getattr__(self, name):
            return lambda *x: None
        def __bool__(self):
            return False
    logging = DummyObject()


#
# The icon
#

class PostHorn:
    """An icon with the post horn.

    The icon has a transparent background, a black outline and a white fill.
    These three colors can be changed, when calling the initialized icon.

    """

    # Image data
    _b64 = (
        # 1. Make a .png image and save it into a `pngfile`.
        # 2. Encode it:
        #       >>> base64.encodestring(open(pngfile,"rb").read())
        # 3. Copy it and paste it into an editor.
        # 4. Replace "\n" with a newline.
        # 5. Copy the string and paste it here.
        b'''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
        ''')
    # Image colors
    _outline = (0, 0, 0, 255)
    _fill = (255, 255, 255, 255)
    _background = (0, 0, 0, 0)

    def __init__(self):
        self.image = Image.open(
            io.BytesIO(base64.b64decode(self._b64)),
            formats=['PNG'])

    def __call__(self, fill=None, outline=None, background=None):
        """Replace any of the three image colors.

        The colors are specified as a tuple with the four RGBA values, ranging
        from 0 to 255.

        Parameters
        ----------
        fill : RGBA
            New color for the filled areas. If `None`, it will not be changed.
            The default is `None`.
        outline : RGBA
            New color for the outline. If `None`, it will not be changed.
            The default is `None`.
        background : RGBA|None
            New color for the background. If `None`, it will not be changed.
            The default is `None`.

        Returns
        -------
        img
            The new image.
        """
        img = self.image.copy()

        if fill is None and outline is None and background is None:
            # No change requested
            return img

        # Build pairs of replacement colors
        color_pairs = []
        if fill is not None:
            color_pairs.append((self._fill, fill))
        if outline is not None:
            color_pairs.append((self._outline, outline))
        if background is not None:
            color_pairs.append((self._background, background))

        # Replace color pairs
        for x in range(img.width):
            for y in range(img.height):
                for from_color, to_color in color_pairs:
                    if img.getpixel((x, y)) == from_color:
                        img.putpixel((x, y), to_color)

        return img


#
# Main class
#

class StatusIcon:
    """Show an icon in the system tray."""

    def __init__(self):
        logging.debug('()')

        # Set up status icons
        icon = PostHorn()
        self.icons = {
            'indifferent': icon(
                fill=CONFIG['color']['indifferent']['fill'],
                outline=CONFIG['color']['indifferent']['outline']),
            'new mail': icon(
                fill=CONFIG['color']['new mail']['fill'],
                outline=CONFIG['color']['new mail']['outline']),
            'some mail': icon(
                fill=CONFIG['color']['some mail']['fill'],
                outline=CONFIG['color']['some mail']['outline']),
            'no mail': icon(
                fill=CONFIG['color']['no mail']['fill'],
                outline=CONFIG['color']['no mail']['outline'])}

        # New, but seen mail messages
        self.new_messages = {}

        # Create system tray menu
        if pystray.Icon.HAS_MENU:
            menu = []
            if CONFIG['mail']:
                if pystray.Icon.HAS_DEFAULT_ACTION:
                    menu.append(pystray.MenuItem(
                        'Show Thunderbird', self.on_mail,
                        default=True, visible=False))
                else:
                    menu.append(pystray.MenuItem(
                        'Show Thunderbird', self.on_mail,
                        default=True))
            if CONFIG['mail_reset']:
                menu.append(pystray.MenuItem(
                    'Show Thunderbird/Reset counter', self.on_mailreset))
            if CONFIG['reset_menu']:
                menu.append(pystray.MenuItem(
                    'Reset message counter', self.on_reset))
            if CONFIG['quit_menu']:
                menu.append(pystray.MenuItem(
                    'Quit', self.on_quit))
            menu = pystray.Menu(*menu)
        else:
            menu = None

        # Create system tray icon
        self.icon = pystray.Icon(
            'test name',
            icon=self.icons['indifferent'],
            title='ScriptableNotification started',
            menu=menu)

        # Attach signals
        signal.signal(signal.SIGTERM, self.on_sigterm)

    #
    # Main loop
    #

    def run(self):
        """"Run the icon."""
        # Tell client that we are ready
        logging.debug('()')
        logging.info(': Run StatusIcon')

        self.icon.run(setup=self.input_loop)

    def input_loop(self, icon):
        logging.debug('()')
        logging.info(': Run input_loop')

        icon.visible = True

        message = Message()
        while True:
            try:
                # Get message sent to us
                msg = message.get()
                if not msg:
                    time.sleep(1)
                    continue

                # Parse the message
                payload = json.loads(msg)

                # (Pretty) print to logfile
                logging.debug(f': ====== {time.asctime()} ======')

                self.update(payload)

                # Send back required message
                message.send({})

            except Exception as e:
                # If anything goes wrong, write the traceback to the logfile
                logging.exception(e)
                # ... and to the standard output
                print(
                    f"'{__file__}' raised the Exception: {e}",
                    file=sys.stdout, flush=True)

    def quit(self):
        """Quit running."""
        logging.debug('()')
        logging.info(': Quit StatusIcon')

        self.icon.remove_notification()
        self.icon.stop()

    #
    # Menu call backs
    #

    def on_mail(self, item):
        """Call-back for the 'Start mail' menu item.

        Start the mail program.
        """
        logging.debug('(%s)', item)

        self.thunderbird(CONFIG['mail'])

    def on_mailreset(self, item):
        """Call-back for the default menu and icon action.

        Start the mail program (if configured) and reset the new mail counter
        (if configured).
        """
        logging.debug('(%s)', item)

        self.thunderbird(CONFIG['mail_reset'])
        self.reset()

    def on_reset(self, item):
        """Call-back for the 'Reset message counter' menu item.

        Reset the counter for new mails and update the icon.
        """
        logging.debug('(%s)', item)

        self.reset()

    def on_quit(self, item):
        """Call-back for the 'Quit' menu item."""
        logging.debug('(%s)', item)

        self.quit()

    #
    # Signals
    #

    def on_sigterm(self, signum, frame):
        """Call-back for the SIGTERM signal.

        Quit running.
        """
        logging.debug('(%s, %s)', signum, frame)

        self.quit()

    #
    # Methods
    #

    def thunderbird(self, thunderbird):
        """Start Thunderbird."""
        import subprocess
        logging.debug('(%s)', item)
        logging.info(': Start Thunderbird')

        subprocess.Popen(thunderbird.split())

    def reset(self):
        """Reset the counter."""
        logging.debug('()')
        logging.info(': Reset counter')

        dummy_msg = {'event': 'start'}

        for folder in self.new_messages:
            self.new_messages[folder] = set()
        self.icon.title = 'No unseen messages'
        self._update_icon(dummy_msg)
        self._update_visibility(dummy_msg)
        self._update_notification(dummy_msg)

    def update(self, msg):
        """Update the icon in the system tray."""
        logging.debug('(…)')
        logging.info(': Update (event = %s)', msg['event'])

        if msg['event'] == 'quit':
            self.quit()

        self._update_newmessages(msg)
        self._update_title(msg)
        self._update_icon(msg)
        self._update_visibility(msg)
        self._update_notification(msg)

    def _update_newmessages(self, msg):
        """Update the `new_messages` attribute."""
        logging.debug('(…): folders = %s', msg.get('folders', None))

        if 'folders' in msg:
            msg_folders = {
                f'{folder["accountId"]}{folder["path"]}'
                for folder in msg['folders']}
            new_folders = set(self.new_messages)
            for folder_id in msg_folders.difference(new_folders):
                # Folders in `msg['folders']`, but not in `self.new_messages`,
                # - add them
                self.new_messages[folder_id] = set()
            for folder_id in new_folders.difference(msg_folders):
                # Folders in `self.new_messages`, but not in `msg['folders']`
                # - remove them
                del self.new_messages[folder_id]


        if msg['event'] == 'start':
            pass
        else:
            folder_id = f'{msg["message"]["folder"]["accountId"]}{msg["message"]["folder"]["path"]}'

            if msg['event'] == 'new':
                self.new_messages[folder_id].add(msg['message']['messageId'])
            elif msg['event'] == 'read':
                # One message read => remove all unread messages
                # We could also only remove this message:
                #     self.new_messages[folder_id].remove(msg['message']['messageId'])
                self.new_messages[folder_id] = set()

        logging.debug(': new_messages = %s', self.new_messages)

    def _update_notification(self, msg):
        """Update notifications."""
        logging.debug(
            '(…): event = %s, title = %s',
            msg.get('event', None), self.icon.title)

        if CONFIG['notify']:
            if msg['event'] == 'start':
                self.icon.remove_notification()
            elif msg['event'] == 'new':
                self.icon.notify(
                    f'New messages available:\n{self.icon.title}',
                    'Thunderbird')
            elif msg['event'] == 'read':
                self.icon.remove_notification()

    def _update_visibility(self, msg):
        """Update the visibility of the system tray icon."""
        logging.debug('(…): event = %s', msg.get('event', None))

        if msg['event'] == 'start':
            if CONFIG['show_read_icon']:
                self.icon.visible = True
            else:
                self.icon.visible = False
        elif msg['event'] == 'new':
            self.icon.visible = True
        elif msg['event'] == 'read' and not any(self.new_messages.values()):
            if CONFIG['show_read_icon']:
                self.icon.visible = True
            else:
                self.icon.visible = False
        logging.debug(': visible = %s', self.icon.visible)

    def _update_icon(self, msg):
        """Update the image used for the system tray icon."""
        logging.debug('(…): event = %s', msg.get('event', None))

        if msg['event'] == 'start':
            self.icon.icon = self.icons['no mail']
            logging.debug(': icon = no mail')

        else:
            folder_id = f'{msg["message"]["folder"]["accountId"]}{msg["message"]["folder"]["path"]}'

            if msg['event'] == 'new':
                # Add badge to the icon
                # badge = ['❚' if v else '–' for v in self.new_messages.values()]
                # logging.debug(': badge = %s', badge)
                # self.icon.icon = self.add_badge(self.icons['new mail'], badge)

                self.icon.icon = self.icons['new mail']
                logging.debug(': icon = new mail')

            elif msg['event'] == 'read':
                if any(self.new_messages.values()):
                    self.icon.icon = self.icons['some mail']
                    self.icon.visible = True
                    logging.debug(': icon = some mail')
                else:
                    # Switch to 'unseen' icon, if there are no new messages in
                    # any folder
                    self.icon.icon = self.icons['no mail']
                    logging.debug(': icon = no mail')

    def _update_title(self, msg):
        """Update the title of the system tray icon."""
        logging.debug('(…): folders = %s', msg.get('folders', None))

        title = []
        for folder in msg['folders']:
            logging.debug(': account = %s', folder['accountId'])
            try:
                new_messages = len(self.new_messages[f'{folder["accountId"]}{folder["path"]}'])
            except KeyError:
                new_messages = 0
            logging.debug(': new messages = %s', new_messages)
            if new_messages:
                account = msg['accounts'][folder['accountId']]
                account_name = account['name']
                folder_path = folder['path']
                title.append(f'{new_messages:4d} {account_name}{folder_path}')
            logging.debug(': title = %s', title)
        if title:
            self.icon.title = '\n'.join(title)
        else:
            self.icon.title = 'No unseen messages'
        logging.debug(': title (displayed) = %s', self.icon.title)


#
# Helper class
#

class Message:
    """Get and send messages from/to the standard input and output."""

    def decode(self, s):
        """Decode the json string received over standard input.

        Parameters
        ----------
        msg : str
            The message to decode.

        Returns
        -------
        dict
            The decoded json string.

        """
        logging.debug('(%s)', s)
        return json.loads(s)

    def encode(self, msg):
        """Encode the message to send over standard output.

        If we ever have to deal with more than an empty string to send back,
        we have to convert the object to a JSON string first:
            >>> import json  # <- Put this into the header
            >>> encoded_content = json.dumps(msg).encode('utf-8')

        Parameters
        ----------
        msg : str
            The message to be sent.

        Returns
        -------
        str, int
            The encoded message and the length.
        """
        logging.debug('(%s)', msg)
        encoded_content = f'"{msg}"'.encode('utf-8')
        encoded_length = struct.pack('@I', len(encoded_content))

        logging.debug(
            ': Encoded message: (%s, %s)',
            encoded_content, encoded_length)
        return encoded_content, encoded_length

    def get(self):
        """Get and parse message from the standard input.

        Returns
        -------
        bool
            If standard input is `"true"`, return `True`, otherwise `False`.

        """
        logging.debug('()')

        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            return None
        message_length = struct.unpack('@I', raw_length)[0]
        message = sys.stdin.buffer.read(message_length).decode('utf-8')
        return message

    def send(self, msg):
        """Prepare and send a message to the standard output.

        Parameters
        ----------
        msg : str
            The string to be sent.

        """
        logging.debug('(%s)', msg)

        encoded_content, encoded_length = self.encode(msg)
        sys.stdout.buffer.write(encoded_length)
        sys.stdout.buffer.write(encoded_content)
        sys.stdout.buffer.flush()


#
# Main function
#

def main():
    if logging:
        logging.info(' ====== %s ======', time.asctime())
        logging.debug('(): argv = %s (%s)', sys.argv, len(sys.argv))

    if len(sys.argv) != 3:
        # Parameters
        # ==========
        # sys.argv[0] : path string
        #     The string with the path to this script.
        # sys.argv[1] : path string
        #     The complete path to the app manifest, e.g.
        #     `.mozilla/native-messaging-hosts/scriptableNotifications.json`.
        # sys.argv[2] : string
        #     The ID (as given in the browser_specific_settings manifest.json
        #     key) of the add-on that started it.

        # Log error
        logging.error('Requires two command line parameters')
        # Send error to standard output
        print(
            f"'{__file__}' requires two command line parameters",
            file=sys.stdout, flush=True)
        exit(1)

    icon = StatusIcon()
    icon.run()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        logging.exception("Cannot start '%s'", __file__)
        print(f"Cannot start '{__file__}'", file=sys.stdout, flush=True)
