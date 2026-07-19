// serializer.js
//
// Takes the workspace object built by workspace-service.js and turns it into
// an actual .json file the user can save, using Chrome's downloads API.

/**
 * Converts a workspace object into a JSON file and triggers a browser
 * download for it. Also updates chrome.storage.local so the popup's
 * "Last Backup" field stays accurate.
 */
async function serializeAndDownload(workspace) {
  const json = JSON.stringify(workspace, null, 2); // pretty-printed, 2-space indent

  // Blob = "Binary Large Object". This wraps our JSON text so the browser
  // treats it as a downloadable file rather than just a string in memory.
  const blob = new Blob([json], { type: "application/json" });

  // Blob URLs are temporary, browser-internal links (blob:chrome-extension://...)
  // that point at the Blob we just created. chrome.downloads.download needs
  // a URL, not raw text, which is why we create one here.
  const blobUrl = URL.createObjectURL(blob);

  const filename = buildFilename(workspace.createdAt);

  await chrome.downloads.download({
    url: blobUrl,
    filename,
    saveAs: true // prompts the user with a "Save As" dialog instead of silently saving
  });

  // Remember when we last backed up, so the popup's Home Screen can show it.
  await chrome.storage.local.set({ lastBackupTimestamp: workspace.createdAt });

  // Free the memory held by the blob URL now that the download has started.
  URL.revokeObjectURL(blobUrl);

  return filename;
}

/**
 * Builds a filename like "snapshot-18-07-2026.json" from an ISO timestamp,
 * matching the naming style shown in the design doc.
 */
function buildFilename(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `snapshot-${day}-${month}-${year}.json`;
}