import { useMemo, useState } from "react";
import Icon from "../Icon.jsx";
import UserModal from "./UserModal.jsx";
import { ROLES } from "./usersData.js";
import { useAccounts } from "../useAccounts.js";
import { createAccount, deleteAccount, updateAccount } from "../accountService.js";
import { downloadCSV, formatDate, phoneText, slug } from "../adminHelpers.js";
import { logAction } from "../Audit/auditLog.js";
import "./Users.css";

export default function Users() {
  const { accounts, loading, error } = useAccounts();
  // This screen shows everyone except admins and dispatchers (dispatchers have their own screen).
  const users = useMemo(
    () => accounts.filter((u) => u.role !== "Admin" && u.role !== "Dispatcher"),
    [accounts]
  );
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState("all"); // "all" or one of the roles
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // null | { user } (user null = add)
  const [removing, setRemoving] = useState(null); // user waiting for delete confirmation

  const countRole = (role) => users.filter((u) => u.role === role).length;
  const suspended = users.filter((u) => u.status === "Suspended").length;

  const stats = [
    { label: "Total Users", value: users.length, icon: "users", tone: "slate", note: "All accounts" },
    { label: "Residents", value: countRole("Resident"), icon: "profile", tone: "jet", note: "Report emergencies" },
    { label: "DM Officers", value: countRole("Disaster Management Officer"), icon: "rescue", tone: "brandy", note: "Disaster Management Officers" },
    { label: "Suspended", value: suspended, icon: "alert", tone: "sun", note: "Cannot sign in" },
  ];

  // Apply the role tab and the search box.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (tab === "all" || u.role === tab) &&
        (!q || [u.name, u.username, u.email, u.team, u.address].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [users, tab, query]);

  // Errors thrown here are shown inside the dialog.
  async function save(values) {
    // Do not save the password or the id inside the profile.
    const { password, id, ...profile } = values; // eslint-disable-line no-unused-vars
    if (modal.user) {
      await updateAccount(modal.user.id, profile);
      logAction({ category: "Account", action: "User updated", target: profile.name, details: `${profile.role} account edited` });
    } else {
      await createAccount(profile, password);
      logAction({ category: "Account", action: "User created", target: profile.name, details: `Added as ${profile.role}` });
    }
    setModal(null);
  }

  async function toggleStatus(u) {
    setActionError("");
    try {
      const newStatus = u.status === "Active" ? "Suspended" : "Active";
      await updateAccount(u.id, { status: newStatus });
      logAction({
        category: "Account",
        action: newStatus === "Suspended" ? "User suspended" : "User reactivated",
        target: u.name,
        details: `${u.role} account set to ${newStatus}`,
      });
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function confirmRemove() {
    setActionError("");
    try {
      await deleteAccount(removing.id);
      logAction({ category: "Account", action: "User deleted", target: removing.name, details: `${removing.role} account removed` });
    } catch (err) {
      setActionError(err.message);
    }
    setRemoving(null);
  }

  function exportCSV() {
    downloadCSV(
      "disastrack-users.csv",
      ["ID", "Name", "Username", "Email", "Phone", "Role", "Team", "Status", "Last login"],
      visible.map((u) => [u.id, u.name, u.username, u.email, phoneText(u.phone), u.role, u.team, u.status, formatDate(u.lastLogin)])
    );
  }

  return (
    <div className="rt-page">
      {/* summary cards */}
      <section className="admin-stats" aria-label="User summary">
        {stats.map((s) => (
          <article key={s.label} className="admin-card admin-stat">
            <div>
              <p className="admin-stat__label">{s.label}</p>
              <p className="admin-stat__value">{s.value}</p>
              <p className="admin-stat__note">{s.note}</p>
            </div>
            <span className={`admin-stat__chip admin-stat__chip--${s.tone}`}>
              <Icon name={s.icon} size={20} />
            </span>
          </article>
        ))}
      </section>

      {/* toolbar */}
      <div className="rt-toolbar">
        <div className="admin-chips" role="group" aria-label="Filter by role">
          {["all", ...ROLES].map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-chip ${tab === key ? "is-active" : ""}`}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {key === "all" ? "All" : key}
              <span className="rt-chipcount">{key === "all" ? users.length : countRole(key)}</span>
            </button>
          ))}
        </div>

        <div className="rt-toolbar__right">
          <label className="rt-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="button" className="admin-btn" onClick={exportCSV}>
            Export CSV
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setModal({ user: null })}>
            <Icon name="plus" size={16} />
            Add user
          </button>
        </div>
      </div>

      {(error || actionError) && <p className="rt-error">{(error || { message: actionError }).message}</p>}

      {/* table */}
      <section className="admin-card rt-card" aria-label="Users">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Contact</th>
                <th scope="col">Role</th>
                <th scope="col">Team / Address</th>
                <th scope="col">Status</th>
                <th scope="col">Last login</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="admin-table__strong">{u.name}</span>
                    <span className="rt-sub">{u.id} · @{u.username}</span>
                  </td>
                  <td>
                    {u.email}
                    <span className="rt-sub">{phoneText(u.phone)}</span>
                  </td>
                  <td>
                    <span className={`us-badge us-badge--${slug(u.role)}`}>{u.role}</span>
                  </td>
                  <td>{u.team || u.address || <span className="rt-muted">—</span>}</td>
                  <td>
                    <span className={`us-badge us-badge--${slug(u.status)}`}>{u.status}</span>
                  </td>
                  <td>{formatDate(u.lastLogin)}</td>
                  <td className="admin-table__action">
                    <div className="rt-actions">
                      <button
                        type="button"
                        className="rt-iconbtn"
                        data-tip="Edit user"
                        aria-label={`Edit ${u.name}`}
                        onClick={() => setModal({ user: u })}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="rt-iconbtn"
                        data-tip={u.status === "Active" ? "Suspend account" : "Reactivate account"}
                        aria-label={u.status === "Active" ? `Suspend ${u.name}` : `Reactivate ${u.name}`}
                        onClick={() => toggleStatus(u)}
                      >
                        <Icon name={u.status === "Active" ? "alert" : "check"} size={16} />
                      </button>
                      <button
                        type="button"
                        className="rt-iconbtn rt-iconbtn--danger"
                        data-tip="Delete user"
                        aria-label={`Delete ${u.name}`}
                        onClick={() => setRemoving(u)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="rt-empty">
              <h3>Loading users…</h3>
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="rt-empty">
              <h3>No users found</h3>
              <p>Add a user, or try a different role or search term.</p>
            </div>
          )}
        </div>
      </section>

      {modal && (
        <UserModal user={modal.user} existing={users} onSave={save} onClose={() => setModal(null)} />
      )}

      {removing && (
        <div className="rt-overlay" onMouseDown={(e) => e.target === e.currentTarget && setRemoving(null)}>
          <div className="rt-modal rt-modal--small" role="alertdialog" aria-modal="true" aria-labelledby="us-remove-title">
            <div className="rt-modal__body rt-modal__body--single">
              <h2 id="us-remove-title">Delete {removing.name}?</h2>
              <p>This account will be removed and the user will no longer be able to sign in.</p>
            </div>
            <div className="rt-modal__foot">
              <button type="button" className="admin-btn" onClick={() => setRemoving(null)}>Cancel</button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={confirmRemove}>Delete user</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
