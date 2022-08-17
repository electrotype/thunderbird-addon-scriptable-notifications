## Scriptable Notifications - Thunderbird add-on

### Introduction

This Thunderbird add-on allows you to define an external script (bash, batch, etc.)
which will be called:

- When there are unread messages in the inboxes you specified, for example when
  a new mail arrives.
- When there are no more unread messages in the inboxes you specified, for example
  when you read or delete the last unread message.

This is a simple add-on, with few configurations. It simply calls the specified
external script with `true` as a parameter if there are unread messages or with
`false` if there are none. It is up to you to write a script to notify
you of new mails the way you want.

Sample scripts are provided in the `scriptExamples` folder.

[screenshot #1](https://raw.githubusercontent.com/electrotype/thunderbird-addon-scriptable-notifications/main/assets/screenshots/optionsPage.png) | [screenshot #2](https://raw.githubusercontent.com/electrotype/thunderbird-addon-scriptable-notifications/main/assets/screenshots/trayIconExample.png)

### Why this add-on?

Thunderbird's default notifications don't do what I want on Linux.
I wanted an icon in the system tray to be displayed when there are new messages to read,
and for that icon to disappear when all messages are read.

The closest existing solution I found is [FiltaQuilla](https://addons.thunderbird.net/en-us/thunderbird/addon/filtaquilla/)
which is MUCH more complete than "Scriptable Notifications" but was not perfect for my
needs... Using its `Run Program` feature I was able to display an icon in the system tray by triggering
the action from a "Getting New Mail" filter. But there is no "No more unread mail" filter to hook into to _remove_ the
icon once all mails have been read! This is why I created this little add-on.

See also [Mailbox Alert](https://addons.thunderbird.net/en-US/thunderbird/addon/mailbox-alert) for
a interesting solution and you don't have to write an external script.

### Installation

#### From the Thunderbird add-ons site

https://addons.thunderbird.net/en-US/thunderbird/addon/scriptable-notifications

#### From source

If you install this add-on from the source:

1. Zip the whole project in a single file (the `manifest.json` must be at the _root_ of the zip file,
   not in a subdirectory!).
2. Open the `Add-ons Manager` tab in Thunderbird (`Tools / Add-ons and Themes / Extensions`).
3. Drag and drop the .zip file. Confirm the installation.
4. C0nfigure the options.

### Options

On the "options" page of the add-on:

- **`Native script`**
  This is where you:

  1. Specify the path to the native script that is going to be called by the add-on.
     Make sure you use an absolute path.

  2. Register your script. Registering the script is required because WebExtentions (the
     new way of writing add-ons for Thunderbird, Firefox, Chrome, etc.) are picky
     on how an add-on can run a native executable. The protocole used is called
     [Native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging).

     The instructions on how to register your script are provided for Linux/Mac and Windows.

- **`Test your script`**
  In order to help you write your script, this section provides two buttons. One simulates
  the call the add-on will make to your script when there are unread messages, and the other
  button to simulate when there are no unread messages anymore.

  If your script is registered properly (see previous section) but doesn't seem to work, you
  can look at the console for potential errors:
  `Tools / Developer Tools / Error console`.

- **`Inbox folders to check for unread messages`**
  The _inbox_ folders of all accounts registered in Thunderbird are listed here.
  You select the ones for which you want the read/unread messages to be checked.

  For example, if you receive a new mail in the inbox of the account "`something@example.com`",
  but this inbox is not selected in the options, your script will not be called. The same thing happens
  when you read or delete a message in an inbox: this action will only call your script
  if the inbox the message is in has been selected in the options.

  As you can see on one of the screenshots, I personally store messages from all my accounts in
  the global "Local folders". I just have to select this inbox in the options since all new
  mails will end up there.

### Sample scripts provided

#### Windows - Simple script

Provided at: `scriptExamples/windows/simpleMsg/script.bat`.

Very basic script, only display small alert messages.

Python 2 or 3 must be installed on the Windows machine.

The `scriptExamples/windows/simpleMsg/simpleNotification.py` file must
be kept in the same directory as the `script.bat`.

#### Linux - Simple script

Provided at: `scriptExamples/linux/simpleMsg/script.sh`.

Very basic script, only display small alert messages.

No external dependencies.

#### Linux KDE - More complete script

The script is provided at: `scriptExamples/linux-kde/soundAndTrayIcon/script.sh`.

This script will play a sound when a new mail arrives and will add
a Thunderbird icon in the system tray (see "screenshot #2"). When
all messages are read, the script will remove the icon from the system tray.

Python is required.

The commande `aplay` must be available on the system for the sound to be played.

The library `libappindicator-gtk3` must be installed for Python to be
able to add an icon in the system tray.

The `scriptExamples/linux-kde/soundAndTrayIcon/showThunderbirdTrayIcon.py` and
`scriptExamples/linux-kde/soundAndTrayIcon/tada.wav` files must be kept in the
same directory as the`script.sh`.

### Writing an external script

- It is a good idea to start your own script from one provided in the
  `scriptExamples` folder because the `Native messaging` protocole expects your
  script to read and write some data in a specific way.

- There are some extra tips on how to write a native script on this
  [Native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
  information page.

- On Linux/Mac, don't forget to make your script executable (`chmod +x /path/to/script.sh`)

- Your script must manage only one parameter: "`hasUnreadMessages`". This parameter
  will be "`true`" or "`false`" depending on whether the add-on sees unread messages or not in
  the inboxes you have selected in the options.

- Your script must be able to receive the _same_ value for the "`hasUnreadMessages`"
  parameter more than once in a row. For example, if there are 3 unread messages:

  1. You read the first unread message. There are still two unread messages. Your
     script is called with "`true`": `/path/to/script.sh true`.
  2. You read the second unread message. There are still one unread message. Your
     script is _again_ called with "`true`": `/path/to/script.sh true`.
  3. You read the last unread message. There are no more unread messages! Your
     script is now called with "`false`": `/path/to/script.sh false`.

  In other words, it is up to you to decide whether you need to maintain a "state"
  on what your script is doing. As you can see in the example script "linux-kde",
  you can for example check if a process is running to determine if you need to perform
  an action or not.

### When is the external script called?

1. When Thunderbird starts.
2. When a new message arrives in a selected inbox.
3. When a message is read in a selected inbox.
4. When a message is deleted (and is still unread) in a selected inbox.
