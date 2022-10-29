#!/usr/bin/python

# This script displays a Thunderbird icon in the system tray on Linux KDE 
# (I don't know for other desktop environments).
# Make sure the "libappindicator-gtk3" is installed.
#
# You can remove the icon by exiting the script itself or
# by using the right-click menu on the tray icon.

import os
import gi
gi.require_version('Gtk', '3.0')
gi.require_version('AppIndicator3', '0.1')
from gi.repository import Gtk as gtk, AppIndicator3 as appindicator

def main():

  indicator = appindicator.Indicator.new("scriptableNotificationsTrayIcon", "thunderbird", appindicator.IndicatorCategory.APPLICATION_STATUS)
  indicator.set_status(appindicator.IndicatorStatus.ACTIVE)

  menu = gtk.Menu()
  exittray = gtk.MenuItem(label='Exit')
  exittray.connect('activate', quit)
  menu.append(exittray)
  menu.show_all()
  indicator.set_menu(menu)

  # indicator.set_secondary_activate_target(exittray)

  gtk.main()

def quit(_):
  gtk.main_quit()

if __name__ == "__main__":
  main()
