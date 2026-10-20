import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useIncidents } from "./IncidentReports/IncidentsContext.jsx";
import { ago } from "./IncidentReports/incidentsData.js";
import { useTeams } from "./js/useTeams.js";

/* ------------------------------------------------------------------
   Everything on this screen is calculated from live data:
     - incidents  -> the same list the Incident Reports screens use
                     (so verifying or dispatching there updates this page)
     - rescue teams -> Firebase (/rescueTeams)
------------------------------------------------------------------- */

const LIST_PATH = "/admin/incident-reports";
const OPEN_STATUSES = ["Pending", "Verified", "In Progress"]; // still needs work
const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_FILTERS = ["Pending", "Verified", "In Progress", "Resolved", "Duplicate", "Rejected"];

const MAP_FILTERS = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "pending", label: "Pending" },
];

const slug = (text) => text.toLowerCase().replace(/\s+/g, "-");

function Badge({ label }) {
  return <span className={`admin-badge admin-badge--${slug(label)}`}>{label}</span>;
}

// The map below is a placeholder picture, so pin positions are worked out from the
// id (the same id always lands in the same spot). Swap for real coordinates when
// the map is replaced with Leaflet / OpenStreetMap.
function pinPosition(key) {
  let hash = 0;
  for (const char of String(key)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { x: 8 + (hash % 84), y: 10 + (Math.floor(hash / 84) % 78) };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { incidents } = useIncidents();
  const { teams, loading: teamsLoading } = useTeams();

  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("all");

  const open = useMemo(() => incidents.filter((i) => OPEN_STATUSES.includes(i.status)), [incidents]);
  const pending = incidents.filter((i) => i.status === "Pending").length;
  const resolvedToday = incidents.filter((i) => i.status === "Resolved" && i.minutesAgo < 24 * 60).length;
  const deployed = teams.filter((t) => t.status === "Deployed").length;
  const available = teams.filter((t) => t.status === "Available").length;

  const stats = [
    { label: "Active Incidents", value: open.length, icon: "alert", tone: "brandy" },
    { label: "Pending Verification", value: pending, icon: "clock", tone: "sun" },
    {
      label: "Teams Deployed",
      value: teamsLoading ? "…" : `${deployed} / ${teams.length}`,
      note: teamsLoading ? "" : `${available} available`,
      icon: "users",
      tone: "slate",
    },
    { label: "Resolved Today", value: resolvedToday, icon: "check", tone: "jet" },
  ];

  // Map pins: one per open incident, plus one per deployed team.
  const pins = [
    ...open.map((i) => ({
      key: i.id,
      type: i.priority === "Critical" ? "critical" : i.status === "Pending" ? "pending" : "other",
      ...pinPosition(i.id),
    })),
    ...teams
      .filter((t) => t.status === "Deployed")
      .map((t) => ({ key: t.id, type: "team", ...pinPosition(t.id) })),
  ];
  const visiblePins = pins.filter(
    (pin) => filter === "all" || (pin.type === filter && pin.type !== "other")
  );

  // Priority queue: open incidents, most urgent first, newest first within a priority.
  const queue = useMemo(
    () =>
      [...open]
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.minutesAgo - b.minutesAgo)
        .slice(0, 4),
    [open]
  );

  // Recent reports: the newest five (optionally for one status).
  const recent = useMemo(
    () =>
      incidents
        .filter((i) => status === "all" || i.status === status)
        .sort((a, b) => a.minutesAgo - b.minutesAgo)
        .slice(0, 5),
    [incidents, status]
  );

  return (
    <>
      {/* Stat cards */}
      <section className="admin-stats" aria-label="Summary">
        {stats.map((s) => (
          <article key={s.label} className="admin-card admin-stat">
            <div>
              <p className="admin-stat__label">{s.label}</p>
              <p className="admin-stat__value">{s.value}</p>
              {s.note && <p className="admin-stat__note">{s.note}</p>}
            </div>
            <span className={`admin-stat__chip admin-stat__chip--${s.tone}`}>
              <Icon name={s.icon} size={20} />
            </span>
          </article>
        ))}
      </section>

      {/* Map + priority queue */}
      <div className="admin-grid">
        <section className="admin-card" aria-labelledby="map-title">
          <div className="admin-card__head">
            <div>
              <h2 id="map-title" className="admin-card__title">Incident Map</h2>
              <p className="admin-card__sub">
                Live · {open.length} active incident{open.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="admin-chips" role="group" aria-label="Map filter">
              {MAP_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`admin-chip ${filter === f.key ? "is-active" : ""}`}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Placeholder map. Swap for Leaflet / OpenStreetMap later. */}
          <div className="admin-map" role="img" aria-label="Map of reported incidents">
            <span className="admin-water" style={{ left: "-12%", top: "68%", width: "46%", height: "60%" }} />
            <span className="admin-water" style={{ left: "20%", top: "72%", width: "32%", height: "48%" }} />
            <span className="admin-road admin-road--h" style={{ top: "31%" }} />
            <span className="admin-road admin-road--h admin-road--wide" style={{ top: "68%" }} />
            <span className="admin-road admin-road--v" style={{ left: "27%" }} />
            <span className="admin-road admin-road--v admin-road--wide" style={{ left: "63%" }} />
            <span className="admin-road admin-road--v" style={{ left: "84%" }} />
            <span className="admin-block" style={{ left: "6%", top: "7%", width: "18%", height: "18%" }} />
            <span className="admin-block" style={{ left: "31%", top: "39%", width: "14%", height: "22%" }} />
            <span className="admin-block" style={{ left: "67%", top: "39%", width: "14%", height: "22%" }} />
            {visiblePins.map((pin) => (
              <span
                key={pin.key}
                className={`admin-pin admin-pin--${pin.type}`}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              />
            ))}
          </div>

          <ul className="admin-legend">
            <li><span className="admin-dot admin-dot--critical" />Critical</li>
            <li><span className="admin-dot admin-dot--pending" />Pending</li>
            <li><span className="admin-dot admin-dot--other" />Other open</li>
            <li><span className="admin-dot admin-dot--team" />Rescue team</li>
          </ul>
        </section>

        <section className="admin-card" aria-labelledby="queue-title">
          <div className="admin-card__head">
            <div>
              <h2 id="queue-title" className="admin-card__title">Priority Queue</h2>
              <p className="admin-card__sub">Sorted by urgency and risk</p>
            </div>
            <Link className="admin-link-btn" to={LIST_PATH}>View all</Link>
          </div>

          {queue.length === 0 ? (
            <p className="admin-card__sub">No open incidents right now.</p>
          ) : (
            <ul className="admin-queue">
              {queue.map((item) => (
                <li key={item.id} className={`admin-queue__item admin-queue__item--${slug(item.priority)}`}>
                  <div className="admin-queue__text">
                    <p className="admin-queue__title">{item.type} · {item.location}</p>
                    <p className="admin-queue__meta">{item.reporter} · {ago(item.minutesAgo)}</p>
                  </div>
                  <div className="admin-queue__side">
                    <Badge label={item.priority} />
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm"
                      onClick={() => navigate(`${LIST_PATH}/${item.id}`)}
                    >
                      Assign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent reports */}
      <section className="admin-card" aria-labelledby="recent-title">
        <div className="admin-card__head">
          <h2 id="recent-title" className="admin-card__title">Recent Reports</h2>
          <select
            className="admin-chip"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Report ID</th>
                <th scope="col">Incident</th>
                <th scope="col">Location</th>
                <th scope="col">Reporter</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className="admin-table__id">{r.id}</td>
                  <td className="admin-table__strong">{r.type}</td>
                  <td>{r.location}</td>
                  <td>{r.reporter}</td>
                  <td><Badge label={r.priority} /></td>
                  <td><Badge label={r.status} /></td>
                  <td className="admin-table__action">
                    <Link className="admin-link-btn" to={`${LIST_PATH}/${r.id}`}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {recent.length === 0 && <p className="admin-card__sub" style={{ padding: "16px 14px" }}>No reports with this status.</p>}
        </div>
      </section>
    </>
  );
}
