// service-worker.js
//
// Manifest V3 requires a background service worker instead of the old
// "persistent background page." Unlike a normal script, this file is NOT
// kept running all the time — Chrome starts it up only when something
// relevant happens (an installed event, an alarm, a message from a popup),
// then shuts it down again after a short idle period. That's why you can't
// rely on variables here "staying set" between events — anything that needs
// to persist belongs in chrome.storage, not in memory here.
//
// For the MVP, Snapshot doesn't need background behavior — export/import
// happen entirely from the popup and pages. This file exists so:
// 1. manifest.json's background.service_worker reference doesn't error out
// 2. It's the natural place to add scheduled auto-backups later
//    (see "Future Enhancements" in the project doc) using chrome.alarms.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Snapshot installed.");
});