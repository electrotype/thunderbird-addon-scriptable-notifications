@ECHO OFF

REM Very, very basic example script for Windows to be called by the 
REM "Scriptable Notifications" Thunderbird add-on.
REM For a more interesting example, have a look at the "linux-kde" one.

IF "%~1"=="true" GOTO unreadMessages

MSG "%username%" Scriptable Notifications - No unread mails
GOTO End

:unreadMessages
MSG "%username%" Scriptable Notifications - There are unread mails!

:End
