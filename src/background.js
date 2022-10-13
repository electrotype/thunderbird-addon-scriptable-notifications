window.scrNoti = window.scrNoti || {};

//==========================================
// On new email...
//==========================================
window.scrNoti.newEmailListener = async (folder, messages) => {
//  let hasNotJunk = false;

  if (!(await window.scrNoti.isFolderToCheck(folder))) {
    return;
  }

// FIXME
//  if (messages && messages.messages && messages.messages.length > 0) {
//    for (const message of messages.messages) {
//      if (message && !message.junk) {
//        await window.scrNoti.notifyNativeScript(message, "new");
//// TODO: Why can't it just "return;"?
////        hasNotJunk = true;
////        break;
//      }
//    }
//  }

//  if (!hasNotJunk) {
//    return;
//  }
//
//  await window.scrNoti.notifyNativeScript(true);
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

  await window.scrNoti.notifyNativeScript(message, "read");
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
      await window.scrNoti.notifyNativeScript(message, "deleted");
    }
  }
};
browser.messages.onDeleted.removeListener(
  window.scrNoti.messageDeletedListener
);
browser.messages.onDeleted.addListener(window.scrNoti.messageDeletedListener);

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
window.scrNoti.notifyNativeScript = async (message, event) => {
  let payload = null;
  const { scriptType } = await messenger.storage.local.get({
    scriptType: "simple",
  });

  switch (scriptType) {
    case "simple":
      switch (event) {
        case "new":
          payload = true;
          break;
        case "read":
        case "deleted":
          payload = await window.scrNoti.hasUnreadMessages();
          break;
        case "start":
          //==========================================
          // For some reason, the folders may not be ready when
          // Thunderbird starts (ex: "Error: Folder not found: /Inbox").
          // So we retry for a couple of times before giving up.
          //==========================================
          payload = await window.scrNoti.tryNbrTimes(window.scrNoti.hasUnreadMessages, 10);
          break;
      };
      break;
    case "extended":
      // List of all accounts
      const accounts = await messenger.accounts.list(false);
      const accountsList = [];
      for (const account of accounts) {

        const identitiesList = [];
        for (const identity of account.identities) {
          const mailIdentity = {
            email: identity.email,
            label: identity.label,
            name: identity.name,
            organization: identity.organization,
          };
          identitiesList.push(mailIdentity);
        };

        const mailAccount = {
          id: account.id,
          identities: identitiesList,
          name: account.name,
          type: account.type,
        };
        accountsList.push(mailAccount);
      };

      // List of all folders, which should be included
      const foldersToInclude =
        await window.scrNoti.getFoldersToCheckForUnread();
      const foldersList = [];
      for (const folder of foldersToInclude) {
        const folderInfo = await messenger.folders.getFolderInfo(folder);
        const folderData = {
          accountId: folder.accountId,
          favorite: folderInfo.favorite,
          name: folder.name,
          path: folder.path,
          totalMessageCount: folderInfo.totalMessageCount,
          type: folder.type,
          unreadMessageCount: folderInfo.unreadMessageCount,
        };
        foldersList.push(folderData);
      };

      // Message data
      if (event == "start") {
        messageDetails = null;
      } else {
        const folder = message.folder;
        messageDetails = {
          author: message.author,
          bccList: message.bbcList,
          ccList: message.ccList,
          date: message.date,
          flagged: message.flagged,
          messageId: message.headerMessageId,
          headersOnly: message.headersOnly,
          junk: message.junk,
          junkScore: message.junkScore,
          read: message.read,
          size: message.size,
          subject: message.subject,
          tags: message.tags,
          folder: {
            accountId: folder.accountId,
            name: folder.name,
            path: folder.path,
            type: folder.type,
          },
        };
      };

      // Assemble entire payload
      payload = {
        accounts: accountsList,
        folders: foldersList,
        event: event,
        message: messageDetails,
      };
      break;
  };

  await browser.runtime.sendNativeMessage(
    "scriptableNotifications",
    payload
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
// BUG: Sometimes I get "TypeError: fnct is not a function"
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

  window.scrNoti.notifyNativeScript(null, "start");
};
document.addEventListener("DOMContentLoaded", window.scrNoti.main);
