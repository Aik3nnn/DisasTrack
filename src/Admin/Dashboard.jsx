import { useState } from "react";
import Icon from "./Icon.jsx";

/* ------------------------------------------------------------------
   Sample data. Replace each of these with a call to your API
   (for example inside useEffect + fetch) when the backend is ready.
------------------------------------------------------------------- */
const STATS = [
  { label: "Active Incidents", value: "48", icon: "alert", tone: "brandy" },
  { label: "Pending Verification", value: "17", icon: "clock", tone: "sun" },
  { label: "Teams Deployed", value: "12 / 15", icon: "users", tone: "slate" },
  { label: "Resolved Today", value: "31", icon: "check", tone: "jet" },
];

// x / y are percentages of the map area
const PINS = [
  { x: 18, y: 19, type: "critical" },
  { x: 45, y: 45, type: "critical" },
  { x: 70, y: 22, type: "critical" },
  { x: 36, y: 73, type: "pending" },
  { x: 78, y: 71, type: "pending" },
  { x: 12, y: 54, type: "pending" },
  { x: 52, y: 77, type: "team" },
  { x: 90, y: 36, type: "team" },
];

const MAP_FILTERS = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "pending", label: "Pending" },
];

const QUEUE = [
  { id: "DT-1042", title: "Flash flood · Brgy. San Roque", meta: "J. Santos · 4 min ago", priority: "Critical" },
  { id: "DT-1041", title: "Residential fire · Tandang Sora", meta: "M. Reyes · 11 min ago", priority: "Critical" },
  { id: "DT-1040", title: "Landslide · Rodriguez, Rizal", meta: "C. Mendoza · 26 min ago", priority: "High" },
  { id: "DT-1044", title: "Road collapse · Marikina", meta: "A. Cruz · 41 min ago", priority: "Medium" },
];

const REPORTS = [
  { id: "DT-1042", incident: "Flash flood", location: "Brgy. San Roque, Marikina", reporter: "Juan Santos", priority: "Critical", status: "Pending" },
  { id: "DT-1041", incident: "Residential fire", location: "Tandang Sora, Quezon City", reporter: "Maria Reyes", priority: "Critical", status: "In Progress" },
  { id: "DT-1040", incident: "Landslide", location: "Rodriguez, Rizal", reporter: "Carlo Mendoza", priority: "High", status: "Verified" },
  { id: "DT-1039", incident: "Fallen trees", location: "Commonwealth Ave, QC", reporter: "Ana Cruz", priority: "Medium", status: "Resolved" },
  { id: "DT-1038", incident: "Flooded road", location: "Katipunan Ave, QC", reporter: "Leo Garcia", priority: "Low", status: "Duplicate" },
];

const slug = (text) => text.toLowerCase().replace(/\s+/g, "-");

function Badge({ label }) {
  return <span className={`admin-badge admin-badge--${slug(label)}`}>{label}</span>;
}

/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [filter, setFilter] = useState("all");

  const visiblePins = PINS.filter(
    (pin) => filter === "all" || pin.type === filter
  );

  return (
    <>
      {/* Stat cards */}
      <section className="admin-stats" aria-label="Summary">
        {STATS.map((s) => (
          <article key={s.label} className="admin-card admin-stat">
            <div>
              <p className="admin-stat__label">{s.label}</p>
              <p className="admin-stat__value">{s.value}</p>
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
              <p className="admin-card__sub">Live · 48 active incidents</p>
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
            {visiblePins.map((pin, i) => (
              <span
                key={i}
                className={`admin-pin admin-pin--${pin.type}`}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              />
            ))}
          </div>

          <ul className="admin-legend">
            <li><span className="admin-dot admin-dot--critical" />Critical</li>
            <li><span className="admin-dot admin-dot--pending" />Pending</li>
            <li><span className="admin-dot admin-dot--team" />Rescue team</li>
          </ul>
        </section>

        <section className="admin-card" aria-labelledby="queue-title">
          <div className="admin-card__head">
            <div>
              <h2 id="queue-title" className="admin-card__title">Priority Queue</h2>
              <p className="admin-card__sub">Sorted by urgency and risk</p>
            </div>
            <button type="button" className="admin-link-btn">View all</button>
          </div>

          <ul className="admin-queue">
            {QUEUE.map((item) => (
              <li key={item.id} className={`admin-queue__item admin-queue__item--${slug(item.priority)}`}>
                <div className="admin-queue__text">
                  <p className="admin-queue__title">{item.title}</p>
                  <p className="admin-queue__meta">{item.meta}</p>
                </div>
                <div className="admin-queue__side">
                  <Badge label={item.priority} />
                  <button type="button" className="admin-btn admin-btn--sm">Assign</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent reports */}
      <section className="admin-card" aria-labelledby="recent-title">
        <div className="admin-card__head">
          <h2 id="recent-title" className="admin-card__title">Recent Reports</h2>
          <button type="button" className="admin-chip">All statuses ▾</button>
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
              {REPORTS.map((r) => (
                <tr key={r.id}>
                  <td className="admin-table__id">{r.id}</td>
                  <td className="admin-table__strong">{r.incident}</td>
                  <td>{r.location}</td>
                  <td>{r.reporter}</td>
                  <td><Badge label={r.priority} /></td>
                  <td><Badge label={r.status} /></td>
                  <td className="admin-table__action">
                    <button type="button" className="admin-link-btn">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
