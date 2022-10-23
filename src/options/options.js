const isWindows = navigator.appVersion.indexOf("Win") > -1;
const isMac = navigator.appVersion.indexOf("Mac") > -1;
const foldersKeyToId = new Map();

//==========================================
// Build HTML form
//==========================================
const buildForm = async () => {
  const accounts = await browser.accounts.list(true);
  const accountsListEl = document.querySelector("#accounts");
  for (const account of accounts) {
    for (const folder of account.folders) {
      // All folders of a "Feed" account can be selected
      // except the "trash" one.
      if (account.type === "rss") {
        if (folder.type !== "trash") {
          await addFormFolder(accountsListEl, account, folder);
        }
      } else {
        // Only the "inbox" of the mail account can be selected.
        if (folder.type === "inbox") {
          await addFormFolder(accountsListEl, account, folder);
          break;
        }
      }
    }
  }

  if (isWindows) {
    document.querySelector("#scriptPath").placeholder =
      "C:\\absolute\\path\\to\\the\\script";
  }
};

const addFormFolder = async (accountsListEl, account, folder) => {
  const checkboxId = `x${uuid()}`;
  const checkboxKey = createFolderCheckboxKey(folder);
  foldersKeyToId.set(checkboxKey, checkboxId);

  const folderLi = document.createElement("li");
  accountsListEl.appendChild(folderLi);

  const folderCheckbox = document.createElement("input");
  folderLi.appendChild(folderCheckbox);

  folderCheckbox.setAttribute("type", "checkbox");
  folderCheckbox.setAttribute("id", checkboxId);
  folderCheckbox.setAttribute("class", "folderCheckbox");
  folderCheckbox.setAttribute("data-folderObj", JSON.stringify(folder));
  folderCheckbox.setAttribute("data-checkboxKey", checkboxKey);

  const folderLabel = document.createElement("label");
  folderLi.appendChild(folderLabel);
  folderLabel.setAttribute("for", checkboxId);

  const folderTitleSpan = document.createElement("span");
  folderLabel.appendChild(folderTitleSpan);
  const folderTitleText = document.createTextNode(account.name);
  folderTitleSpan.appendChild(folderTitleText);

  const folderTitle2Span = document.createElement("span");
  folderLabel.appendChild(folderTitle2Span);

  if (account.type === "rss") {
    folderTitle2Span.appendChild(document.createTextNode(` / ${folder.name}`));

    folderTitle2Span.appendChild(document.createTextNode(` - Feed`));
  } else {
    const inboxSpanText = document.createTextNode(` - Inbox`);
    folderTitle2Span.appendChild(inboxSpanText);
  }
};

const createFolderCheckboxKey = (folder) => {
  const checkboxKey = `${folder.accountId}_${folder.path}`;
  return checkboxKey;
};

// From https://stackoverflow.com/a/2117523/843699
const uuid = () => {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
};

