document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();

  const loadingState = document.getElementById("loadingState");
  const emptyState = document.getElementById("emptyState");
  const listEl = document.getElementById("backupList");
  const statusEl = document.getElementById("status");

  document.getElementById("closeBtn").addEventListener("click", () => window.close());

  await loadBackups();

  async function loadBackups() {
    loadingState.style.display = "block";
    emptyState.style.display = "none";
    listEl.innerHTML = "";

    try {
      const backups = await listCloudBackups();
      loadingState.style.display = "none";

      if (backups.length === 0) {
        emptyState.style.display = "block";
        return;
      }

      for (const backup of backups) {
        listEl.appendChild(renderBackupItem(backup));
      }
    } catch (err) {
      loadingState.style.display = "none";
      showError(err.message);
      console.error(err);
    }
  }

  function renderBackupItem(backup) {
    const item = document.createElement("div");
    item.className = "backup-item";

    const date = new Date(backup.createdAt);
    const dateStr = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    item.innerHTML = `
      <div class="backup-info">
        <div class="date">${dateStr}</div>
        <div class="counts">${backup.windowCount} windows · ${backup.groupCount} groups · ${backup.tabCount} tabs</div>
      </div>
      <div class="backup-actions">
        <button class="icon-btn restore">Restore</button>
        <button class="icon-btn download">Download</button>
        <button class="icon-btn delete">Delete</button>
      </div>
    `;

    item.querySelector(".restore").addEventListener("click", () => handleRestore(backup.id));
    item.querySelector(".download").addEventListener("click", () => handleDownload(backup.id));
    item.querySelector(".delete").addEventListener("click", () => handleDelete(backup.id));

    return item;
  }

  async function handleRestore(backupId) {
    clearStatus();
    statusEl.textContent = "Restoring…";
    try {
      const workspace = await getCloudBackup(backupId);
      await restoreWorkspace(workspace);
      statusEl.textContent = "✓ Workspace restored successfully.";
      statusEl.className = "status success";
    } catch (err) {
      showError("Restore failed: " + err.message);
    }
  }

  async function handleDownload(backupId) {
    clearStatus();
    statusEl.textContent = "Preparing download…";
    try {
      const workspace = await getCloudBackup(backupId);
      const filename = await serializeAndDownload(workspace);
      statusEl.textContent = `✓ Downloaded as ${filename}`;
      statusEl.className = "status success";
    } catch (err) {
      showError("Download failed: " + err.message);
    }
  }

  async function handleDelete(backupId) {
    const confirmed = confirm("Delete this backup? This can't be undone.");
    if (!confirmed) return;

    clearStatus();
    try {
      await deleteCloudBackup(backupId);
      await loadBackups(); // refresh the list
    } catch (err) {
      showError("Delete failed: " + err.message);
    }
  }

  function showError(message) {
    statusEl.textContent = message;
    statusEl.className = "status error";
  }

  function clearStatus() {
    statusEl.textContent = "";
    statusEl.className = "status";
  }
});