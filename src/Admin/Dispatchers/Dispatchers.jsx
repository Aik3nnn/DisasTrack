import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../Icon.jsx";
import DispatcherModal from "./DispatcherModal.jsx";
import { STATUSES } from "./dispatchersData.js";
import { useAccounts } from "../useAccounts.js";
import { createAccount, deleteAccount, updateAccount } from "../accountService.js";
import { phoneText, slug } from "../adminHelpers.js";
import { logAction } from "../Audit/auditLog.js";
import "./Dispatchers.css";

const INCIDENTS_PATH = "/admin/incident-reports";

export default function Dispatchers() {
  const { accounts, loading, error } = useAccounts();
  // Only dispatcher accounts. "caseload" is empty until incidents are linked to dispatchers.
  const dispatchers = useMemo(
    () =>
      accounts
        .filter((a) => a.role === "Dispatcher")
        .map((a) => ({ ...a, caseload: a.caseload || [] })),
    [accounts]
  );
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // null | { dispatcher } (null dispatcher = add)
  const [removing, setRemoving] = useState(null);

  const count = (status) => dispatchers.filter((d) => d.duty === status).length;
  const openCases = dispatchers.reduce((sum, d) => sum + d.caseload.length, 0);

  const stats = [
    { label: "Total Dispatchers", value: dispatchers.length, icon: "dispatch", tone: "slate", note: "All accounts" },
    { label: "On Duty", value: count("On duty"), icon: "check", tone: "jet", note: `${count("On break")} on break` },
    { label: "Open Cases", value: openCases, icon: "reports", tone: "brandy", note: "Handled right now" },
    { label: "Off Duty", value: count("Off duty"), icon: "clock", tone: "sun", note: "Not reachable" },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dispatchers.filter(
      (d) =>
        (tab === "all" || d.duty === tab) &&
        (!q || [d.name, d.username, d.email, d.shift].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [dispatchers, tab, query]);

  // Errors thrown here are shown inside the dialog.
  async function save(values) {
    // Do not save the password, id or caseload inside the profile.
    const { password, id, caseload, ...profile } = values; // eslint-disable-line no-unused-vars
    if (modal.dispatcher) {
      await updateAccount(modal.dispatcher.id, profile);
      logAction({ category: "Account", action: "Dispatcher updated", target: profile.name, details: "Dispatcher details edited" });
    } else {
      await createAccount({ ...profile, role: "Dispatcher", status: "Active" }, password);
      logAction({ category: "Account", action: "Dispatcher added", target: profile.name, details: "New dispatcher account created" });
    }
    setModal(null);
  }

  async function setStatus(id, duty) {
    setActionError("");
    try {
      await updateAccount(id, { duty });
      const name = dispatchers.find((d) => d.id === id)?.name || id;
      logAction({ category: "Assignment", action: "Duty status changed", target: name, details: `Set to ${duty}` });
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function confirmRemove() {
    setActionError("");
    try {
      await deleteAccount(removing.id);
      logAction({ category: "Account", action: "Dispatcher deleted", target: removing.name, details: "Dispatcher account removed" });
    } catch (err) {
      setActionError(err.message);
    }
    setRemoving(null);
  }

  return (
    <div className="rt-page">
      {/* summary cards */}
      <section className="admin-stats" aria-label="Dispatcher summary">
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
        <div className="admin-chips" role="group" aria-label="Filter by duty status">
          {["all", ...STATUSES].map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-chip ${tab === key ? "is-active" : ""}`}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {key === "all" ? "All" : key}
              <span className="rt-chipcount">{key === "all" ? dispatchers.length : count(key)}</span>
            </button>
          ))}
        </div>

        <div className="rt-toolbar__right">
          <label className="rt-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search dispatchers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setModal({ dispatcher: null })}>
            <Icon name="plus" size={16} />
            Add dispatcher
          </button>
        </div>
      </div>

      {(error || actionError) && <p className="rt-error">{(error || { message: actionError }).message}</p>}

      {/* table */}
      <section className="admin-card rt-card" aria-label="Dispatchers">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Dispatcher</th>
                <th scope="col">Contact</th>
                <th scope="col">Shift</th>
                <th scope="col">Duty status</th>
                <th scope="col">Current caseload</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="admin-table__strong">{d.name}</span>
                    <span className="rt-sub">{d.id} · @{d.username}</span>
                  </td>
                  <td>
                    {d.email}
                    <span className="rt-sub">{phoneText(d.phone)}</span>
                  </td>
                  <td>{d.shift}</td>
                  <td>
                    <select
                      className={`dp-status dp-status--${slug(d.duty)}`}
                      value={d.duty}
                      onChange={(e) => setStatus(d.id, e.target.value)}
                      aria-label={`Duty status of ${d.name}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {d.caseload.length > 0 ? (
                      <>
                        <div className="dp-cases">
                          {d.caseload.map((id) => (
                            <Link key={id} className="admin-link-btn" to={`${INCIDENTS_PATH}/${id}`}>
                              {id}
                            </Link>
                          ))}
                        </div>
                        <span className="dp-load">
                          {d.caseload.length} open case{d.caseload.length > 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="rt-muted">None</span>
                    )}
                  </td>
                  <td className="admin-table__action">
                    <div className="rt-actions">
                      <button
                        type="button"
                        className="rt-iconbtn"
                        data-tip="Edit dispatcher"
                        aria-label={`Edit ${d.name}`}
                        onClick={() => setModal({ dispatcher: d })}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="rt-iconbtn rt-iconbtn--danger"
                        data-tip={d.caseload.length > 0 ? "Has open cases" : "Delete dispatcher"}
                        aria-label={`Delete ${d.name}`}
                        disabled={d.caseload.length > 0}
                        onClick={() => setRemoving(d)}
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
              <h3>Loading dispatchers…</h3>
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="rt-empty">
              <h3>No dispatchers found</h3>
              <p>Add a dispatcher, or try a different status or search term.</p>
            </div>
          )}
        </div>
      </section>

      {modal && (
        <DispatcherModal dispatcher={modal.dispatcher} existing={dispatchers} onSave={save} onClose={() => setModal(null)} />
      )}

      {removing && (
        <div className="rt-overlay" onMouseDown={(e) => e.target === e.currentTarget && setRemoving(null)}>
          <div className="rt-modal rt-modal--small" role="alertdialog" aria-modal="true" aria-labelledby="dp-remove-title">
            <div className="rt-modal__body rt-modal__body--single">
              <h2 id="dp-remove-title">Delete {removing.name}?</h2>
              <p>This dispatcher account will be removed and can no longer assign rescue teams.</p>
            </div>
            <div className="rt-modal__foot">
              <button type="button" className="admin-btn" onClick={() => setRemoving(null)}>Cancel</button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={confirmRemove}>Delete dispatcher</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
