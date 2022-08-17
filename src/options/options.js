const isWindows = navigator.appVersion.indexOf("Win") > -1;
const isMac = navigator.appVersion.indexOf("Mac") > -1;

//==========================================
// Build HTML form
//==========================================
const buildForm = async () => {
  const accounts = await browser.accounts.list(true);
  const accountsList = document.querySelector("#accounts");
  for (const account of accounts) {
    let inboxFolder;
    for (const folder of account.folders) {
      if (folder.type === "inbox") {
        inboxFolder = folder;
        break;
      }
    }
    if (!inboxFolder) {
      continue;
    }

    const folderLi = document.createElement("li");
    accountsList.appendChild(folderLi);

    const folderCheckbox = document.createElement("input");
    folderLi.appendChild(folderCheckbox);
    const checkboxId = inboxFolder.accountId;
    folderCheckbox.setAttribute("type", "checkbox");
    folderCheckbox.setAttribute("id", checkboxId);
    folderCheckbox.setAttribute("class", "folderCheckbox");
    folderCheckbox.setAttribute("data-folderObj", JSON.stringify(inboxFolder));

    const folderLabel = document.createElement("label");
    folderLi.appendChild(folderLabel);
    folderLabel.setAttribute("for", checkboxId);

    const folderTitleSpan = document.createElement("span");
    folderLabel.appendChild(folderTitleSpan);
    const folderTitleText = document.createTextNode(account.name);
    folderTitleSpan.appendChild(folderTitleText);

    const folderTitle2Span = document.createElement("span");
    folderLabel.appendChild(folderTitle2Span);
    const folderTitle2Text = document.createTextNode(" - Inbox");
    folderTitle2Span.appendChild(folderTitle2Text);
  }

  if (isWindows) {
    document.querySelector("#scriptPath").placeholder =
      "C:\\absolute\\path\\to\\the\\script";
  }
};

const addListeners = async () => {
  document.querySelector("#saveFolders").addEventListener("click", () => {
    saveFolders();
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
    .querySelector("#notifyScriptTrue")
    .addEventListener("click", async () => {
      await sendTestToScript(true);
    });

  document
    .querySelector("#notifyScriptFalse")
    .addEventListener("click", async () => {
      await sendTestToScript(false);
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
};

//==========================================
// Send test to script
//==========================================
const sendTestToScript = async (hasUnreadMessages) => {
  await browser.runtime.sendNativeMessage(
    "scriptableNotifications",
    hasUnreadMessages
  );
};

//==========================================
// Save folders
//==========================================
let savedMsgTimeout;
const saveFolders = async () => {
  const foldersToCheck = [];
  const folderCheckboxesEl = document.getElementsByClassName("folderCheckbox");
  for (const folderCheckboxEl of folderCheckboxesEl) {
    if (folderCheckboxEl.checked) {
      const folderObjData = folderCheckboxEl.getAttribute("data-folderObj");
      const folderObj = JSON.parse(folderObjData);
      foldersToCheck.push(folderObj);
    }
  }

  await messenger.storage.local.set({
    foldersToCheck: foldersToCheck,
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
    document.querySelector("#" + folder.accountId).checked = true;
  }

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
