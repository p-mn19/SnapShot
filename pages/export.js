
let currentWorkspace = null;

document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();

  const exportBtn = document.getElementById("exportBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const saveToAccountBtn = document.getElementById("saveToAccountBtn");
  const signInHint = document.getElementById("signInHint");
  const statusEl = document.getElementById("status");

  try {
    // Step 1: scan the browser right now and build the workspace object.
    currentWorkspace = await collectWorkspace();

    // Step 2: compute the summary numbers and display them.
    const summary = summarizeWorkspace(currentWorkspace);
    document.getElementById("windowCount").textContent = summary.windowCount;
    document.getElementById("groupCount").textContent = summary.groupCount;
    document.getElementById("tabCount").textContent = summary.tabCount;

    // Only allow exporting once we actually have data to export.
    exportBtn.disabled = false;

    // "Save to Account" additionally requires the user to be signed in —
    // check that separately from having workspace data ready.
    const user = await getCurrentUser();
    if (user) {
      saveToAccountBtn.disabled = false;
    } else {
      signInHint.style.display = "block";
    }
  } catch (err) {
    statusEl.textContent = "Couldn't read browser state. Try reopening this page.";
    statusEl.className = "status error";
    console.error(err);
  }

  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    statusEl.textContent = "Exporting…";
    statusEl.className = "status";

    try {
      const filename = await serializeAndDownload(currentWorkspace);
      statusEl.textContent = `✓ Snapshot exported successfully. (${filename})`;
      statusEl.className = "status success";
    } catch (err) {
      statusEl.textContent = "Export failed. Please try again.";
      statusEl.className = "status error";
      exportBtn.disabled = false;
      console.error(err);
    }
  });

  saveToAccountBtn.addEventListener("click", async () => {
    saveToAccountBtn.disabled = true;
    statusEl.textContent = "Saving to your account…";
    statusEl.className = "status";

    try {
      await saveBackupToCloud(currentWorkspace);
      statusEl.textContent = "✓ Saved to your account.";
      statusEl.className = "status success";
    } catch (err) {
      statusEl.textContent = "Couldn't save to your account: " + err.message;
      statusEl.className = "status error";
      saveToAccountBtn.disabled = false;
      console.error(err);
    }
  });

  cancelBtn.addEventListener("click", () => {
    window.close();
  });
});