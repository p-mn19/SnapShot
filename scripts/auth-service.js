const AUTH_STORAGE_KEY = "snapshotAuthUser";
 
/**
 * Starts the Google sign-in flow. Returns the signed-in user's basic info
 * ({ uid, email, name, idToken, refreshToken }) or throws if the user
 * cancels or something fails.
 */
async function signIn() {
  // Step 1: get a Google OAuth access token. `interactive: true` means
  // Chrome will show the account picker / consent screen if needed.
  const googleAccessToken = await new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || "Sign-in was cancelled."));
      } else {
        resolve(token);
      }
    });
  });
 
  // Step 2: exchange the Google token for a Firebase user, via Firebase's
  // Identity Toolkit REST API (this is the SDK-free equivalent of calling
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
 * Signs the current user out: clears Chrome's cached Google token and
 * removes the stored Firebase session.
 */
async function signOut() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  const user = stored[AUTH_STORAGE_KEY];
 
  if (user) {
    // Also revoke/clear the cached Google token so the next sign-in
    // shows the account picker again rather than silently reusing it.
    await new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        } else {
          resolve();
        }
      });
    });
  }
 
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