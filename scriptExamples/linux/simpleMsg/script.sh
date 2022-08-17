#!/bin/bash
#
# Very basic native script for the 
# "Scriptable Notifications" Thunderbird 
# add-on, written in bash.
#
# Make sure it is executable.
#
# Have a look at the "linux-kde" for a more
# interesting one.


#==========================================
# Write your script in this main function.
# "$1" is `true` if there are unread 
# messages or `false` otherwise.
#==========================================
function main() {
    if $1; then
        notify-send "✯ New mails to read! ✯"
    else
        notify-send "All mails read." 
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