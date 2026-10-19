# DisasTrack – Firebase setup

Project: `disastrackdb` · Realtime Database: https://disastrackdb-default-rtdb.firebaseio.com

## 1. One-time console steps (do these once, for the whole team)
1. **Authentication → Sign-in method → Email/Password → Enable.**
2. **Authentication → Users → Add user** for the first admin:
   - Email: `<your-username>@disastrack.app`  (example: `admin@disastrack.app`)
   - Password: pick a strong one (at least 8 characters)
   - Copy the **User UID** shown in the table.
3. **Realtime Database → Data tab.** Hover the root, click **+**, and add a child named `users`.
   Inside it add a child named with your UID (paste it), then add these fields:
   ```
   name:      "Your Name"
   username:  "admin"
   email:     "your-real-email@mail.com"
   phone:     "09xx xxx xxxx"
   role:      "Admin"
   status:    "Active"
   createdAt: "2026-10-18T09:00:00.000Z"
   ```
   (The username must match the part before `@disastrack.app` in step 2.)
4. **Realtime Database → Rules.** Paste the contents of `database.rules.json`, then **Publish**.

## 2. How sign-in works
People type a **username**. The app turns it into `username@disastrack.app` for Firebase Auth.
The real email is only stored in the profile. Because of this, "Forgot password" cannot send an email;
an admin resets passwords in Authentication → Users → (⋮) → Reset password.

## 3. Database structure (shared by the team)
```
/users/Admins/{uid}                       one folder per role; each child is one person
/users/Residents/{uid}                    (the folder name is only a way to organize them)
/users/DisasterManagementOfficers/{uid}
/users/RescueTeamMembers/{uid}
      fields: name, username, email, phone, role, status, createdAt, lastLogin, photo, office
              role = Admin | Resident | Disaster Management Officer | Rescue Team
              status = Active | Suspended
              Rescue Team: team          Resident: address
/userRoles/{uid}    "Admin" | "Resident" | "Disaster Management Officer" | "Rescue Team"
                    (lookup: gives a person's role from their uid, so the app knows which folder to read)
/auditLogs/{id}     timestamp, actor, role, category, action, target, details
/incidents/{id}     (teammates)  /rescueTeams/{id}  (teammates)
```
Rules for `incidents` and `rescueTeams` are open to any signed-in user for now.
Whoever owns those modules should tighten them later.

## 4. Using Firebase in your own screens
```js
import { db } from "../firebase.js";
import { ref, onValue, push, update } from "firebase/database";
```

## 5. Role folders (read this if you read /users in your own code)
- To find the signed-in person: read `/userRoles/{uid}` first, then `/users/{folder}/{uid}`
  (Residents, DisasterManagementOfficers, RescueTeamMembers, Admins).
- Accounts created before the folders existed sit directly at `/users/{uid}`. On the Users screen,
  an admin clicks **Move into role folders** once to move them.
- When publishing `database.rules.json`, an admin must also be recognized by the old `role` field
  until their account is moved; that is why the rules check both places.
