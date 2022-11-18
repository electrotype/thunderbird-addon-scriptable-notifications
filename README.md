## Scriptable Notifications - Thunderbird add-on

### Introduction

This Thunderbird add-on allows you to define an external script (bash, batch, python, etc.)
which will be called so you can manage mail notifications/alerts the way you want.

There are two modes: `simple` that only sends "true" or "false" depending on whether
there are unread messages or not, and `extended` which sends a lot more information about the messages.
More details on these two modes below.

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
another notification solution where you don't have to write an external script.

### Installation

Note that the add-on will not work with a _Snap_ or _Flatpak_ version of Thunderbird. Those
currently don't seem to support Native Messaging at all!
If you know how to fix this, please let me know.

#### From the Thunderbird add-ons site

https://addons.thunderbird.net/en-US/thunderbird/addon/scriptable-notifications

#### From source

If you install this add-on from the source:

1. Zip the whole project in a single file (the `manifest.json` must be at the _root_ of the zip file,
   not in a subdirectory!).
2. Open the `Add-ons Manager` tab in Thunderbird (`Tools / Add-ons and Themes / Extensions`).
3. Drag and drop the .zip file. Confirm the installation.
4. Configure the options.

### Modes

#### The "`simple`" mode

If you choose `simple` mode, your script will be called with a simple "`true`" or "`false`"
depending on whether there are _unread messages_ or not in the inboxes you have selected.

This is the mode to choose if you only want to know if there are messages you haven't read yet. It is
also the only mode that works well with a `bash` script. Indeed, bash is not very good at parsing complex
data received via stdin and the JSON payload from the `extended` mode is probably too complex to be processed
correctly.

#### The "`extended`" mode

Sends much more informations when statuses of messages change:

- The sender, receiver, subject, date received, mailbox and the new status of messages.
- The number of unread messages and other information about each monitored inbox.

This mode allows your script to display notifications with many details.

### Options

On the "options" page of the add-on:

- **`Native script and manifest`**

  This is where you:

  1. Specify the path to the native script that is going to be called by the add-on.
     Make sure you use an absolute path.

  2. Register your script. Registering the script is required because WebExtentions (the
     new way of writing add-ons for Thunderbird, Firefox, Chrome, etc.) are picky
     on how an add-on can run a native executable. The protocole used is called
     [Native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging).

     The instructions on how to register your script are provided for Linux/Mac and Windows.

- **`Type of data sent to the native script`**

  In this section you choose between the `simple` or the `extended` mode.

  In addition, to help you write your script, buttons are provided to simulate
  the calls that the add-on will make.

