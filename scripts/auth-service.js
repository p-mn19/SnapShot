const AUTH_STORAGE_KEY = "snapshotAuthUser";
 
/**
 * Starts the Google sign-in flow. Returns the signed-in user's basic info
 * ({ uid, email, name, idToken, refreshToken }) or throws if the user
 * cancels or something fails.
 */
async function signIn() {
  // Step 1 + 2: open Google's sign-in page in a popup and get back an
  // access token via the redirect URL.
  const googleAccessToken = await getGoogleAccessTokenViaWebAuthFlow();
 
  // Step 3: exchange the Google token for a Firebase user, via Firebase's
  // Identity Toolkit REST API (the SDK-free equivalent of calling
  // signInWithPopup(googleProvider) in a normal web app).
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_CONFIG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `access_token=${googleAccessToken}&providerId=google.com`,
        requestUri: chrome.identity.getRedirectURL(),
        returnSecureToken: true
      })
    }
  );
 
  const data = await response.json();
 
  if (data.error) {
    throw new Error(data.error.message || "Firebase sign-in failed.");
  }
 
  const user = {
    uid: data.localId,
    email: data.email,
    name: data.displayName || data.email,
    idToken: data.idToken,       // used to authenticate Firestore requests
    refreshToken: data.refreshToken, // used to get a new idToken once it expires
    idTokenExpiresAt: Date.now() + Number(data.expiresIn) * 1000
  };
 
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: user });
  return user;
}
 
/**
 * Opens Google's OAuth consent screen in a popup via launchWebAuthFlow and
 * returns the access_token it redirects back with. This is the piece that
 * makes sign-in work in any Chromium-based browser, not just Chrome —
 * unlike getAuthToken(), it doesn't rely on the browser's own built-in
 * Google account session.
 */
function getGoogleAccessTokenViaWebAuthFlow() {
  return new Promise((resolve, reject) => {
    const redirectUri = chrome.identity.getRedirectURL();
 
    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?client_id=${encodeURIComponent(OAUTH_CLIENT_ID)}` +
      `&response_type=token` + // implicit flow — no client secret needed
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent("https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile")}`;
 
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          reject(new Error(chrome.runtime.lastError?.message || "Sign-in was cancelled."));
          return;
        }
 
        // Google redirects back with the token in the URL's fragment, e.g.
        // https://<ext-id>.chromiumapp.org/#access_token=...&expires_in=...
        const fragment = responseUrl.split("#")[1] || "";
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
 
        if (!accessToken) {
          reject(new Error("Google sign-in did not return an access token."));
          return;
        }
 
        resolve(accessToken);
      }
    );
  });
}
 
/**
 * Signs the current user out by clearing the stored Firebase session.
 * (No cached browser-level token to clear here, unlike the old
 * getAuthToken()-based approach — launchWebAuthFlow doesn't leave one
 * behind, so there's nothing extra to revoke on the browser side.)
 */
async function signOut() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}
 
/**
 * Returns the currently stored user, or null if nobody's signed in.
 * Does NOT check whether idToken is still valid — call getValidIdToken()
 * before making an authenticated request.
 */
async function getCurrentUser() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  return stored[AUTH_STORAGE_KEY] || null;
}
 
/**
 * Returns a still-valid Firebase idToken, refreshing it first if it's
 * expired. Firestore requests will be built around calling this rather
 * than reading user.idToken directly, since tokens only last ~1 hour.
 */
async function getValidIdToken() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");
 
  if (Date.now() < user.idTokenExpiresAt - 60_000) {
    // Still valid (with a 60s safety buffer).
    return user.idToken;
  }
 
  // Expired — use the refreshToken to get a new one without re-prompting
  // the user to sign in again.
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${user.refreshToken}`
    }
  );
 
  const data = await response.json();
  if (data.error) {
    throw new Error("Session expired. Please sign in again.");
  }
 
  const updatedUser = {
    ...user,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    idTokenExpiresAt: Date.now() + Number(data.expires_in) * 1000
  };
 
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: updatedUser });
  return updatedUser.idToken;
}
 