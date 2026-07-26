let pendingWorkspace = null;

document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();

  const fileInput = document.getElementById("fileInput");
  const restoreBtn = document.getElementById("restoreBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const statusEl = document.getElementById("status");
  const statsBlock = document.getElementById("statsBlock");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    resetStatus();
    restoreBtn.disabled = true;
    statsBlock.style.display = "none";
    pendingWorkspace = null;

    if (!file) return;

    try {
      // Step 1: read + JSON.parse the file the user picked.
      const data = await parseWorkspaceFile(file);

      // Step 2: make sure it's actually shaped like a Snapshot workspace
      // before we trust it enough to show numbers or restore from it.
      const result = validateWorkspace(data);
      if (!result.valid) {
        showError(result.reason);
        return;
      }

      pendingWorkspace = data;

      // Step 3: show the same kind of summary the Export screen shows,
      // reusing summarizeWorkspace() from workspace-service.js so the
      // counting logic isn't duplicated between the two screens.
      const summary = summarizeWorkspace(data);
      document.getElementById("windowCount").textContent = summary.windowCount;
      document.getElementById("groupCount").textContent = summary.groupCount;
      document.getElementById("tabCount").textContent = summary.tabCount;
      statsBlock.style.display = "flex";

      restoreBtn.disabled = false;
    } catch (err) {
      showError(err.message);
      console.error(err);
    }
  });

  restoreBtn.addEventListener("click", async () => {
    if (!pendingWorkspace) return;

    restoreBtn.disabled = true;
    statusEl.textContent = "Restoring…";
    statusEl.className = "status";

    try {
      await restoreWorkspace(pendingWorkspace);
      statusEl.textContent = "✓ Workspace restored successfully.";
      statusEl.className = "status success";
    } catch (err) {
      showError("Restore failed partway through. Some windows may already be open.");
      console.error(err);
    } finally {
      restoreBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener("click", () => {
    window.close();
  });

  function showError(message) {
    statusEl.textContent = message;
    statusEl.className = "status error";
  }

  function resetStatus() {
    statusEl.textContent = "";
    statusEl.className = "status";
  }
});