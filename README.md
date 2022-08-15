## Scriptable Notifications - Thunderbird add-on

### Introduction

This Thunderbird add-on allows you to define an external script (bash, batch, python, etc.)
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
a interesting solution if you don't want to have to write an external script.

### Configurations

On the "options" page of the add-on, you will find two sections:

- **`Path to the external script`**
  This is where you specify the path to your script. The path must be absolute.
  On Linux/Mac, make sure the script file is executable (`chmod +x /path/to/script.sh`)

- **`Inbox folders to check for unread messages`**
  The _inbox_ folders of all accounts registered in Thunderbird are listed here.
  You select the ones for which you want the read/unread messages to be checked.

  For example, if you receive a new mail in the inbox of the account "`something@example.com`",
  but this inbox is not selected in the options, your script will not be called. The same thing happens
  when you read or delete a message in an inbox: this action will only call your script
  if the inbox they are in has been selected in the options.

  As you can see on one of the screenshots, I personally store messages from all my accounts in
  the global "Local folders". I just have to select this inbox in the options since all new
  mails will end up there.

### Writing the external script

- You can see examples of external scripts in the `scriptExamples` folder.

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
  you can for example check if a process is running to see if you need to perform
  an action or not.

### When is the external script called?

1. When Thunderbird starts.
2. When a new message arrives in a selected inbox.
3. When a message is read in a selected inbox.
4. When a message is deleted (and is still unread) in a selected inbox.