- **`Type of data connection`**

  You can decide whether the connection to your script/application should be kept open
  or not.

  By using the `Connectionless` option, a new instance of your script/application will be called whenever
  there is an event to send and no connection will be held open.

  By using the `Connection based` option, a permanent connection will be established with your
  script/application and the events will be sent over that connection. This option allows
  to [react](https://github.com/electrotype/thunderbird-addon-scriptable-notifications/blob/main/scriptExamples/extendedMode/python-logging/script-connection-based.py#L53-L57) to Thunderbird closing, for example.

- **`Inbox/Feed folders to monitor`**

  The _inbox_ and favorite folders of all accounts registered in Thunderbird are listed here.
  You select the ones for which you want the messages to be watched.

  For example, if you receive a new mail in the inbox of the account "`something@example.com`",
  but this inbox is not selected in the options, your script will not be called. The same thing happens
  when you read or delete a message in an inbox: this action will only call your script
  if the inbox the message is in has been selected in the options.

  To monitor a mail folder that is not an _inbox_, right-click on the folder
  (in the main Thunderbird interface) and choose `Favorite Folder`. The folder will
  then be available to be selected on the add-on's options page.

  I personally store messages from all my accounts in the global "Local folders".
  I just have to select this inbox in the options since all new mails will end up there.

  Note that _Feeds_ accounts and their Subscriptions (`rss` / `atom`) are also supported.

### Sample scripts

#### Scripts for the "`extended`" mode

**Python - Payload logging - Connectionless**

Provided at: `scriptExamples/extendedMode/python-logging/script-connectionless.py`.

This script is ideal as a base for a custom Python script using the
`connectionless` option.
Since it simply logs the content it receives from the add-on,
it is a good script to test your installation and to know
what the `extended` payload looks like.

Python 3 must be installed on the machine.

**Python - Payload logging - Connection based**

Provided at: `scriptExamples/extendedMode/python-logging/script-connection-based.py`.

This script is ideal as a base for a custom Python script using the
`connection based` option. Permament connections and Thunderbird
closing are handled.

Python 3 must be installed on the machine.

#### Scripts for the "`simple`" mode

**Windows - Simple**

Provided at: `scriptExamples/simpleMode/windows-simple/script.bat`.

Very basic script, only displays small alert messages.

Python must be installed on the Windows machine.

The `scriptExamples/simpleMode/windows-simple/simpleNotification.py` file must
be kept in the same directory as the `script.bat`.

**Linux - Simple**

Provided at: `scriptExamples/simpleMode/linux-simple/script.sh`.

Very basic script, only displays small alert messages.

No external dependencies.

**Linux KDE - Sound and Tray icon**

The script is provided at: `scriptExamples/simpleMode/linux-kde-sound-tray/script.sh`.

This script will play a sound when a new mail is received and will add
a Thunderbird icon in the system tray (see "screenshot #2"). When
all messages are read, the script will remove the icon from the system tray.

Python is required.

The command `aplay` must be available on the system for the sound to be played.

The library `libappindicator-gtk3` must be installed for Python to be
able to add the icon to the system tray.

The `scriptExamples/simpleMode/linux-kde-sound-tray/showThunderbirdTrayIcon.py` and
`scriptExamples/simpleMode/linux-kde-sound-tray/tada.wav` files must be kept in the
same directory as the`script.sh` script.

### Writing an external script

- It is a good idea to start your script from one provided in the
  `scriptExamples` folder because the `Native messaging` protocole expects your
  script to read and write some data in a specific way.

- There are some extra tips on how to write a native script on this
  [Native messaging](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
  information page.

- On Linux/Mac, don't forget to make your script executable (`chmod +x /path/to/script.sh`)

- If your script is registered properly but doesn't seem to work, you
  can look at the console for potential errors:
  `Tools / Developer Tools / Error console`.

#### Extra info on writing an "extended" mode script

- The extended payload sent by the add-on is a JSON object. In order to know the structure
  of this object, register the `python-logging` script and look at the
  generated log (written in your home folder). You can also look at this
  [example](https://github.com/electrotype/thunderbird-addon-scriptable-notifications/blob/main/src/options/options.js#L195).

- Note that the payload is passed to the script using _stdin_.

#### Extra info on writing a "simple" mode script

- Your script must manage only one parameter: "`hasUnreadMessages`". This parameter
  will be "`true`" or "`false`" depending on whether the add-on sees unread messages or not in
  the inboxes you have selected in the options. Note that this parameter is _not_ passed
  as a command line argument, but using _stdin_.

- Your script must be able to receive the _same_ value for the "`hasUnreadMessages`"
  parameter more than once in a row. For example, if there are 3 unread messages
  in your selected inboxes:

  1. You read the first unread message. There are still two unread messages. Your
     script is called with "`true`"
  2. You read the second unread message. There are still one unread message. Your
     script is _again_ called with "`true`".
  3. You read the last unread message. There are no more unread messages! Your
     script is now called with "`false`".

  In other words, it is up to you to decide whether you need to maintain a "state"
  on what your script is doing. As you can see in the example script "linux-kde-sound-tray",
  you can for example check if a process is running to determine if you need to perform
  an action or not.

### When is the external script called?

1. When Thunderbird starts.
2. When a new message arrives in a selected inbox.
3. When a message is read (or deleted) in a watched inbox.
