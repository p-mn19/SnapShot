const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

function backupsCollectionUrl(uid) {
  return `${FIRESTORE_BASE}/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${uid}/backups`;
}

/**
 * Saves a workspace object to the signed-in user's account.
 * Returns the new backup's document ID.
 */
async function saveBackupToCloud(workspace) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const idToken = await getValidIdToken();
  const summary = summarizeWorkspace(workspace);

  const body = {
    fields: {
      workspaceJson: { stringValue: JSON.stringify(workspace) },
      createdAt: { timestampValue: new Date(workspace.createdAt).toISOString() },
      windowCount: { integerValue: String(summary.windowCount) },
      groupCount: { integerValue: String(summary.groupCount) },
      tabCount: { integerValue: String(summary.tabCount) }
    }
  };

  const response = await fetch(backupsCollectionUrl(user.uid), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Failed to save backup to your account.");
  }

  // Firestore document "name" looks like:
  // projects/.../documents/users/{uid}/backups/{docId} — we just want docId.
  return data.name.split("/").pop();
}

/**
 * Lists all backups saved to the signed-in user's account, most recent
 * first. Returns lightweight summary objects (no full workspace JSON) so
 * the list screen loads quickly even with many backups.
 */
async function listCloudBackups() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const idToken = await getValidIdToken();

  const url = `${backupsCollectionUrl(user.uid)}?orderBy=createdAt%20desc&pageSize=50`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Failed to load your backups.");
  }

  if (!data.documents) return []; // no backups saved yet

  return data.documents.map((doc) => {
    const id = doc.name.split("/").pop();
    return {
      id,
      createdAt: doc.fields.createdAt.timestampValue,
      windowCount: Number(doc.fields.windowCount.integerValue),
      groupCount: Number(doc.fields.groupCount.integerValue),
      tabCount: Number(doc.fields.tabCount.integerValue)
    };
  });
}

/**
 * Fetches one backup's full workspace object by its document ID —
 * used when the user picks a backup to restore or download.
 */
async function getCloudBackup(backupId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const idToken = await getValidIdToken();

  const response = await fetch(`${backupsCollectionUrl(user.uid)}/${backupId}`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Failed to load this backup.");
  }

  return JSON.parse(data.fields.workspaceJson.stringValue);
}

/**
 * Deletes one backup by its document ID.
 */
async function deleteCloudBackup(backupId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const idToken = await getValidIdToken();

  const response = await fetch(`${backupsCollectionUrl(user.uid)}/${backupId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to delete this backup.");
  }
}