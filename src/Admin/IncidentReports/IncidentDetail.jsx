import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useIncidents } from "./IncidentsContext.jsx";
import { INCIDENT_TYPES, PRIORITIES, TEAMS, ago } from "./incidentsData.js";
import { Badge, IconAlert, IconBack, IconCheck, IconImage } from "./incidentShared.jsx";

const LIST_PATH = "/admin/incident-reports";

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, update } = useIncidents();

  const [teamId, setTeamId] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const incident = incidents.find((i) => i.id === id);

  if (!incident) {
    return (
      <div className="ir-page">
        <section className="ir-card ir-empty">
          <h3>Report not found</h3>
          <p>We couldn't find a report with the ID {id}.</p>
          <Link className="ir-btn ir-btn--sm" to={LIST_PATH}>Back to Incident Reports</Link>
        </section>
      </div>
    );
  }

  const { status } = incident;
  const isOpen = ["Pending", "Verified", "In Progress"].includes(status);
  const assignedTeam = TEAMS.find((t) => t.id === incident.team);
  const chosenTeam = TEAMS.find((t) => t.id === teamId);
  const log = [...incident.activity].sort((a, b) => b.minutesAgo - a.minutesAgo);

  const verify = () => update(id, { status: "Verified" }, "Report verified by Admin");
  const confirmReject = () => {
    update(id, { status: "Rejected" }, `Report rejected: ${reason.trim() || "no reason given"}`);
    setRejecting(false);
    setReason("");
  };
  const changePriority = (p) => {
    if (p !== incident.priority) update(id, { priority: p }, `Priority changed from ${incident.priority} to ${p}`);
  };
  const changeType = (event) =>
    update(id, { type: event.target.value }, `Classification changed to ${event.target.value}`);
  const dispatch = () => {
    update(id, { status: "In Progress", team: chosenTeam.id }, `${chosenTeam.name} dispatched`);
    setTeamId(null);
  };
  const resolve = () => update(id, { status: "Resolved" }, "Marked as resolved");
  const reopen = () => update(id, { status: "Pending", team: null }, "Report reopened");
  const markDuplicate = () =>
    update(id, { status: "Duplicate" }, `Marked as duplicate of ${incident.duplicateOf}`);
  const notDuplicate = () =>
    update(id, { duplicateOf: null, match: null }, "Duplicate flag dismissed");

  return (
    <div className="ir-page">
      {/* header */}
      <nav className="ir-crumbs" aria-label="Breadcrumb">
        <Link to={LIST_PATH}>Incident Reports</Link>
        <span aria-hidden="true">›</span>
        <span>{incident.id}</span>
      </nav>

      <div className="ir-detail-head">
        <div className="ir-detail-title">
          <h2>{incident.id} · {incident.type}</h2>
          <Badge label={incident.priority} />
          <Badge label={status} />
        </div>
        <button type="button" className="ir-btn" onClick={() => navigate(LIST_PATH)}>
          <IconBack /> Back to list
        </button>
      </div>

      <div className="ir-detail-grid">
        {/* left column */}
        <div className="ir-stack">
          <section className="ir-card">
            <div className="ir-card__head"><h3 className="ir-card__title">Report overview</h3></div>
            <div className="ir-card__body">
              <dl className="ir-fields">
                <div className="ir-field"><dt>Reporter</dt><dd>{incident.reporter}</dd></div>
                <div className="ir-field"><dt>Contact</dt><dd>{incident.phone}</dd></div>
                <div className="ir-field"><dt>Reported</dt><dd>{ago(incident.minutesAgo)}</dd></div>
                <div className="ir-field"><dt>Incident type</dt><dd>{incident.type}</dd></div>
                <div className="ir-field"><dt>Location</dt><dd>{incident.location}</dd></div>
                <div className="ir-field"><dt>GPS coordinates</dt><dd>{incident.coords}</dd></div>
              </dl>
              <h4 className="ir-subtitle">Description</h4>
              <p className="ir-desc">{incident.description}</p>
            </div>
          </section>

          <section className="ir-card">
            <div className="ir-card__head">
              <h3 className="ir-card__title">Attached photos ({incident.photos})</h3>
            </div>
            <div className="ir-card__body">
              {incident.photos > 0 ? (
                <div className="ir-photos">
                  {Array.from({ length: incident.photos }, (_, i) => (
                    <div key={i} className="ir-photo" role="img" aria-label={`Photo ${i + 1} (placeholder)`}>
                      <IconImage />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ir-muted">The reporter did not attach any photos.</p>
              )}
            </div>
          </section>

          <section className="ir-card">
            <div className="ir-card__head">
              <h3 className="ir-card__title">Location</h3>
              <span className="ir-muted">GPS {incident.coords}</span>
            </div>
            <div className="ir-card__body">
              {/* Placeholder map. Swap for Leaflet / OpenStreetMap later. */}
              <div className="ir-map" role="img" aria-label={`Map showing ${incident.location}`}>
                <span className="ir-map__road ir-map__road--h" style={{ top: "34%" }} />
                <span className="ir-map__road ir-map__road--h" style={{ top: "72%" }} />
                <span className="ir-map__road ir-map__road--v" style={{ left: "28%" }} />
                <span className="ir-map__road ir-map__road--v" style={{ left: "66%" }} />
                <span className="ir-map__block" style={{ left: "34%", top: "40%", width: "14%", height: "24%" }} />
                <span className="ir-map__block" style={{ left: "72%", top: "40%", width: "14%", height: "24%" }} />
                <span className="ir-map__block" style={{ left: "6%", top: "8%", width: "16%", height: "20%" }} />
                <span className="ir-map__pin" />
                <span className="ir-map__label">{incident.location}</span>
              </div>
            </div>
          </section>
        </div>

        {/* right column */}
        <div className="ir-stack">
          <section className="ir-card">
            <div className="ir-card__head"><h3 className="ir-card__title">Actions</h3></div>

            {/* verification */}
            <div className="ir-section">
              <h4 className="ir-section__title">Verification</h4>

              {status === "Pending" && !rejecting && (
                <div className="ir-actions-row">
                  <button type="button" className="ir-btn ir-btn--primary" onClick={verify}>
                    <IconCheck /> Verify report
                  </button>
                  <button type="button" className="ir-btn" onClick={() => setRejecting(true)}>
                    Reject
                  </button>
                </div>
              )}

              {status === "Pending" && rejecting && (
                <div>
                  <label className="ir-label" htmlFor="reject-reason">Reason for rejecting</label>
                  <textarea
                    id="reject-reason"
                    className="ir-input ir-textarea"
                    placeholder="For example: no valid location, prank report…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="ir-actions-row">
                    <button type="button" className="ir-btn ir-btn--primary" onClick={confirmReject}>
                      Confirm reject
                    </button>
                    <button type="button" className="ir-btn" onClick={() => setRejecting(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {(status === "Verified" || status === "In Progress") && (
                <p className="ir-note ir-note--ok"><IconCheck /> This report has been verified.</p>
              )}

              {!isOpen && (
                <>
                  <p className="ir-note">
                    This report is <strong>{status.toLowerCase()}</strong> and can no longer be edited.
                  </p>
                  <button type="button" className="ir-btn ir-btn--block" onClick={reopen}>
                    Reopen report
                  </button>
                </>
              )}
            </div>

            {/* priority + classification */}
            <div className="ir-section">
              <h4 className="ir-section__title">Priority</h4>
              <div className="ir-chiprow" role="group" aria-label="Priority">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`ir-chip ${incident.priority === p ? "is-active" : ""}`}
                    aria-pressed={incident.priority === p}
                    disabled={!isOpen}
                    onClick={() => changePriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <label className="ir-label ir-label--spaced" htmlFor="classification">Classification</label>
              <select
                id="classification"
                className="ir-input ir-input--select"
                value={incident.type}
                disabled={!isOpen}
                onChange={changeType}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* team assignment */}
            <div className="ir-section">
              <h4 className="ir-section__title">Rescue team</h4>

              {status === "In Progress" && assignedTeam && (
                <>
                  <div className="ir-assigned">
                    <strong>{assignedTeam.name}</strong>
                    <span>{assignedTeam.specialty} · on the way</span>
                  </div>
                  <button type="button" className="ir-btn ir-btn--dark ir-btn--block" onClick={resolve}>
                    Mark as resolved
                  </button>
                </>
              )}

              {status === "Resolved" && assignedTeam && (
                <div className="ir-assigned">
                  <strong>{assignedTeam.name}</strong>
                  <span>Completed this response</span>
                </div>
              )}

              {(status === "Pending" || status === "Verified") && (
                <>
                  {TEAMS.map((t) => {
                    const free = t.status !== "Deployed";
                    const picked = teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`ir-team ${picked ? "is-selected" : ""}`}
                        disabled={!free || status === "Pending"}
                        aria-pressed={picked}
                        onClick={() => setTeamId(t.id)}
                      >
                        <span className="ir-team__radio" aria-hidden="true" />
                        <span>
                          <span className="ir-team__name">{t.name}</span>
                          <span className="ir-team__meta">{t.distance} · {t.status}</span>
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="ir-btn ir-btn--primary ir-btn--block"
                    disabled={status !== "Verified" || !chosenTeam}
                    onClick={dispatch}
                  >
                    Dispatch team
                  </button>
                  {status === "Pending" && (
                    <p className="ir-hint-text">Verify the report first to dispatch a team.</p>
                  )}
                </>
              )}

              {(status === "Duplicate" || status === "Rejected") && (
                <p className="ir-muted">No team assigned.</p>
              )}
            </div>
          </section>

          {incident.duplicateOf && status === "Pending" && (
            <section className="ir-dup" aria-label="Possible duplicate">
              <div className="ir-dup__title"><IconAlert /> Possible duplicate detected</div>
              <p>
                {incident.match}% match with {incident.duplicateOf}. Same area and reported close together.
              </p>
              <div className="ir-actions-row">
                <Link className="ir-btn ir-btn--sm" to={`${LIST_PATH}/${incident.duplicateOf}`}>
                  Compare reports
                </Link>
                <button type="button" className="ir-btn ir-btn--sm ir-btn--primary" onClick={markDuplicate}>
                  Mark as duplicate
                </button>
                <button type="button" className="ir-btn ir-btn--sm" onClick={notDuplicate}>
                  Not a duplicate
                </button>
              </div>
            </section>
          )}

          <section className="ir-card">
            <div className="ir-card__head"><h3 className="ir-card__title">Activity log</h3></div>
            <div className="ir-card__body">
              <ol className="ir-log">
                {log.map((entry, i) => (
                  <li key={i}>
                    <span className="ir-log__text">{entry.text}</span>
                    <span className="ir-log__time">{ago(entry.minutesAgo)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
