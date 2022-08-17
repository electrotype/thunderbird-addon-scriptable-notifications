window.scrNoti = window.scrNoti || {};

//==========================================
// On new email...
//==========================================
window.scrNoti.newEmailListener = async (folder, messages) => {
  let hasNotJunk = false;

  if (!(await window.scrNoti.isFolderToCheck(folder))) {
    return;
  }

  if (messages && messages.messages && messages.messages.length > 0) {
    for (const message of messages.messages) {
      if (message && !message.junk) {
        hasNotJunk = true;
        break;
      }
    }
  }

  if (!hasNotJunk) {
    return;
  }

  await window.scrNoti.notifyNativeScript(true);
};
browser.messages.onNewMailReceived.removeListener(
  window.scrNoti.newEmailListener
);
browser.messages.onNewMailReceived.addListener(window.scrNoti.newEmailListener);

//==========================================
// On message read...
//==========================================
window.scrNoti.messageOnUpdatedListener = async (
  message,
  changedProperties
) => {
  if (!changedProperties.read || message.junk) {
    return;
  }

  if (!(await window.scrNoti.isFolderToCheck(message.folder))) {
    return;
  }

  await window.scrNoti.runUnreadValidation();
};
browser.messages.onUpdated.removeListener(
  window.scrNoti.messageOnUpdatedListener
);
browser.messages.onUpdated.addListener(window.scrNoti.messageOnUpdatedListener);

//==========================================
// On message deleted...
//==========================================
window.scrNoti.messageDeletedListener = async (messagesObj) => {
  for (const message of messagesObj.messages) {
    if (!(await window.scrNoti.isFolderToCheck(message.folder))) {
      continue;
    }

    if (!message.junk && !message.read) {
      await window.scrNoti.runUnreadValidation();
      return;
    }
  }
};
browser.messages.onDeleted.removeListener(
  window.scrNoti.messageDeletedListener
);
browser.messages.onDeleted.addListener(window.scrNoti.messageDeletedListener);

//==========================================
// Check if there are unread messages and call the native
// script with the result.
//==========================================
window.scrNoti.runUnreadValidation = async () => {
  const hasUnreadMessages = await window.scrNoti.hasUnreadMessages();
  await window.scrNoti.notifyNativeScript(hasUnreadMessages);
};

//==========================================
// Any unread messages?
//==========================================
window.scrNoti.hasUnreadMessages = async () => {
  const foldersToCheckForUnread =
    await window.scrNoti.getFoldersToCheckForUnread();

  for (const folder of foldersToCheckForUnread) {
    const result = await browser.messages.query({
      unread: true,
      folder: folder,
    });

    if (result && result.messages && result.messages.length > 0) {
      return true;
    }
  }

  return false;
};

//==========================================
// Notify the native script
//==========================================
window.scrNoti.notifyNativeScript = async (hasUnreadMessages) => {
  await browser.runtime.sendNativeMessage(
    "scriptableNotifications",
    hasUnreadMessages
  );
};

//==========================================
// Get the folders to check for unread messages
//==========================================
window.scrNoti.getFoldersToCheckForUnread = async () => {
  const { foldersToCheck } = await messenger.storage.local.get({
    foldersToCheck: [],
  });

  return foldersToCheck;
};

//==========================================
// Is it a folder to check for unread messages?
//==========================================
window.scrNoti.isFolderToCheck = async (folder) => {
  if (!folder) {
    return false;
  }

  const foldersToCheckForUnread =
    await window.scrNoti.getFoldersToCheckForUnread();

  for (const folderToCheck of foldersToCheckForUnread) {
    if (
      folderToCheck.accountId === folder.accountId &&
      folderToCheck.path === folder.path
    ) {
      return true;
    }
  }

  return false;
};

//==========================================
// Retry calling the specified function for X times
// until there are no error, sleeping one second
// between each call.
//
// Throws the error if there is still one at the end.
//==========================================
window.scrNoti.tryNbrTimes = async (fnct, nbrTime) => {
  async function tryNbrTimesInner(pos) {
    try {
      await fnct();
    } catch (error) {
      if (pos >= nbrTime) {
        throw error;
      }

      setTimeout(async () => {
        await tryNbrTimesInner(pos + 1);
      }, 1000);
    }
  }
  await tryNbrTimesInner(1);
};

//==========================================
// On startup...
//==========================================
window.scrNoti.main = async () => {
  const { optionsPageHasBeenShown } = await messenger.storage.local.get({
    optionsPageHasBeenShown: false,
  });

  if (!optionsPageHasBeenShown) {
    await messenger.storage.local.set({
      optionsPageHasBeenShown: true,
    });
    await browser.runtime.openOptionsPage();
    return;
  }

  const folderToCheck = await window.scrNoti.getFoldersToCheckForUnread();
  if (folderToCheck.length < 1) {
    return;
  }

  //==========================================
  // For some reason, the folders may not be ready when
  // Thunderbird starts (ex: "Error: Folder not found: /Inbox").
  // So we retry for a couple of times before giving up.
  //==========================================
  await window.scrNoti.tryNbrTimes(window.scrNoti.runUnreadValidation, 10);
};
document.addEventListener("DOMContentLoaded", window.scrNoti.main);
