// restore-service.js
//
// Takes a validated workspace object and recreates it in the browser:
// one chrome.windows.create() per saved window, then chrome.tabs.group()
// to re-form the tab groups inside it, then chrome.tabGroups.update() to
// restore each group's title/color/collapsed state.
//
// The tricky part: chrome.windows.create() can open several tabs at once
// (by passing an array of URLs), but it has NO idea about groups — grouping
// only happens *after* the tabs already exist, using their tab IDs. So the
// order of operations here matters a lot:
//
// 1. Create the window with every tab's URL, in a known order
// 2. Read back the real tab IDs Chrome assigned
// 3. Group the tab IDs that belonged to each saved group
// 4. Set that new group's title/color/collapsed to match the saved one
// 5. Re-apply "pinned" to any tabs that were pinned (windows.create can't
//    set this directly per tab)

/**
 * Restores an entire workspace object, one window at a time.
 * Windows are restored sequentially (not in parallel) so that if one
 * fails partway through, it's easy to reason about what already happened.
 */
async function restoreWorkspace(workspace) {
  for (const win of workspace.windows) {
    await restoreWindow(win);
  }
}

/**
 * Restores a single saved window: opens it, then rebuilds its groups.
 */
async function restoreWindow(savedWindow) {
  // Flatten groups + ungrouped tabs into one ordered list of tab entries,
  // while remembering which index range belongs to which group.
  const orderedTabs = [];
  const groupRanges = []; // { start, end (exclusive), groupInfo }

  for (const group of savedWindow.groups) {
    const start = orderedTabs.length;
    orderedTabs.push(...group.tabs);
    groupRanges.push({ start, end: orderedTabs.length, groupInfo: group });
  }

  const ungroupedStart = orderedTabs.length;
  orderedTabs.push(...savedWindow.ungroupedTabs);

  if (orderedTabs.length === 0) {
    // Nothing saved for this window — skip it rather than opening a blank one.
    return;
  }

  // Step 1: open the window with every tab's URL at once, in order.
  const createdWindow = await chrome.windows.create({
    url: orderedTabs.map((tab) => tab.url),
    focused: false
  });

  // Step 2: chrome.windows.create returns tabs in the same order we gave
  // their URLs, so index position lines up with our orderedTabs array.
  const createdTabIds = createdWindow.tabs.map((tab) => tab.id);

  // Step 3 + 4: re-form each group from its slice of tab IDs, then restore
  // its title/color/collapsed state.
  for (const range of groupRanges) {
    const tabIdsForGroup = createdTabIds.slice(range.start, range.end);
    if (tabIdsForGroup.length === 0) continue;

    const newGroupId = await chrome.tabs.group({ tabIds: tabIdsForGroup });

    await chrome.tabGroups.update(newGroupId, {
      title: range.groupInfo.title,
      color: range.groupInfo.color,
      collapsed: range.groupInfo.collapsed
    });
  }

  // Step 5: re-apply pinned state per-tab (chrome.windows.create doesn't
  // support pinning individual tabs when creating several at once).
  for (let i = 0; i < orderedTabs.length; i++) {
    if (orderedTabs[i].pinned) {
      await chrome.tabs.update(createdTabIds[i], { pinned: true });
    }
  }
}