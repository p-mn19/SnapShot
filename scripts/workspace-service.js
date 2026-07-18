// workspace-service.js
//
// This is the heart of Snapshot. Its only job is to look at what the browser
// is currently doing (windows, tab groups, tabs) and turn that into a plain
// JavaScript object we call a "workspace object."
//
// Every other part of the extension builds on top of this shape:
// - serializer.js turns this object into the JSON file you download
// - parser.js turns a JSON file back into this same shape
// - restore-service.js reads this shape and recreates the browser windows
//
// Because everything depends on this shape, we define it clearly here:
//
// workspace = {
//   version: 1,
//   createdAt: "2026-07-18T18:42:00.000Z",
//   windows: [
//     {
//       groups: [
//         {
//           title: "DSA",
//           color: "blue",
//           collapsed: false,
//           tabs: [
//             { url: "https://leetcode.com", title: "LeetCode", pinned: false }
//           ]
//         }
//       ],
//       ungroupedTabs: [
//         { url: "https://mail.google.com", title: "Gmail", pinned: true }
//       ]
//     }
//   ]
// }

const WORKSPACE_SCHEMA_VERSION = 1;

/**
 * Collects the entire current browser state into a workspace object.
 * This is the function the Export screen calls.
 */
async function collectWorkspace() {
  // chrome.windows.getAll with populate:true returns every open window,
  // and for each window, every tab inside it (nested under window.tabs).
  const chromeWindows = await chrome.windows.getAll({ populate: true });

  const windows = [];

  for (const win of chromeWindows) {
    // Tab groups are queried per-window, not returned by chrome.windows.getAll.
    // Each group has an id, a title, a color, and whether it's collapsed.
    const chromeGroups = await chrome.tabGroups.query({ windowId: win.id });

    // Build a lookup so we can quickly find a group's info by its id
    // while we're looping through tabs below.
    const groupsById = new Map();
    for (const group of chromeGroups) {
      groupsById.set(group.id, {
        title: group.title || "Untitled Group",
        color: group.color,
        collapsed: group.collapsed,
        tabs: []
      });
    }

    const ungroupedTabs = [];

    for (const tab of win.tabs) {
      const tabData = {
        url: tab.url,
        title: tab.title,
        pinned: tab.pinned
      };

      // chrome.tabGroups.TAB_GROUP_ID_NONE (-1) means "this tab isn't in a group."
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && groupsById.has(tab.groupId)) {
        groupsById.get(tab.groupId).tabs.push(tabData);
      } else {
        ungroupedTabs.push(tabData);
      }
    }

    windows.push({
      groups: Array.from(groupsById.values()),
      ungroupedTabs
    });
  }

  return {
    version: WORKSPACE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    windows
  };
}

/**
 * Computes quick summary numbers (windows/groups/tabs count) from a
 * workspace object. Used by both the Export preview and the Import preview
 * screens, so it lives here rather than being duplicated in both places.
 */
function summarizeWorkspace(workspace) {
  let groupCount = 0;
  let tabCount = 0;

  for (const win of workspace.windows) {
    groupCount += win.groups.length;
    for (const group of win.groups) {
      tabCount += group.tabs.length;
    }
    tabCount += win.ungroupedTabs.length;
  }

  return {
    windowCount: workspace.windows.length,
    groupCount,
    tabCount,
    createdAt: workspace.createdAt
  };
}