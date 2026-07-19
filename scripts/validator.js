// validator.js
//
// Before we let a parsed JSON object anywhere near restore-service.js (which
// creates real browser windows/tabs), we check that it's actually shaped
// like a Snapshot workspace object. This protects against:
// - Random unrelated JSON files the user picks by mistake
// - Files from a future/older version of Snapshot with a different shape
// - Manually edited/corrupted files

const SUPPORTED_SCHEMA_VERSIONS = [1];

/**
 * Validates a parsed workspace object.
 * Returns { valid: true } or { valid: false, reason: "..." } —
 * it never throws, so the caller can always show a friendly message.
 */
function validateWorkspace(data) {
  if (typeof data !== "object" || data === null) {
    return { valid: false, reason: "File does not contain a valid Snapshot workspace." };
  }

  if (!SUPPORTED_SCHEMA_VERSIONS.includes(data.version)) {
    return { valid: false, reason: `Unsupported Snapshot file version (${data.version}).` };
  }

  if (!Array.isArray(data.windows)) {
    return { valid: false, reason: "File is missing window data." };
  }

  for (const win of data.windows) {
    if (!Array.isArray(win.groups) || !Array.isArray(win.ungroupedTabs)) {
      return { valid: false, reason: "A window entry is malformed." };
    }

    for (const group of win.groups) {
      if (typeof group.title !== "string" || !Array.isArray(group.tabs)) {
        return { valid: false, reason: "A tab group entry is malformed." };
      }
      if (!allTabsValid(group.tabs)) {
        return { valid: false, reason: "A tab inside a group is malformed." };
      }
    }

    if (!allTabsValid(win.ungroupedTabs)) {
      return { valid: false, reason: "An ungrouped tab entry is malformed." };
    }
  }

  return { valid: true };
}

function allTabsValid(tabs) {
  return tabs.every(
    (tab) => typeof tab.url === "string" && tab.url.length > 0
  );
}