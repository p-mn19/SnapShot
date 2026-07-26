const THEME_STORAGE_KEY = "snapshotTheme"; // stored value: "light" | "dark"
 
/**
 * Call this as early as possible on every page (ideally before the rest of
 * the page renders) to avoid a "flash" of the wrong theme.
 */
async function initTheme() {
  const theme = await getStoredTheme();
  applyTheme(theme);
 
  // If the theme is changed on another open page (e.g. toggled in the
  // popup while a backups.html tab is also open), keep this page in sync
  // without needing a manual refresh.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[THEME_STORAGE_KEY]) {
      applyTheme(changes[THEME_STORAGE_KEY].newValue);
    }
  });
}
 
/**
 * Returns the user's saved theme, or falls back to their OS-level
 * light/dark preference if they haven't chosen one in Snapshot yet.
 */
async function getStoredTheme() {
  const stored = await chrome.storage.local.get(THEME_STORAGE_KEY);
  if (stored[THEME_STORAGE_KEY]) {
    return stored[THEME_STORAGE_KEY];
  }
 
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}
 
/**
 * Sets the data-theme attribute on <html>, which is all theme.css needs
 * to swap every color variable at once.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
 
/**
 * Flips the current theme and saves the new choice so it persists
 * across popup opens and other pages.
 */
async function toggleTheme() {
  const current = await getStoredTheme();
  const next = current === "dark" ? "light" : "dark";
  await chrome.storage.local.set({ [THEME_STORAGE_KEY]: next });
  applyTheme(next);
  return next;
}
 