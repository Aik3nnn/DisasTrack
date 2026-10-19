/* ------------------------------------------------------------------
   Everything that talks to Firebase about accounts lives here, so the
   screens stay simple. Profiles are saved at /users/{uid}.
------------------------------------------------------------------- */
import { deleteApp, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { app, auth, db, usernameToEmail } from "../firebase.js";
import { logAction } from "./Audit/auditLog.js";

// Turns Firebase's error codes into messages a person can read.
function friendlyMessage(err) {
  const code = err?.code || "";
  if (code === "auth/email-already-in-use") return "This username is already used by another account.";
  if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password", "auth/invalid-email"].includes(code))
    return "Wrong username or password.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "auth/network-request-failed") return "No internet connection. Please try again.";
  if (code === "auth/weak-password") return "The password is too weak. Use at least 8 characters.";
  if (String(err?.message).includes("PERMISSION_DENIED")) return "You don't have permission to do that.";
  return err?.message || "Something went wrong. Please try again.";
}

// ---------- sign in / out ----------

// Loads the signed-in person's profile and checks that they may use the admin console.
export async function loadAdminProfile(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  const profile = snapshot.val();

  let problem = "";
  if (!profile) problem = "No profile was found for this account. Ask an administrator to set it up.";
  else if (profile.role !== "Admin") problem = "This account does not have access to the admin console.";
  else if (profile.status === "Suspended") problem = "This account has been suspended.";

  if (problem) {
    await signOut(auth);
    throw new Error(problem);
  }
  return { uid, ...profile };
}

export async function signInAdmin(username, password, remember) {
  try {
    // "Remember me" keeps the login after the browser closes.
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const result = await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
    const admin = await loadAdminProfile(result.user.uid);
    await update(ref(db, `users/${admin.uid}`), { lastLogin: new Date().toISOString() });
    // Record the sign-in (the actor is passed here because App.jsx has not stored it yet).
    logAction({
      actor: admin.name,
      actorId: admin.uid,
      role: "Administrator",
      category: "Login",
      action: "Signed in",
      target: "Admin console",
      details: "Successful sign-in",
    });
    return admin;
  } catch (err) {
    throw new Error(friendlyMessage(err));
  }
}

// ---------- accounts (users, dispatchers, ...) ----------

// Calls callback(list, error) every time /users changes. Returns a function that stops listening.
export function watchAccounts(callback) {
  return onValue(
    ref(db, "users"),
    (snapshot) => {
      const data = snapshot.val() || {};
      callback(Object.entries(data).map(([id, value]) => ({ id, ...value })), null);
    },
    (err) => callback([], new Error(friendlyMessage(err)))
  );
}

// Creates the sign-in account AND the profile.
// A second, temporary Firebase app is used so the admin does not get signed out
// (creating a user normally signs you in as that user).
export async function createAccount(profile, password) {
  const helperApp = initializeApp(app.options, `helper-${Date.now()}`);
  try {
    const helperAuth = getAuth(helperApp);
    const created = await createUserWithEmailAndPassword(helperAuth, usernameToEmail(profile.username), password);
    await set(ref(db, `users/${created.user.uid}`), {
      ...profile,
      createdAt: new Date().toISOString(),
    });
    await signOut(helperAuth);
  } catch (err) {
    throw new Error(friendlyMessage(err));
  } finally {
    await deleteApp(helperApp);
  }
}

export async function updateAccount(uid, values) {
  try {
    await update(ref(db, `users/${uid}`), values);
  } catch (err) {
    throw new Error(friendlyMessage(err));
  }
}

// NOTE: this removes the profile only. The sign-in account stays in Firebase
// Authentication, but it can no longer use the app because it has no profile.
// To free the username again, delete it in the Firebase console (Authentication > Users).
export async function deleteAccount(uid) {
  try {
    await remove(ref(db, `users/${uid}`));
  } catch (err) {
    throw new Error(friendlyMessage(err));
  }
}

// Changes the signed-in person's own password.
// Firebase wants the current password again first (re-authentication).
export async function changeOwnPassword(currentPassword, newPassword) {
  try {
    // Use the email Firebase Auth actually has for this account (not the profile username).
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  } catch (err) {
    if (["auth/invalid-credential", "auth/wrong-password"].includes(err?.code)) {
      throw new Error("Your current password is incorrect.");
    }
    throw new Error(friendlyMessage(err));
  }
}
