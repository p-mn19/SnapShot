// export.js
// This runs on the Export page. It loads workspace-service.js and
// serializer.js as plain <script> tags first (see export.html), so their
// functions (collectWorkspace, summarizeWorkspace, serializeAndDownload)
// are just available here as regular globals — no imports needed.

let currentWorkspace = null;

document.addEventListener("DOMContentLoaded", async () => {
  const exportBtn = document.getElementById("exportBtn");
  const cancelBtn = document.getElementById("cancelBtn");
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

  cancelBtn.addEventListener("click", () => {
    window.close();
  });
});