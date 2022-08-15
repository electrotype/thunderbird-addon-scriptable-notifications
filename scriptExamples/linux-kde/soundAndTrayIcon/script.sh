#!/bin/sh

# Example script to be called by the "Scriptable Notifications" Thunderbird add-on.
# For Linux KDE (maybe other Desktop environments too, I don't know).
# Make sure it is executable.
#
# When there are unread messages:
#  - It will play a sound (make sure the "aplay" command works on your machine)
#  - It will call a Python script "showThunderbirdTrayIcon.py" to display a
#    Thunderbird icon in the system tray (make sure "libappindicator-gtk3" is installed).
# 
# When are not no unread messages anymore:
#  It will remove the Thunderbird icon from the system tray.

dir="$(dirname "$0")"
pythonScriptPath="$dir/showThunderbirdTrayIcon.py"

trayrIconExists=`ps aux | grep "python $pythonScriptPath" | grep -v grep`
if [ "$1" == "true" ];then
   if [ -z "$trayrIconExists" ]; then
      nohup python $pythonScriptPath >/dev/null 2>&1 &
      aplay  $dir/tada.wav
   fi
elif [ -n "$trayrIconExists" ]; then
      # notify-send "KILL"
      ps -ef | grep "python $pythonScriptPath" | grep -v grep | awk '{print $2}' | xargs kill
fi

exit

