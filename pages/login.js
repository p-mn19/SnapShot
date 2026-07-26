// login.js
// Runs on the login page. Depends on firebase-config.js and auth-service.js
// being loaded first as plain scripts (see login.html).

document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();

  const signInBtn = document.getElementById("googleSignInBtn");
  const statusEl = document.getElementById("status");

  signInBtn.addEventListener("click", async () => {
    signInBtn.disabled = true;
    statusEl.textContent = "Signing in…";
    statusEl.className = "status";

    try {
      const user = await signIn();
      statusEl.textContent = `Signed in as ${user.email}`;
      statusEl.className = "status success";

      // Close this tab and return to the popup / wherever the user came
      // from — the popup will re-check auth state next time it opens.
      setTimeout(() => window.close(), 800);
    } catch (err) {
      statusEl.textContent = err.message || "Sign-in failed. Please try again.";
      statusEl.className = "status error";
      signInBtn.disabled = false;
      console.error(err);
    }
  });
});