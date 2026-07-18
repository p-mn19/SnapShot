// popup.js runs whenever the popup opens.
// It has access to chrome.* APIs because manifest.json granted the permissions.

document.addEventListener("DOMContentLoaded", async () => {
  await renderLastBackupTime();

  document.getElementById("exportBtn").addEventListener("click", () => {
    openPage("export.html");
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    openPage("import.html");
  });
});

/**
 * Opens one of our full extension pages (export.html / import.html) in a new tab.
 * We use a full tab instead of a bigger popup because:
 * 1. Popups close automatically if they lose focus (e.g. user clicks another window).
 * 2. Export/Import need more room for the workspace summary preview.
 */
function openPage(pageName) {
  chrome.tabs.create({
    url: chrome.runtime.getURL(`pages/${pageName}`)
  });
}

/**
 * Reads the last backup timestamp from chrome.storage.local and displays it.
 * chrome.storage.local is a small key-value store built into the browser,
 * scoped privately to this extension. Nothing here ever leaves the device.
 */
async function renderLastBackupTime() {
  const data = await chrome.storage.local.get("lastBackupTimestamp");
  const el = document.getElementById("lastBackupValue");

  if (!data.lastBackupTimestamp) {
    el.textContent = "Never";
    return;
  }

  const date = new Date(data.lastBackupTimestamp);
  el.textContent = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}