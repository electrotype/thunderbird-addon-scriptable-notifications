#!/bin/sh
#
# Native script for the "Scriptable Notifications"
# Thunderbird add-on, written in bash/python and
# for Linux/KDE (may also work with other Desktop 
# environments too, I didn't test).
#
# Make sure it is executable.
#
# When there are unread messages, this script will:
#  - Play a sound (make sure the "aplay" command 
#    works on your machine)
#  - Call a Python script "showThunderbirdTrayIcon.py" 
#    to display a Thunderbird icon in the system tray 
#    (make sure "libappindicator-gtk3" is installed).
# 
# When there are no unread messages anymore, this script will:
#  - Remove the Thunderbird icon from the system tray.


#==========================================
# Main function.
# "$1" is `true` if there are unread 
# messages or `false` otherwise.
#==========================================
function main() {
   dir="$(dirname "$0")"
   pythonScriptPath="$dir/showThunderbirdTrayIcon.py"

   trayrIconExists=`ps aux | grep "python $pythonScriptPath" | grep -v grep`
   if $1; then
      if [ -z "$trayrIconExists" ]; then
         nohup python $pythonScriptPath >/dev/null 2>&1 &
         aplay  $dir/tada.wav >/dev/null 2>&1 &
      fi
   elif [ -n "$trayrIconExists" ]; then
      ps -ef | grep "python $pythonScriptPath" | grep -v grep | awk '{print $2}' | xargs kill
   fi
}

#==========================================
# Below code will parse the parameter sent be
# the add-on, will call your "main()" function 
# with "$1" being `true` if there are unread 
# messages or `false` otherwise, and
# will properly close the connection with
# the add-on.
#
# Based on: https://stackoverflow.com/a/24777120/843699
#==========================================
# Ignore prefix bytes!
IFS= read -rn 1 prefix

param=""
while IFS= read -rn1 c; do
    # "true" and "false" both end with a "e"
    if [ "$c" != 'e' ] ; then
        param="$param$c"
        continue
    fi
    param="${param}e"

    [[ "$param" == "true" ]] && hasUnreadMessage=true || hasUnreadMessage=false
    main $hasUnreadMessage

    # Dummy (but valid) response.
    # The add-on doesn't required any information
    # back from the script.
    printf "\x2\x0\x0\x0%s" "{}"
done
