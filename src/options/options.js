//==========================================
// Build HTML form
//==========================================
const buildForm = async () => {
  document.querySelector("form").addEventListener("submit", saveOptions);
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
};

//==========================================
// Save options
//==========================================
let savedMsgTimeout;
const saveOptions = async (e) => {
  e.preventDefault();

  const executablePath = document.querySelector("#executablePath").value;

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
    executablePath: executablePath,
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
  const { executablePath, foldersToCheck } = await messenger.storage.local.get({
    executablePath: "",
    foldersToCheck: [],
  });

  document.querySelector("#executablePath").value = executablePath;

  for (const folder of foldersToCheck) {
    document.querySelector("#" + folder.accountId).checked = true;
  }
};

const loaded = async () => {
  await buildForm();
  await restoreOptions();
};

document.addEventListener("DOMContentLoaded", loaded);
