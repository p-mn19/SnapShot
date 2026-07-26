document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();

  const authLoading = document.getElementById("authLoading");
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");

  await renderAuthState();

  document.getElementById("themeToggle").addEventListener("click", async () => {
    await toggleTheme();
  });

  document.getElementById("signInBtn").addEventListener("click", () => {
    openPage("login.html");
  });

  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await signOut();
    await renderAuthState();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    openPage("export.html");
  });

  document.getElementById("importBtn").addEventListener("click", () => {
    openPage("import.html");
  });

  document.getElementById("backupsBtn").addEventListener("click", () => {
    openPage("backups.html");
  });

  async function renderAuthState() {
    authLoading.style.display = "block";
    loggedOutView.style.display = "none";
    loggedInView.style.display = "none";

    const user = await getCurrentUser();

    authLoading.style.display = "none";

    if (user) {
      document.getElementById("userEmail").textContent = user.email;
      loggedInView.style.display = "block";
      await renderLastBackupTime();
    } else {
      loggedOutView.style.display = "block";
    }
  }

  async function renderLastBackupTime() {
    const data = await chrome.storage.local.get("lastBackupTimestamp");
    const el = document.getElementById("lastBackupValue");

    if (!data.lastBackupTimestamp) {
      el.textContent = "Never";
      return;
    }

    const date = new Date(data.lastBackupTimestamp);
    el.textContent = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }
});

function openPage(pageName) {
  chrome.tabs.create({
    url: chrome.runtime.getURL(`pages/${pageName}`)
  });
}