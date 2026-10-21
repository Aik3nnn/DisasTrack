# DisasTrack – Firebase setup

Project: `disastrackdb` · Realtime Database: https://disastrackdb-default-rtdb.firebaseio.com
Coverage: **Bulacan province only** (map, sample data and coordinate checks are all set to Bulacan).

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
   This first admin sits directly at `/users/{uid}` (a "legacy" account). The rules accept it
   through its `role` field. After signing in, click **Move into role folders** on the Users screen.
4. **Realtime Database → Rules.** Paste the contents of `database.rules.json`, then **Publish**.
5. **First-time data (once):**
   - Rescue Teams → **Set up default teams** (creates `T-01` to `T-08` and their member accounts).
   - Incident Reports → **Load sample incidents** (19 Bulacan samples).
   - If the database still has old Quezon City / Marikina data, delete `/incidents` and
     `/rescueTeams` first, then run both buttons again.

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
              Rescue Team: team (name), teamId ("T-01")      Resident: address
/userRoles/{uid}    "Admin" | "Resident" | "Disaster Management Officer" | "Rescue Team"
                    (lookup: gives a person's role from their uid, so the app knows which folder to read)
/auditLogs/{id}     timestamp, actor, actorId, role, category, action, target, details
/incidents/{id}     id ("DT-1042"), type, location, reporter, reporterId, phone, priority, status,
                    description, photos, lat, lng, team ("T-01"), duplicateOf, match, createdAt,
                    activity[] = { text, at }
                    priority = Critical | High | Medium | Low
                    status   = Pending | Verified | In Progress | Resolved | Duplicate | Rejected
/rescueTeams/{id}   name, type, leader, phone, base, status, assignment, createdAt,
                    location = { lat, lng, updatedAt }   (written by the team's phone)
                    status = Available | Standby | Deployed | Off duty
```
Timestamps are ISO strings (`new Date().toISOString()`), except `location.updatedAt`, which is a number
(`Date.now()`). Firebase does not store empty fields, so a missing `team` or `duplicateOf` means "none".

## 4. Who can do what (summary of `database.rules.json`)
| Data | Admin | Disaster Mgmt Officer | Rescue Team | Resident |
|---|---|---|---|---|
| `/users`, `/userRoles` | read + write all | – | own profile only | own profile only |
| `/auditLogs` | read; write own entries | read; write own entries | write own entries | write own entries |
| `/incidents` | read + write all | read + write all | read all; update `status` and `activity` of incidents assigned to their team | create (as `Pending`); read own (needs `reporterId`) |
| `/rescueTeams` | read + write all | read + write all | read all; write own team's `location` and `status` | – |

Other rules worth knowing:
- Audit entries can only be created (never edited or deleted), and `actorId` must be the writer's own uid.
- A user can only edit their own profile fields (name, email, phone, office, photo, lastLogin), and only
  in the folder that matches their role in `/userRoles`.
- Values are checked: priority, status and role must be from the lists above, and text fields have length limits.
- `lat`/`lng` must be inside a box around Bulacan (lat 14.6 to 15.35, lng 120.65 to 121.4).
  To allow anywhere, remove the `LAT` / `LNG` `.validate` lines in the rules.

## 5. Using Firebase in your own screens
```js
import { db } from "../firebase.js";
import { ref, onValue, push, update } from "firebase/database";
```
Incidents and teams already have helpers, so use these instead of writing your own:
- `Admin/IncidentReports/incidentService.js` (`watchIncidents`, `updateIncident`, `createIncident`)
- `Admin/js/teamService.js` (`watchTeams`, `setTeamAssignment`, `setTeamLocations`)

## 6. Role folders (read this if you read /users in your own code)
- To find the signed-in person: read `/userRoles/{uid}` first, then `/users/{folder}/{uid}`
  (Residents, DisasterManagementOfficers, RescueTeamMembers, Admins).
- Accounts created before the folders existed sit directly at `/users/{uid}`. On the Users screen,
  an admin clicks **Move into role folders** once to move them.
- When publishing `database.rules.json`, an admin must also be recognized by the old `role` field
  until their account is moved; that is why the rules check both places.

## 7. For the resident and rescue-team apps
- **Resident app:** write new reports to `/incidents/{id}` with `status: "Pending"`, an ISO `createdAt`,
  numeric `lat` / `lng`, and `reporterId` (the resident's uid). Without `reporterId` the resident cannot
  read their own report back. Reports without `lat`/`lng` show in lists but not on the maps.
- **Rescue team app:** the member's profile needs a `teamId` (set automatically when an admin adds
  them on the Users screen). Without it, their location and status writes are rejected.
  Write the position to `/rescueTeams/{teamId}/location` as `{ lat, lng, updatedAt: Date.now() }`.