const addListeners = async () => {
  document.querySelector("#saveOptions").addEventListener("click", () => {
    saveOptions();
  });

  document.querySelectorAll(".downloadManifest").forEach((btnEl) => {
    btnEl.addEventListener("click", () => {
      downloadManifest();
    });
  });

  document
    .querySelector("#downloadWinBatchFile")
    .addEventListener("click", () => {
      downloadWinBatchFile();
    });

  document
    .querySelector("#notifyScriptSimple")
    .addEventListener("change", () => {
      document.getElementById("notifyScriptTrue").disabled = false;
      document.getElementById("notifyScriptFalse").disabled = false;
      document.getElementById("notifyScriptNew").disabled = true;
      document.getElementById("notifyScriptRead").disabled = true;
      document.getElementById("notifyScriptDeleted").disabled = true;
    });

  document
    .querySelector("#notifyScriptExtended")
    .addEventListener("change", () => {
      document.getElementById("notifyScriptTrue").disabled = true;
      document.getElementById("notifyScriptFalse").disabled = true;
      document.getElementById("notifyScriptNew").disabled = false;
      document.getElementById("notifyScriptRead").disabled = false;
      document.getElementById("notifyScriptDeleted").disabled = false;
    });

  document
    .querySelector("#notifyScriptTrue")
    .addEventListener("click", async () => {
      await sendTestToScript(true);
    });

  document
    .querySelector("#notifyScriptFalse")
    .addEventListener("click", async () => {
      await sendTestToScript(false);
    });

  document
    .querySelector("#notifyScriptNew")
    .addEventListener("click", async () => {
      await sendTestToScript("new");
    });

  document
    .querySelector("#notifyScriptRead")
    .addEventListener("click", async () => {
      await sendTestToScript("read");
    });

  document
    .querySelector("#notifyScriptDeleted")
    .addEventListener("click", async () => {
      await sendTestToScript("deleted");
    });

  document.querySelectorAll(".tab").forEach((tabEl) => {
    tabEl.addEventListener("click", async function () {
      document.querySelectorAll(".tab").forEach((tabEl2) => {
        tabEl2.classList.remove("active");
      });
      this.classList.add("active");

      const contenId = this.getAttribute("data-contentId");
      document.querySelectorAll(".registerTabContent").forEach((contentEl) => {
        contentEl.style.display = "none";
      });
      document.querySelector("#" + contenId).style.display = "block";
    });
  });

  document
    .querySelector("#nativescriptHeader")
    .addEventListener("click", () => {
      var x = document.getElementById("nativescript");
      if (x.style.display === "none") {
        x.style.display = "block";
        document.getElementById("nativescriptRightarrow").style.display = "none";
        document.getElementById("nativescriptDownarrow").style.display = "inline";
      } else {
        x.style.display = "none";
        document.getElementById("nativescriptRightarrow").style.display = "inline";
        document.getElementById("nativescriptDownarrow").style.display = "none";
      };
    });
};

//==========================================
// Send test to script
//==========================================
const sendTestToScript = async (event) => {
  switch (event) {
    case "start":
// TODO: event == "start"
    case "new":
// TODO: event == "new"
      break;
    case "read":
// TODO: event == "read"
      break;
    case "deleted":
// TODO: event == "deleted"
      break
    case "quit":
// TODO: event == "quit"
    default:
      await browser.runtime.sendNativeMessage(
        "scriptableNotifications",
        event
      );
  };
};

//==========================================
// Save options
//==========================================
let savedMsgTimeout;
const saveOptions = async () => {
  const foldersToCheck = [];
  const folderCheckboxesEl = document.getElementsByClassName("folderCheckbox");
  for (const folderCheckboxEl of folderCheckboxesEl) {
    if (folderCheckboxEl.checked) {
      const folderObjData = folderCheckboxEl.getAttribute("data-folderObj");
      const folderObj = JSON.parse(folderObjData);
      foldersToCheck.push(folderObj);
    }
  }

  // "simple" or "extended"
  const scriptType = document.querySelector('input[name="notifyScriptType"]:checked').value;

  await messenger.storage.local.set({
    foldersToCheck: foldersToCheck,
    scriptType: scriptType,
  });

  if (savedMsgTimeout) {
    clearTimeout(savedMsgTimeout);
  }

  const savedMsgEl = document.querySelector("#savedMsg");
  savedMsgEl.style.display = "inline";

  savedMsgTimeout = setTimeout(() => {
    savedMsgEl.style.display = "none";
  }, 2000);
};

//==========================================
// Restore options
//==========================================
const restoreOptions = async () => {
  const { foldersToCheck } = await messenger.storage.local.get({
    foldersToCheck: [],
  });

  for (const folder of foldersToCheck) {
    const checkboxKey = createFolderCheckboxKey(folder);
    const checkboxid = foldersKeyToId.get(checkboxKey);

    const checkboxEl = document.querySelector(`#${checkboxid}`);
    if (checkboxEl) {
      checkboxEl.checked = true;
    }
  }

  const { optionsPageHasBeenShown } = await messenger.storage.local.get({
    optionsPageHasBeenShown: false,
  });

  if (!optionsPageHasBeenShown) {
    document.getElementById("nativescript").style.display = "block";
    document.getElementById("nativescriptRightarrow").style.display = "none";
    document.getElementById("nativescriptDownarrow").style.display = "inline";
    await messenger.storage.local.set({
      optionsPageHasBeenShown: true,
    });
  }

  const { scriptType } = await messenger.storage.local.get({
    scriptType: "simple",
  });

  switch (scriptType) {
    case "simple":
      document.getElementById("notifyScriptSimple").checked = true;
// BUG: Why isnt' that done automatically with the help of event listener "change"?
      document.getElementById("notifyScriptTrue").disabled = false;
      document.getElementById("notifyScriptFalse").disabled = false;
      document.getElementById("notifyScriptNew").disabled = true;
      document.getElementById("notifyScriptRead").disabled = true;
      document.getElementById("notifyScriptDeleted").disabled = true;
      break;
    case "extended":
      document.getElementById("notifyScriptExtended").checked = true;
// BUG: Why isnt' that done automatically with the help of event listener "change"?
      document.getElementById("notifyScriptTrue").disabled = true;
      document.getElementById("notifyScriptFalse").disabled = true;
      document.getElementById("notifyScriptNew").disabled = false;
      document.getElementById("notifyScriptRead").disabled = false;
      document.getElementById("notifyScriptDeleted").disabled = false;
      break;
  };

  if (isWindows) {
    document.querySelector("#tabWindows").click();
  } else if (isMac) {
    document.querySelector("#tabMac").click();
  } else {
    document.querySelector("#tabLinux").click();
  }
};

//==========================================
// Download manifest
//==========================================
const downloadManifest = async () => {
  const scriptPath = document.querySelector("#scriptPath").value;

  if (!scriptPath || scriptPath.trim() === "") {
    alert("Please first enter the path to your script");
    return;
  }

  const text = `{
    "name": "scriptableNotifications",
    "description": "Scriptable Notifications - Native Script",
    "path": "${scriptPath}",
    "type": "stdio",
    "allowed_extensions": [ "{271e72b1-166c-471b-bc06-41e03f176b15}" ]
  }`;
  const a = document.createElement("a");
  const file = new Blob([text], { type: "text/json" });
  a.href = URL.createObjectURL(file);
  a.download = "scriptableNotifications.json";
  a.click();
};

//==========================================
// Download Windows .bat file
//==========================================
const downloadWinBatchFile = async () => {
  const scriptPath = document.querySelector("#scriptPath").value;

  if (!scriptPath || scriptPath.trim() === "") {
    alert("Please first enter the path to your script");
    return;
  }

  const text = getWinBatchFileContent(scriptPath);
  const a = document.createElement("a");
  const file = new Blob([text], { type: "application/bat" });
  a.href = URL.createObjectURL(file);
  a.download = "scriptableNotifications.bat";
  a.click();
};

const getWinBatchFileContent = (scriptPath) => {
  const scriptPathEscaped = scriptPath.replace(/\\/g, "\\\\");

  return `@echo off

set nativeScriptPath=${scriptPathEscaped}

echo ==============================================
echo Creating the manifest
echo ==============================================
set scriptableNotificationsDir=%LocalAppData%\\scriptableNotifications
if not exist "%scriptableNotificationsDir%" mkdir "%scriptableNotificationsDir%"
set manifestPath=%scriptableNotificationsDir%\\manifest.json

echo {> %manifestPath%
echo    "name": "scriptableNotifications",>> %manifestPath%
echo    "description": "Scriptable Notifications - Native Script",>> %manifestPath%
echo    "path": "%nativeScriptPath%",>> %manifestPath%
echo    "type": "stdio",>> %manifestPath%
echo    "allowed_extensions": [ "{271e72b1-166c-471b-bc06-41e03f176b15}" ]>> %manifestPath%
echo }>> %manifestPath%

echo Manifest created successfully at: %manifestPath%
echo.

echo ==============================================
echo Creating the Registry key
echo ==============================================
set registryKeyPath=HKEY_CURRENT_USER\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\scriptableNotifications
REG ADD "%registryKeyPath%" /f /t REG_SZ /d "%manifestPath%"
echo Registry key "%registryKeyPath%" successfully added
echo.

echo ==============================================
echo Result
echo ==============================================
echo All good!
echo Your native script: ${scriptPath}
echo should now be accessible from the Scriptable Notifications Thunderbird add-on.
echo.
echo Note: don't forget to select the inboxes to watch!
pause
`;
};

const loaded = async () => {
  await buildForm();
  await addListeners();
  await restoreOptions();
};

document.addEventListener("DOMContentLoaded", loaded);
